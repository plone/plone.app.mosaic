# -*- coding: utf-8 -*-
from ConfigParser import SafeConfigParser
from plone import api
from plone.app.blocks.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
from plone.app.blocks.interfaces import CONTENT_LAYOUT_RESOURCE_NAME
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.resource import getLayoutsFromResources
from plone.app.blocks.resource import multidict
from plone.app.mosaic.utils import getContentLayoutsForType
from plone.app.mosaic.utils import getUserContentLayoutsForType
from plone.i18n.normalizer.interfaces import IIDNormalizer
from plone.protect.authenticator import createToken
from plone.registry.interfaces import IRegistry
from plone.resource.manifest import MANIFEST_FILENAME
from plone.resource.utils import queryResourceDirectory
from zExceptions import NotFound
from zope.component import getUtility
from zope.publisher.browser import BrowserView

import io
import json


def loadManifest(data):
    parser = SafeConfigParser(None, multidict)
    parser.readfp(io.BytesIO(data))
    return parser


def dumpManifest(parser):
    txt = ''
    for section in parser.sections():
        opts = '\n'.join([k + ' = ' + v for k, v in parser.items(section)])
        txt += '[contentlayout]\n{opts}\n\n'.format(opts=opts)
    return txt


def removeLayout(parser, filename):
    for section in parser.sections():
        if parser.has_option(section, 'file'):
            if parser.get(section, 'file') == filename:
                parser.remove_section(section)


class ManageLayoutView(BrowserView):
    """
    Handle saving layouts from mosaic layout editor from users
    """
    def __call__(self):
        self.request.response.setHeader('Content-type', 'application/json')
        if self.request.form.get('action') == 'save':
            return self.save()
        elif self.request.form.get('action') == 'existing':
            return self.existing()
        elif self.request.form.get('action') == 'deletelayout':
            return self.deletelayout()

    def _get_layout_path(self, val):
        if '++contentlayout++' not in val:
            val = '++contentlayout++' + val
        return val

    def deletelayout(self):
        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, 'custom')

        # find directory
        layout_path = self.request.form.get('layout')
        filename = layout_path.split('/')[-1]
        directory = layout_resources
        for part in layout_path.replace('custom/', '').split('/')[:-1]:
            directory = directory[part]
        del directory[filename]

        # now to modify manifest to not include
        if MANIFEST_FILENAME in directory.listDirectory():
            manifest = loadManifest(directory.readFile(MANIFEST_FILENAME))
            removeLayout(manifest, filename)
            directory.writeFile(MANIFEST_FILENAME, dumpManifest(manifest))

        # now reassign if provided
        replacement = self.request.form.get('replacement')
        if replacement:
            replacement = self._get_layout_path(replacement)
            catalog = api.portal.get_tool('portal_catalog')
            for brain in catalog(layout=self._get_layout_path(layout_path)):
                obj = brain.getObject()
                layout_data = ILayoutAware(obj, None)
                if layout_data:
                    layout_data.contentLayout = replacement
                    obj.reindexObject(idxs=['layout'])

        return json.dumps(
            {
                'success': True,
                'user_layouts': getUserContentLayoutsForType(
                    self.context.portal_type
                ),
                'available_layouts': getContentLayoutsForType(
                    self.context.portal_type
                )
            }
        )

    def existing(self):
        """ find existing content assigned to this layout"""
        catalog = api.portal.get_tool('portal_catalog')
        results = []
        layout_path = self._get_layout_path(
            self.request.form.get('layout', '')
        )
        for brain in catalog(layout=layout_path):
            results.append({
                'title': brain.Title,
                'url': brain.getURL()
            })
        return json.dumps({
            'total': len(results),
            'data': results
        })

    def save(self):
        form = self.request.form

        if not form['name']:
            raise Exception("You must provide a layout name")

        layout_dir_name = 'custom'
        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, layout_dir_name)

        if form.get('global', '').lower() not in ('y', 't', 'true', '1'):
            # get/create layout directory for user
            user_id = api.user.get_current().getId()
            try:
                users_directory = layout_resources['user-layouts']
            except NotFound:
                layout_resources.makeDirectory('user-layouts')
                users_directory = layout_resources['user-layouts']
            try:
                user_directory = users_directory[user_id]
            except NotFound:
                users_directory.makeDirectory(user_id)
                user_directory = users_directory[user_id]
            layout_dir_name = 'custom/user-layouts/' + user_id
            layout_resources = user_directory

        normalizer = getUtility(IIDNormalizer)
        layout_filename = normalizer.normalize(form['name']) + '.html'
        count = 0
        while layout_filename in layout_resources.listDirectory():
            count += 1
            layout_filename = normalizer.normalize(
                form['name'] + '-' + str(count)
            ) + '.html'

        layout_resources.writeFile(layout_filename, form['layout'])

        # need to read manifest and add to it dynamically here for the new
        # layout
        if MANIFEST_FILENAME in layout_resources.listDirectory():
            manifest = loadManifest(
                layout_resources.readFile(MANIFEST_FILENAME)
            )
        else:
            manifest = loadManifest('')

        sections = manifest.sections()
        manifest.add_section('new')
        # section name is a bit indeterminate when the multidict implementation
        section_name = list(set(manifest.sections()) - set(sections))[0]
        manifest.set(section_name, 'title', form['name'])
        manifest.set(section_name, 'file', layout_filename)
        manifest.set(section_name, 'for', self.context.portal_type)

        layout_resources.writeFile(MANIFEST_FILENAME, dumpManifest(manifest))

        return json.dumps(
            {
                'success': True,
                'layout': '++contentlayout++{0}/{1}'.format(
                    layout_dir_name,
                    layout_filename
                ),
                'user_layouts': getUserContentLayoutsForType(
                    self.context.portal_type
                ),
                'available_layouts': getContentLayoutsForType(
                    self.context.portal_type
                )
            }
        )


class LayoutsEditor(BrowserView):

    def __call__(self):
        if self.request.form.get('list-contentlayouts'):
            return self.list_contentlayouts()
        action = self.request.form.get('action')
        if action:
            if action == 'show':
                return self.show()
            elif action == 'hide':
                return self.hide()
        from Products.CMFPlone.resources import add_bundle_on_request
        add_bundle_on_request(self.request, 'layouts-editor')
        return super(LayoutsEditor, self).__call__()

    def show(self):
        registry = getUtility(IRegistry)
        hidden = registry['plone.app.mosaic.hidden_content_layouts']
        key = self.request.form.get('layout')
        if key and key in hidden:
            hidden.remove(key)
            registry['plone.app.mosaic.hidden_content_layouts'] = hidden

    def hide(self):
        registry = getUtility(IRegistry)
        hidden = registry['plone.app.mosaic.hidden_content_layouts']
        key = self.request.form.get('layout')
        if key and key not in hidden:
            hidden.append(unicode(key))
            registry['plone.app.mosaic.hidden_content_layouts'] = hidden

    def get_layout_id(self, layout):
        return '++layout++' + layout.replace(
            '++contentlayout++', '').replace('/', '-').replace('.html', '')

    def list_contentlayouts(self):
        result = []
        registry = getUtility(IRegistry)
        hidden = registry['plone.app.mosaic.hidden_content_layouts']
        layouts = getLayoutsFromResources(CONTENT_LAYOUT_MANIFEST_FORMAT)
        for key, value in layouts.items():
            _for = value.get('for', '')
            result.append({
                'key': key,
                '_for': _for,
                'title': value.get('title', ''),
                'hidden': key in hidden
            })
        result.sort(key=lambda l: l.get('key', ''))
        return json.dumps(result)

    @property
    def content_config(self):
        return json.dumps({
            'actionUrl': (
                '{0}/++contentlayout++/custom/'
                '@@plone.resourceeditor.filemanager-actions'.format(
                    self.context.absolute_url()
                )
            ),
            'uploadUrl': (
                '{0}/portal_resources/contentlayout/custom/'
                'themeFileUpload?_authenticator={1}'.format(
                    self.context.absolute_url(),
                    createToken()
                )
            ),
        })

    @property
    def site_config(self):
        return json.dumps({
            'actionUrl': (
                '{0}/++sitelayout++/custom/'
                '@@plone.resourceeditor.filemanager-actions'.format(
                    self.context.absolute_url()
                )
            ),
            'uploadUrl': (
                '{0}/portal_resources/sitelayout/custom/'
                'themeFileUpload?_authenticator={1}'.format(
                    self.context.absolute_url(),
                    createToken()
                )
            ),
        })
