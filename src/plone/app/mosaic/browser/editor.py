# -*- coding: utf-8 -*-
from zope.component import getUtility
from plone.registry.interfaces import IRegistry
from plone.app.blocks.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
from plone.app.blocks.resource import getLayoutsFromResources
from zope.publisher.browser import BrowserView
try:
    import json
except:
    import simplejson as json

from plone.protect.authenticator import createToken


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
        for key, value in getLayoutsFromResources(CONTENT_LAYOUT_MANIFEST_FORMAT).items():
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
            "actionUrl": "%s/++contentlayout++/custom/@@plone.resourceeditor.filemanager-actions" % (  # noqa
                self.context.absolute_url()),
            "uploadUrl": "%s/portal_resources/contentlayout/custom/themeFileUpload?_authenticator=%s" % (  # noqa
                self.context.absolute_url(),
                createToken())
        })

    @property
    def site_config(self):
        return json.dumps({
            "actionUrl": "%s/++sitelayout++/custom/@@plone.resourceeditor.filemanager-actions" % (  # noqa
                self.context.absolute_url()),
            "uploadUrl": "%s/portal_resources/sitelayout/custom/themeFileUpload?_authenticator=%s" % (  # noqa
                self.context.absolute_url(),
                createToken())
        })