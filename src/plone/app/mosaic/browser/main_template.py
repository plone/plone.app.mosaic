# -*- coding: utf-8 -*-
from lxml import etree
from hashlib import md5
from plone.memoize.ram import cache
from repoze.xmliter.utils import getHTMLSerializer
from zExceptions import NotFound
from zope.interface import implements
from Products.Five import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.memoize import view
from zope.pagetemplate.pagetemplate import PageTemplate

from plone.app.mosaic.browser.interfaces import IMainTemplate
from plone.app.blocks.utils import resolveResource
from plone.app.blocks.utils import getDefaultSiteLayout
from plone.app.blocks.utils import getDefaultAjaxLayout
from plone.app.blocks.utils import panelXPath

import logging
logger = logging.getLogger('plone.app.mosaic')


@cache(lambda func, layout: md5(layout).hexdigest())
def cook_layout(layout):
    """Return main_template compatible layout"""
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

    root = result.tree.getroot()
    root.attrib['tal:define'] = """\
portal_state python:context.restrictedTraverse('@@plone_portal_state');
context_state python:context.restrictedTraverse('@@plone_context_state');
plone_view python:context.restrictedTraverse('@@plone');
lang portal_state/language;
view nocall:view | nocall: plone_view;
dummy python: plone_view.mark_view(view);
portal_url portal_state/portal_url;
checkPermission nocall: context/portal_membership/checkPermission;
site_properties nocall:context/portal_properties/site_properties;
ajax_load request/ajax_load | nothing;
ajax_include_head request/ajax_include_head | nothing;
dummy python:request.RESPONSE.setHeader('X-UA-Compatible', 'IE=edge,chrome=1');
dummy python:options.update({'state': options.get('state', request.get('controller_state'))});
"""

    template = '<metal:page define-macro="master">\n%s\n</metal:page>'
    metal = 'xmlns:metal="http://namespaces.zope.org/metal"'
    return (template % ''.join(result)).replace(metal, '')


class MainTemplate(BrowserView):
    implements(IMainTemplate)

    main_template = ViewPageTemplateFile('templates/main_template.pt')

    def __call__(self):
        return self.template()

    @property
    @view.memoize
    def template(self):
        if self.request.form.get('ajax_load'):
            layout_resource_path = getDefaultAjaxLayout(self.context)
        else:
            layout_resource_path = getDefaultSiteLayout(self.context)

        if layout_resource_path is None:
            return self.main_template
        try:
            layout = resolveResource(layout_resource_path)
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))

        cooked = cook_layout(layout)
        pt = PageTemplate()
        pt.write(cooked)
        return pt

    @property
    @view.memoize
    def macros(self):
        macros = self.main_template.macros.copy()
        macros.update(self.template.macros.copy())
        return macros
