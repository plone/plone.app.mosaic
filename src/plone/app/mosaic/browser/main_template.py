from zope.interface import implements

from Products.Five import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.memoize import view

from plone.app.mosaic.browser.interfaces import IMainTemplate
from plone.app.blocks.utils import getLayoutAwareSiteLayout, resolveResource

from plone.app.blocks.utils import getDefaultSiteLayout
from plone.app.blocks.resource import DefaultSiteLayout
from zope.pagetemplate.pagetemplate import PageTemplate


class MainTemplate(BrowserView):
    implements(IMainTemplate)

    ajax_template = ViewPageTemplateFile('templates/ajax_main_template.pt')
    main_template = ViewPageTemplateFile('templates/main_template.pt')

    def __call__(self):
        return self.template()

    @property
    @view.memoize
    def template(self):
        if self.request.form.get('ajax_load'):
            return self.ajax_template
        else:
            layout_resource_path = getDefaultSiteLayout(self.context)
            layout = resolveResource(layout_resource_path)
            pt = PageTemplate()
            pt.write(layout)
            return pt

    @property
    def macros(self):
        return self.template.macros
