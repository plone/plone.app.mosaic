# -*- coding: utf-8 -*-
from zope.publisher.browser import BrowserView
try:
    import json
except:
    import simplejson as json

from plone.protect.authenticator import createToken


class LayoutsEditor(BrowserView):

    def __call__(self):
        from Products.CMFPlone.resources import add_bundle_on_request
        add_bundle_on_request(self.request, 'layouts-editor')
        return super(LayoutsEditor, self).__call__()

    def get_layout_id(self, layout):
        return '++layout++' + layout.replace(
            '++contentlayout++', '').replace('/', '-').replace('.html', '')

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
