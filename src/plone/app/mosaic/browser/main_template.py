from lxml import etree
from repoze.xmliter.utils import getHTMLSerializer
from zope.interface import implements
from Products.Five import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.memoize import view
from zope.pagetemplate.pagetemplate import PageTemplate

from plone.app.mosaic.browser.interfaces import IMainTemplate
from plone.app.blocks.utils import resolveResource
from plone.app.blocks.utils import getDefaultSiteLayout, panelXPath


def main_templatize(layout):
    result = getHTMLSerializer(layout, encoding='utf-8')
    nsmap = {'metal': 'http://namespaces.zope.org/metal'}

    # wrap all panels with a metal:fill-slot -tag
    for layoutPanelNode in panelXPath(result.tree):
        panelId = layoutPanelNode.attrib['data-panel']
        slot = etree.Element('{%s}%s' % (nsmap['metal'], panelId), nsmap=nsmap)
        slot.attrib['define-slot'] = panelId
        slot_parent = layoutPanelNode.getparent()
        slot_parent_index = slot_parent.index(layoutPanelNode)
        slot.append(layoutPanelNode)
        slot_parent.insert(slot_parent_index, slot)

    template = '<metal:page define-macro="master">\n%s\n</metal:page>'
    metal = 'xmlns:metal="http://namespaces.zope.org/metal"'
    return (template % ''.join(result)).replace(metal, '')


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
            pt.write(main_templatize(layout))
            return pt

    @property
    def macros(self):
        macros = self.main_template.macros.copy()
        macros.update(self.template.macros.copy())
        return macros
