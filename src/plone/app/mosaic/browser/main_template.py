# -*- coding: utf-8 -*-
from hashlib import md5
import logging

from lxml import etree

from plone.memoize import ram
from plone.memoize import view
from plone.memoize import volatile
from repoze.xmliter.utils import getHTMLSerializer
from zExceptions import NotFound
from zope.component import getMultiAdapter
from zope.interface import implements
from zope.interface import alsoProvides
from Products.Five import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.app.blocks.interfaces import IBlocksTransformEnabled

from plone.app.blocks.resource import cacheKey
from plone.app.mosaic.browser.interfaces import IMainTemplate
from plone.app.blocks.utils import panelXPath


logger = logging.getLogger('plone.app.mosaic')


def cook_layout_cachekey(func, layout, ajax):
    if isinstance(layout, unicode):
        layout = layout.encode('utf-8', 'replace')
    return md5(layout).hexdigest(), ajax


@ram.cache(cook_layout_cachekey)
def cook_layout(layout, ajax):
    """Return main_template compatible layout"""
    result = getHTMLSerializer(layout, encoding='utf-8')
    nsmap = {'metal': 'http://namespaces.zope.org/metal'}

    # Wrap all panels with a metal:fill-slot -tag:
    for layoutPanelNode in panelXPath(result.tree):
        panelId = layoutPanelNode.attrib['data-panel']
        slot = etree.Element('{%s}%s' % (nsmap['metal'], panelId), nsmap=nsmap)
        slot.attrib['define-slot'] = panelId
        slot_parent = layoutPanelNode.getparent()
        slot_parent_index = slot_parent.index(layoutPanelNode)
        slot.append(layoutPanelNode)
        slot_parent.insert(slot_parent_index, slot)

        ## XXX: 'data-panel'-attributes are required for Deco-editor and could
        ## only be removed for anonymous users (and that's not implemented yet)
        # del layoutPanelNode.attrib['data-panel']

    root = result.tree.getroot()
    root.attrib['tal:define'] = """\
portal_state python: context.restrictedTraverse('@@plone_portal_state');
context_state python: context.restrictedTraverse('@@plone_context_state');
plone_view python: context.restrictedTraverse('@@plone');
lang portal_state/language;
view nocall: view | nocall: plone_view;
dummy python:plone_view.mark_view(view);
portal_url portal_state/portal_url;
checkPermission nocall: context/portal_membership/checkPermission;
site_properties nocall: context/portal_properties/site_properties;
ajax_load request/ajax_load | nothing;
ajax_include_head request/ajax_include_head | nothing;
dummy python:request.RESPONSE.setHeader('X-UA-Compatible', 'IE=edge,chrome=1');
"""
    head = root.find('head')
    if not ajax and head is not None:
        for name in ['top_slot', 'head_slot',
                     'style_slot', 'javascript_head_slot']:
            slot = etree.Element('{%s}%s' % (nsmap['metal'], name),
                                 nsmap=nsmap)
            slot.attrib['define-slot'] = name
            head.append(slot)

    template = '<metal:page define-macro="master">\n%s\n</metal:page>'
    metal = 'xmlns:metal="http://namespaces.zope.org/metal"'
    return (template % ''.join(result)).replace(metal, '')


class ViewPageTemplateString(ViewPageTemplateFile):

    def __init__(self, text):
        super(ViewPageTemplateString, self).__init__(__file__)
        self.pt_edit(text, 'text/html')
        self._cook()

        if self._v_errors:
            logger.error('PageTemplateFile: Error in template %s: %s',
                         self.filename, '\n'.join(self._v_errors))

    def _cook_check(self):
        pass  # cooked only during init


class Macro(list):
    def __repr__(self):
        # Override the default list.__repr__ to hide the contents of list
        return '<{0:s}.{1:s} object at 0x{2:x}>'.format(
            self.__class__.__module__,
            self.__class__.__name__,
            id(self)
        )


class MainTemplate(BrowserView):
    implements(IMainTemplate, IBlocksTransformEnabled)

    # XXX: This probably should be loaded as resource from plonetheme.sunburst
    main_template = ViewPageTemplateFile('templates/main_template.pt')

    def __call__(self):
        return self.template(self)

    @property
    @volatile.cache(cacheKey, volatile.store_on_context)
    def template(self):
        try:
            layout = getMultiAdapter((self.context, self.request),
                                     name='page-site-layout')()
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))
            return self.main_template

        cooked = cook_layout(layout, self.request.get('ajax_load'))
        pt = ViewPageTemplateString(cooked)
        bound_pt = pt.__get__(self, type(self))

        return bound_pt

    @property
    @view.memoize
    def macros(self):
        # Ensure that request has PUBLISHED to allow enabling blocks transform
        if self.request.get('PUBLISHED') is None:
            self.request.set('PUBLISHED', self)

        # Enable blocks transform
        alsoProvides(self.request.get('PUBLISHED'), IBlocksTransformEnabled)

        # Merge macros to provide fallback macros form legacy main_template
        macros = {}
        for template in [self.main_template, self.template]:
            if hasattr(template.macros, 'names'):
                # Chameleon template macros
                for name in template.macros.names:
                    macros[name] = template.macros[name]
            else:
                # Legacy template macros
                for name, macro in template.macros.items():
                    macros[name] = Macro(macro)
        return macros
