# -*- coding: utf-8 -*-
from hashlib import md5
from lxml import etree
from lxml import html
from plone.app.blocks.interfaces import IBlocksTransformEnabled
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.utils import layoutXPath
from plone.app.blocks.utils import resolveResource
from plone.app.blocks.utils import xpath1
from plone.memoize import ram
from plone.memoize import view
from plone.resource.interfaces import IResourceDirectory
from plone.subrequest import ISubRequest
from Products.CMFPlone.browser.interfaces import IMainTemplate
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from Products.Five import BrowserView
from repoze.xmliter.utils import getHTMLSerializer
from urlparse import unquote
from zExceptions import NotFound
from zope.interface import alsoProvides
from zope.interface import implementer

import logging
import os
import pkg_resources
import re


NSMAP = {'metal': 'http://namespaces.zope.org/metal'}
slotsXPath = etree.XPath("//*[@data-slots]")

logger = logging.getLogger('plone.app.mosaic')

TEMPLATE = """\
<metal:page
    define-macro="master"
    tal:define="
        portal_state context/@@plone_portal_state;
        context_state context/@@plone_context_state;
        plone_view context/@@plone;
        plone_layout context/@@plone_layout;
        lang portal_state/language;
        view nocall: view | nocall: plone_view;
        dummy python:plone_layout.mark_view(view);
        portal_url portal_state/portal_url;
        checkPermission nocall: context/portal_membership/checkPermission;
        site_properties nocall: context/portal_properties/site_properties;
        ajax_include_head request/ajax_include_head | nothing;
        ajax_load request/ajax_load | python: False;
        toolbar_class python:request.cookies.get('plone-toolbar', 'plone-toolbar-left pat-toolbar');
        dummy python:request.RESPONSE.setHeader('X-UA-Compatible', 'IE=edge,chrome=1');">
%s
</metal:page>"""  # noqa


def cook_layout_cachekey(func, layout, ajax):
    if isinstance(layout, unicode):
        layout = layout.encode('utf-8', 'replace')
    return md5(layout).hexdigest(), ajax


def parse_data_slots(value):
    """Parse data-slots value into slots used to wrap node, prepend to node or
    append to node.

       >>> parse_data_slots('')
       ([], [], [])

       >>> parse_data_slots('foo bar')
       (['foo', 'bar'], [], [])

       >>> parse_data_slots('foo bar > foobar')
       (['foo', 'bar'], ['foobar'], [])

       >>> parse_data_slots('> foobar')
       ([], ['foobar'], [])

       >>> parse_data_slots('> foo * bar')
       ([], ['foo'], ['bar'])

       >>> parse_data_slots('foobar > foo * bar')
       (['foobar'], ['foo'], ['bar'])

       >>> parse_data_slots('foo > * bar')
       (['foo'], [], ['bar'])

    """
    value = unquote(value)
    if '>' in value:
        wrappers, children = value.split('>', 1)
    else:
        wrappers = value
        children = ''
    if '*' in children:
        prepends, appends = children.split('*', 1)
    else:
        prepends = children
        appends = ''

    wrappers = filter(bool, map(str.strip, wrappers.split()))
    prepends = filter(bool, map(str.strip, prepends.split()))
    appends = filter(bool, map(str.strip, appends.split()))

    return wrappers, prepends, appends


def wrap_append_prepend_slots(node, data_slots):
    wrappers, prepends, appends = parse_data_slots(data_slots)

    for panelId in wrappers:
        slot = etree.Element('{{{0:s}}}{1:s}'.format(NSMAP['metal'], panelId),
                             nsmap=NSMAP)
        slot.attrib['define-slot'] = panelId
        slot_parent = node.getparent()
        slot_parent_index = slot_parent.index(node)
        slot.append(node)
        slot_parent.insert(slot_parent_index, slot)

    for panelId in prepends:
        slot = etree.Element('{{{0:s}}}{1:s}'.format(NSMAP['metal'], panelId),
                             nsmap=NSMAP)
        slot.attrib['define-slot'] = panelId
        node.insert(0, slot)

    for panelId in appends:
        slot = etree.Element('{{{0:s}}}{1:s}'.format(NSMAP['metal'], panelId),
                             nsmap=NSMAP)
        slot.attrib['define-slot'] = panelId
        node.append(slot)

    return wrappers + prepends + appends


@ram.cache(cook_layout_cachekey)
def cook_layout(layout, ajax):
    """Return main_template compatible layout"""
    # Fix XHTML layouts with CR[+LF] line endings
    layout = re.sub('\r', '\n', re.sub('\r\n', '\n', layout))

    # Parse layout
    if isinstance(layout, unicode):
        result = getHTMLSerializer([layout.encode('utf-8')], encoding='utf-8')
    else:
        result = getHTMLSerializer([layout], encoding='utf-8')

    # Fix XHTML layouts with inline js (etree.tostring breaks all <![CDATA[)
    if '<![CDATA[' in layout:
        result.serializer = html.tostring

    # Wrap all panels with a metal:fill-slot -tag:
    all_slots = []
    for layoutPanelNode in slotsXPath(result.tree):
        data_slots = layoutPanelNode.attrib['data-slots']
        all_slots += wrap_append_prepend_slots(layoutPanelNode, data_slots)
        del layoutPanelNode.attrib['data-slots']

    # When no slots are explicitly defined, try to inject the very default
    # slots
    if len(all_slots) == 0:
        for node in result.tree.xpath('//*[@data-panel="content"]'):
            wrap_append_prepend_slots(
                node, 'content > body header main * content-core')

    # Append implicit slots
    head = result.tree.getroot().find('head')
    if not ajax and head is not None:
        for name in ['top_slot', 'head_slot',
                     'style_slot', 'javascript_head_slot']:
            slot = etree.Element('{{{0:s}}}{1:s}'.format(NSMAP['metal'], name),
                                 nsmap=NSMAP)
            slot.attrib['define-slot'] = name
            head.append(slot)

    template = TEMPLATE
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


def resolve_ajax_main_template():
    # Plone 5
    main_template = os.path.join(
        'browser', 'templates', 'ajax_main_template.pt')
    if pkg_resources.resource_exists('Products.CMFPlone', main_template):
        filename = pkg_resources.resource_filename('Products.CMFPlone',
                                                   main_template)
        return ViewPageTemplateFile(filename)
    else:
        return resolve_main_template()


def resolve_main_template():
    # Plone 5
    main_template = os.path.join(
        'browser', 'templates', 'main_template.pt')
    if pkg_resources.resource_exists('Products.CMFPlone', main_template):
        filename = pkg_resources.resource_filename('Products.CMFPlone',
                                                   main_template)
        return ViewPageTemplateFile(filename)

    # Plone 4 with Sunburst
    sunburst_main_template = os.path.join(
        'skins', 'sunburst_templates', 'main_template.pt')
    if pkg_resources.resource_exists('plonetheme.sunburst',
                                     sunburst_main_template):
        filename = pkg_resources.resource_filename('plonetheme.sunburst',
                                                   sunburst_main_template)
        return ViewPageTemplateFile(filename)

    # Fallback
    skins_main_template = os.path.join(
        'skins', 'plone_templates', 'main_template.pt')
    if pkg_resources.resource_exists('Products.CMFPlone', skins_main_template):
        filename = pkg_resources.resource_filename('Products.CMFPlone',
                                                   skins_main_template)
        return ViewPageTemplateFile(filename)


@implementer(IMainTemplate, IBlocksTransformEnabled)
class MainTemplate(BrowserView):

    ajax_template = resolve_ajax_main_template()
    main_template = resolve_main_template()

    def __call__(self):
        if self.request.form.get('ajax_load'):
            return self.ajax_template()
        else:
            return self.main_template()

    @property
    def template(self):
        if ISubRequest.providedBy(self.request):
            # Subrequests should only request the main_template when site
            # layouts are enabled, but no default site layout has been set
            if self.request.form.get('ajax_load'):
                return self.ajax_template
            else:
                return self.main_template
        else:
            try:
                return self.layout
            except (NotFound, IOError):
                if self.request.form.get('ajax_load'):
                    return self.ajax_template
                else:
                    return self.main_template

    @property
    def layout(self):
        # Resolve layout path from data-layout of content (or the default)
        layout_aware = ILayoutAware(self.context, None)
        content_layout = layout_aware.content_layout()
        html_parser = html.HTMLParser(encoding='utf-8')
        html_tree = html.fromstring(content_layout, parser=html_parser)
        layout_path = xpath1(layoutXPath, html_tree.getroottree())

        # Resolve layout path into layout
        layout = resolveResource(layout_path)

        # Cook main_template from layout
        cooked = cook_layout(layout, self.request.get('ajax_load'))
        pt = ViewPageTemplateString(cooked)
        bound_pt = pt.__get__(self, type(self))
        return bound_pt

    @property
    @view.memoize
    def macros(self):
        # Enable blocks transform when not below resource directory
        if not any(map(
            IResourceDirectory.providedBy,
            self.request.get('PARENTS') or []
        )):
            alsoProvides(self.request, IBlocksTransformEnabled)

        # Merge macros to provide fallback macros form legacy main_template
        macros = {}
        for template in [self.main_template, self.template]:
            try:
                # Chameleon template macros
                for name in template.macros.names:
                    macros[name] = template.macros[name]
            except AttributeError:
                # Legacy template macros
                for name, macro in template.macros.items():
                    macros[name] = Macro(macro)
        return macros
