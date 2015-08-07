# -*- coding: utf-8 -*-
from Products.CMFCore.utils import getToolByName
from zope.publisher.browser import BrowserView
try:
    import json
except:
    import simplejson as json

from plone import api
from plone.protect.authenticator import createToken
from plone.app.mosaic.layoutsupport import AvailableContentLayoutsVocabularyFactory

from plone.app.mosaic import _PMF as _


class MosaicUploadView(BrowserView):
    """Handle file uploads"""

    def __call__(self):
        context = self.context
        request = self.request

        # Set header to json
        request.response.setHeader('Content-Type', 'application/json')

        ctr_tool = api.portal.get_tool('content_type_registry')
        id = request['uploadfile'].filename

        content_type = request['uploadfile'].headers["Content-Type"]
        typename = ctr_tool.findTypeName(id, content_type, "")

        # 1) check if we are allowed to create an Image in folder
        if typename not in [t.id for t in context.getAllowedTypes()]:
            error = {}
            error['status'] = 1
            error['message'] =\
                _(u"Not allowed to upload a file of this type to this folder")
            return json.dumps(error)

        # 2) check if the current user has permissions to add stuff
        if not context.portal_membership.checkPermission('Add portal content',
                                                         context):
            error = {}
            error['status'] = 1
            error['message'] =\
                _(u"You do not have permission to upload files in this folder")
            return json.dumps(error)

        # Get an unused filename without path
        id = self.cleanupFilename(id)

        title = request['uploadfile'].filename

        newid = context.invokeFactory(type_name=typename, id=id)

        if newid is None or newid == '':
            newid = id

        obj = getattr(context, newid, None)

        # Set title
        # Attempt to use Archetypes mutator if there is one,
        # in case it uses a custom storage
        if title:
            try:
                obj.setTitle(title)
            except AttributeError:
                obj.title = title

        # set primary field
        pf = obj.getPrimaryField()
        pf.set(obj, request['uploadfile'])

        if not obj:
            error = {}
            error['status'] = 1
            error['message'] = _(u"Could not upload the file")
            return json.dumps(error)

        obj.reindexObject()
        message = {}
        message['status'] = 0
        message['url'] = obj.absolute_url()
        message['title'] = title
        return json.dumps(message)

    def cleanupFilename(self, name):
        """Generate a unique id which doesn't match the system generated ids"""

        context = self.context
        id = ''
        name = name.replace('\\', '/')  # Fixup Windows filenames
        name = name.split('/')[-1]  # Throw away any path part.
        for c in name:
            if c.isalnum() or c in '._':
                id += c

        # Raise condition here, but not a lot we can do about that
        if context.check_id(id) is None and getattr(context, id, None) is None:
            return id

        # Now make the id unique
        count = 1
        while 1:
            if count == 1:
                sc = ''
            else:
                sc = str(count)
            newid = "copy%s_of_%s" % (sc, id)
            if context.check_id(newid) is None \
                    and getattr(context, newid, None) is None:
                return newid
            count += 1


class LayoutsEditor(BrowserView):

    def __call__(self):
        if self.request.get('assign-data') == 'yes':
            return json.dumps(self.get_assign_config())
        elif self.request.get('assign-save') == 'yes':
            self.save_assignments()
        from Products.CMFPlone.resources import add_bundle_on_request
        add_bundle_on_request(self.request, 'layouts-editor')
        return super(LayoutsEditor, self).__call__()

    def get_layout_id(self, layout):
        return '++layout++' + layout.replace(
            '++contentlayout++', '').replace('/', '-').replace('.html', '')

    def save_assignments(self):
        portal_types = getToolByName(self.context, 'portal_types')
        for key, selected_layouts in self.request.form.items():
            if isinstance(selected_layouts, basestring):
                selected_layouts = [selected_layouts]

            try:
                fti = portal_types[key]
            except (KeyError, AttributeError):
                continue

            aliases = fti.getMethodAliases() or {}
            aliases_inverse = {v: k for k, v in aliases.items()}
            view_methods = [i for i in fti.getAvailableViewMethods(self.context)]

            for layout in selected_layouts:
                # make sure all selected views on in
                # ++contentlayout++default/document.html
                if layout in aliases_inverse:
                    _id = aliases_inverse[layout]
                else:
                    _id = self.get_layout_id(layout)
                aliases[_id] = layout
                if _id not in view_methods:
                    view_methods.append(_id)

            for _id, layout in aliases.items():
                # remove unselected layouts
                if '++layout++' not in _id:
                    continue
                if layout not in selected_layouts:
                    del aliases[_id]
                    if _id in view_methods:
                        view_methods.remove(_id)

            for method in view_methods[:]:
                # finally, cleanup any potential remaining defined
                # layout views
                if '++layout++' not in method:
                    continue
                if method not in aliases:
                    view_methods.remove(method)

            fti.setMethodAliases(aliases)
            fti.view_methods = list(set(view_methods))

    def get_assign_config(self):
        available = []
        for layout in AvailableContentLayoutsVocabularyFactory(self.context):
            available.append({
                'title': layout.title,
                'value': layout.value.lstrip('/')
            })

        portal_types = getToolByName(self.context, 'portal_types')
        types = []
        for pt_id in portal_types.objectIds():
            fti = portal_types[pt_id]
            try:
                if 'plone.app.blocks.layoutbehavior.ILayoutAware' in fti.behaviors:
                    aliases = fti.getMethodAliases() or {}
                    view_methods = []
                    for method in fti.getAvailableViewMethods(self.context):
                        if '++layout++' in method and method in aliases:
                            view_methods.append(aliases[method].lstrip('/'))
                    types.append({
                        'id': pt_id,
                        'title': fti.Title(),
                        'layouts': view_methods})
            except AttributeError:
                pass

        return {
            'available': available,
            'types': types
        }

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