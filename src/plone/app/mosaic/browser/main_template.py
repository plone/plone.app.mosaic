from hashlib import md5
from lxml import etree
from lxml import html
from plone.app.blocks.interfaces import IBlocksTransformEnabled
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.utils import resolveResource
from plone.dexterity.browser.add import DefaultAddView
from plone.memoize import ram
from plone.memoize import view
from plone.resource.interfaces import IResourceDirectory
from Products.CMFPlone.browser.interfaces import IMainTemplate
from Products.Five import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from repoze.xmliter.utils import getHTMLSerializer
from urllib.parse import unquote
from urllib.parse import urljoin
from zExceptions import NotFound
from zope.component import getMultiAdapter
from zope.interface import alsoProvides
from zope.interface import implementer

import logging
import os
import pkg_resources
import re


NSMAP = {"metal": "http://namespaces.zope.org/metal"}
slotsXPath = etree.XPath("//*[@data-slots]")

logger = logging.getLogger("plone.app.mosaic")

TEMPLATE = """\
<metal:page
    define-macro="master"
    tal:define="
        portal_state context/@@plone_portal_state;
        context_state context/@@plone_context_state;
        plone_view context/@@plone;
        plone_layout context/@@plone_layout;
        icons python:context.restrictedTraverse('@@iconresolver');
        lang portal_state/language;
        view nocall: view | nocall: plone_view;
        dummy python:plone_layout.mark_view(view);
        portal_url portal_state/portal_url;
        checkPermission nocall: context/portal_membership/checkPermission;
        ajax_include_head request/ajax_include_head | nothing;
        ajax_load request/ajax_load | python: False;
        toolbar_class python:request.cookies.get('plone-toolbar', 'plone-toolbar-left pat-toolbar');
        dummy python:request.RESPONSE.setHeader('X-UA-Compatible', 'IE=edge,chrome=1');">
{0}
</metal:page>"""  # noqa


def cook_layout_cachekey(func, layout, ajax):
    if isinstance(layout, str):
        layout = layout.encode("utf-8", "replace")
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
    if ">" in value:
        wrappers, children = value.split(">", 1)
    else:
        wrappers = value
        children = ""
    if "*" in children:
        prepends, appends = children.split("*", 1)
    else:
        prepends = children
        appends = ""

    wrappers = list(filter(bool, list(map(str.strip, wrappers.split()))))
    prepends = list(filter(bool, list(map(str.strip, prepends.split()))))
    appends = list(filter(bool, list(map(str.strip, appends.split()))))

    return wrappers, prepends, appends


def wrap_append_prepend_slots(node, data_slots):
    wrappers, prepends, appends = parse_data_slots(data_slots)

    for panel_id in wrappers:
        slot = etree.Element(
            "{{{0:s}}}{1:s}".format(NSMAP["metal"], panel_id), nsmap=NSMAP
        )
        slot.attrib["define-slot"] = panel_id
        slot_parent = node.getparent()
        slot_parent_index = slot_parent.index(node)
        slot.append(node)
        slot_parent.insert(slot_parent_index, slot)

    for panel_id in prepends:
        slot = etree.Element(
            "{{{0:s}}}{1:s}".format(NSMAP["metal"], panel_id), nsmap=NSMAP
        )
        slot.attrib["define-slot"] = panel_id
        node.insert(0, slot)

    for panel_id in appends:
        slot = etree.Element(
            "{{{0:s}}}{1:s}".format(NSMAP["metal"], panel_id), nsmap=NSMAP
        )
        slot.attrib["define-slot"] = panel_id
        node.append(slot)

    return wrappers + prepends + appends


@ram.cache(cook_layout_cachekey)
def cook_layout(layout, ajax):
    """Return main_template compatible layout"""
    # Fix XHTML layouts with CR[+LF] line endings
    layout = re.sub("\r", "\n", re.sub("\r\n", "\n", layout))

    # Parse layout
    if isinstance(layout, str):
        result = getHTMLSerializer([layout.encode("utf-8")], encoding="utf-8")
    else:
        result = getHTMLSerializer([layout], encoding="utf-8")

    # Fix XHTML layouts with inline js (etree.tostring breaks all <![CDATA[)
    if "<![CDATA[" in layout:
        result.serializer = html.tostring

    # Wrap all panels with a metal:fill-slot -tag:
    all_slots = []
    for layoutPanelNode in slotsXPath(result.tree):
        data_slots = layoutPanelNode.attrib["data-slots"]
        all_slots += wrap_append_prepend_slots(layoutPanelNode, data_slots)
        del layoutPanelNode.attrib["data-slots"]

    # When no slots are explicitly defined, try to inject the very default
    # slots
    if len(all_slots) == 0:
        for node in result.tree.xpath('//*[@data-panel="content"]'):
            wrap_append_prepend_slots(node, "content > body header main * content-core")

    # Append implicit slots
    head = result.tree.getroot().find("head")
    if not ajax and head is not None:
        for name in ["top_slot", "head_slot", "style_slot", "javascript_head_slot"]:
            slot = etree.Element(
                "{{{0:s}}}{1:s}".format(NSMAP["metal"], name), nsmap=NSMAP
            )
            slot.attrib["define-slot"] = name
            head.append(slot)

    template = TEMPLATE
    metal = 'xmlns:metal="http://namespaces.zope.org/metal"'

    return template.format(b"".join(result).decode("utf-8")).replace(metal, "")


class ViewPageTemplateString(ViewPageTemplateFile):
    def __init__(self, text):
        super().__init__(__file__)
        self.pt_edit(text, "text/html")
        self._cook()

        if self._v_errors:
            logger.error(
                "PageTemplateFile: Error in template %s: %s",
                self.filename,
                "\n".join(self._v_errors),
            )

    def _cook_check(self):
        pass  # cooked only during init


class Macro(list):
    def __repr__(self):
        # Override the default list.__repr__ to hide the contents of list
        return "<{:s}.{:s} object at 0x{:x}>".format(
            self.__class__.__module__, self.__class__.__name__, id(self)
        )


def resolve_ajax_main_template():
    main_template = os.path.join("browser", "templates", "ajax_main_template.pt")
    filename = pkg_resources.resource_filename("Products.CMFPlone", main_template)
    return ViewPageTemplateFile(filename)


def resolve_main_template():
    main_template = os.path.join("browser", "templates", "main_template.pt")
    filename = pkg_resources.resource_filename("Products.CMFPlone", main_template)
    return ViewPageTemplateFile(filename)


@implementer(IMainTemplate, IBlocksTransformEnabled)
class MainTemplate(BrowserView):
    ajax_template = resolve_ajax_main_template()
    main_template = resolve_main_template()

    def __call__(self):
        if self.request.form.get("ajax_load"):
            return self.ajax_template()
        return self.main_template()

    @property
    def template(self):
        try:
            return self.layout
        except NotFound:
            pass
        if self.request.form.get("ajax_load"):
            return self.ajax_template
        return self.main_template

    @property
    def layout(self):
        published = self.request.get("PUBLISHED")
        if isinstance(published, DefaultAddView):
            # Handle the special case of DX add form of layout aware context
            layout = None
            adapter = ILayoutAware(self.context, None)
            if adapter is not None:
                if getattr(adapter, "sectionSiteLayout", None):
                    layout = adapter.sectionSiteLayout
            if layout:
                layout = urljoin(self.context.absolute_url_path(), layout)
                layout = resolveResource(layout)
            if not layout:
                layout = getMultiAdapter(
                    (self.context, self.request), name="default-site-layout"
                ).index()
        else:
            layout = getMultiAdapter(
                (self.context, self.request), name="page-site-layout"
            ).index()
        cooked = cook_layout(layout, self.request.get("ajax_load"))
        pt = ViewPageTemplateString(cooked)
        bound_pt = pt.__get__(self, type(self))
        return bound_pt

    @property
    @view.memoize
    def macros(self):
        # Enable blocks transform when not below resource directory
        if not any(
            map(IResourceDirectory.providedBy, self.request.get("PARENTS") or [])
        ):
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
