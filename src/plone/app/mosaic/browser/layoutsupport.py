# -*- coding: utf-8 -*-
from lxml import etree
from lxml import html
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from Products.CMFPlone.utils import parent
from plone.dexterity.browser.edit import DefaultEditForm
from plone import api
from plone.app.blocks.interfaces import IBlocksTransformEnabled
from plone.app.blocks.layoutbehavior import ContentLayoutView
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.resource import PageSiteLayout
from plone.app.blocks.utils import panelXPath
from plone.app.blocks.utils import bodyTileXPath
from plone.app.blocks.utils import replace_content
from plone.app.blocks.utils import resolveResource
from plone.app.content.browser.interfaces import IFolderContentsView
from plone.app.contentmenu.interfaces import IContentMenuItem
from plone.app.contentmenu.menu import DisplaySubMenuItem
from plone.app.mosaic.browser.main_template import MainTemplate
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_DEFAULT_LAYOUT
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.interfaces import _
from plone.app.mosaic.layoutsupport import ContentLayoutTraverser
from plone.app.mosaic.layoutsupport import absolute_path
from plone.dexterity.browser.view import DefaultView
from plone.memoize import view
from repoze.xmliter.utils import getHTMLSerializer
from urllib import quote
from zExceptions import NotFound
from zope.browsermenu.interfaces import IBrowserMenu
from zope.browsermenu.menu import BrowserMenu
from zope.browsermenu.menu import BrowserSubMenuItem
from zope.component import adapts
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.interface import implements
from zope.schema.interfaces import IVocabularyFactory
from zope.traversing.interfaces import ITraversable
from zope.traversing.namespace import SimpleHandler
import logging

try:
    from plone.protect.utils import addTokenToUrl
    HAS_PLONE_PROTECT = True
except ImportError:
    HAS_PLONE_PROTECT = False


logger = logging.getLogger('plone.app.mosaic')


class DisplayLayoutTraverser(SimpleHandler):
    implements(ITraversable)
    adapts(ILayoutAware, IMosaicLayer)

    def __init__(self, context, request):
        super(DisplayLayoutTraverser, self).__init__(context)
        self.request = request

    def traverse(self, name, remaining):
        try:
            return self._traverse(name, remaining)
        except NotFound as e:
            logger.warning(e.message)
            resource_path = absolute_path(CONTENT_LAYOUT_DEFAULT_LAYOUT)
            return DisplayLayoutView(self.context, self.request, resource_path)

    def _traverse(self, name, remaining):
        # For the main use-case this traverser is just a placeholder to
        # make display menu work. Here we return the default content
        # layout view and let the site layout view to merge the selected
        # layout for content layout view.
        return ContentLayoutView(self.context, self.request)


class DisplayStaticLayoutTraverser(DisplayLayoutTraverser):
    implements(ITraversable)
    adapts(ILayoutAware, IMosaicLayer)

    def _traverse(self, name, remaining):
        portal_type = getattr(self.context, 'portal_type', None)
        if not portal_type:
            raise NotFound(self.context, name, self.request)

        types_tool = api.portal.get_tool('portal_types')
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            raise NotFound(self.context, name, self.request)

        aliases = fti.getMethodAliases() or {}
        layout = '++layout++{0:s}'.format(name)
        resource_path = absolute_path(aliases.get(layout))

        if resource_path is None:
            raise NotFound(self.context, name, self.request)
        else:
            return DisplayLayoutView(self.context, self.request, resource_path)  # noqa


class DisplayContentLayoutTraverser(SimpleHandler):
    implements(ITraversable)
    adapts(ILayoutAware, IMosaicLayer)

    def __init__(self, context, request):
        super(DisplayContentLayoutTraverser, self).__init__(context)
        self.request = request

    def traverse(self, name, remaining):
        resource_path = '/++contentlayout++' + name
        vocab_factory = getUtility(IVocabularyFactory,
                                   name='plone.availableContentLayouts')
        vocab = vocab_factory(self.context)
        if resource_path in vocab:
            self.request.URL = self.context.absolute_url() + '/'
            return DisplayLayoutView(self.context, self.request, resource_path)
        else:
            # Fallback to the original resource traverser
            traverser = ContentLayoutTraverser(self.context, self.request)
            return traverser.traverse(name, remaining)


class DisplayLayoutView(DefaultView):
    implements(IBlocksTransformEnabled)

    def __init__(self, context, request, layout):
        super(DisplayLayoutView, self).__init__(context, request)
        self.resource_path = layout

    def __call__(self):
        try:
            return resolveResource(self.resource_path)
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))
            raise


def getPageLayout(context):
    """Return absolute path to the page/content layout mapped fo the
    selected browser default page layout on context or raise NotFound

    """
    browser_default = ISelectableBrowserDefault(context, None)
    if browser_default is None:
        raise NotFound('Unable to resolve layout')

    layout = browser_default.getLayout()

    if layout is None or not layout.startswith('++layout++'):
        raise NotFound('Unable to resolve layout')

    portal_type = getattr(context, 'portal_type', None)
    if portal_type is None:
        raise NotFound('Unable to resolve layout')

    types_tool = api.portal.get_tool('portal_types')
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        raise NotFound('Unable to resolve layout')

    aliases = fti.getMethodAliases() or {}
    if layout not in aliases:
        raise NotFound('Unable to resolve layout')

    return absolute_path(aliases.get(layout))


def safeGetHTMLSerializer(data):
    """Return HTML serializer for given html"""
    # Parse layout
    if isinstance(data, unicode):
        serializer = getHTMLSerializer([data.encode('utf-8')], encoding='utf-8')
    else:
        serializer = getHTMLSerializer([data], encoding='utf-8')

    # Fix XHTML layouts with inline js (etree.tostring breaks all <![CDATA[)
    if '<![CDATA[' in data:
        serializer.serializer = html.tostring

    return serializer


def mergePageIntoLayout(page, layout, static_tiles=False):
    """Merge given page layout into given site layout and return the merged
    site layout

    """
    page = safeGetHTMLSerializer(page)
    layout = safeGetHTMLSerializer(layout)

    # Prevent static tiles from being rendered when on edit form to make
    # them available to be editable with the Mosaic editor
    if static_tiles:
        for tile in bodyTileXPath(page.tree):
            tile.attrib['data-static-tile'] = tile.attrib['data-tile']
            del tile.attrib['data-tile']

    pagePanels = dict(
        (node.attrib['data-panel'], node)
        for node in panelXPath(page.tree)
    )

    layoutPanels = dict(
        (node.attrib['data-panel'], node)
        for node in panelXPath(layout.tree)
    )

    # Ensure that site layout has element with data-panel="content"
    if 'content' not in layoutPanels:
        for node in layout.tree.xpath('//*[@id="content"]'):
            node.attrib['data-panel'] = 'content'
            layoutPanels['content'] = node
            break

    # Wrap all content into merged data-panel="content"
    for node in etree.XPath('/html/body')(page.tree):
        div = etree.Element('div')
        div.attrib['data-panel'] = 'content'
        div.extend(node.getchildren())
        node.append(div)

        # Ensure that the new site layout will have data-panel="content"
        if 'content' not in pagePanels:
            panel = etree.Element('div')
            panel.attrib['data-panel'] = 'content'
            div.append(panel)

        pagePanels = {'content': div}

        break

    # Still iterate over all possible layout panels, because we may want
    # to support merging more than just "content" panel later
    for panelId, layoutPanelNode in layoutPanels.items():
        pagePanelNode = pagePanels.get(panelId, None)
        if pagePanelNode is not None:
            replace_content(layoutPanelNode, pagePanelNode)
            del layoutPanelNode.attrib['data-panel']

    return ''.join(layout)


class PageSiteLayoutView(PageSiteLayout):
    """Special page-site-layout to allow merging content layouts into
    site layouts to enable pre-defined and centrally managed content
    layouts with freely editable areas.

    """
    # index is called from "legacy" views like edit forms by main_template's
    # master macro (this only intercepts DX edit forms)
    def index(self):
        try:
            return super(PageSiteLayoutView, self).index()
        except NotFound as e:
            published = self.request.get('PUBLISHED')
            if not isinstance(getattr(published, 'form_instance', None),
                              DefaultEditForm):
                raise e
            try:
                resource_path = getPageLayout(self.context)
                page = resolveResource(resource_path)
            except NotFound:
                raise e  # raise the original exception

        # XXX: We really should not render main_templates here, but
        # refactoring to properly read, parse and merge that template
        # with page layout could take anything from hours to days.
        if self.request.form.get('ajax_load'):
            layout = MainTemplate(self.context, self.request).ajax_template()
        else:
            layout = MainTemplate(self.context, self.request).main_template()

        return mergePageIntoLayout(page, layout, static_tiles=True)

    # __call__ is called by panelMerge subrequest when the view is rendered
    def __call__(self):
        layout = super(PageSiteLayout, self).__call__()
        try:
            resource_path = getPageLayout(self.context)
            page = resolveResource(resource_path)
            return mergePageIntoLayout(page, layout)
        except NotFound:
            return layout


class HiddenDisplaySubMenuItem(DisplaySubMenuItem):
    adapts(ILayoutAware, IMosaicLayer)

    @view.memoize
    def available(self):
        layout_menu = getMultiAdapter((self.context, self.request),
                                      IContentMenuItem,
                                      name='plone.contentmenu.layout')
        if layout_menu.available():
            return False
        else:
            return super(HiddenDisplaySubMenuItem, self).available()


class DisplayLayoutSubMenuItem(BrowserSubMenuItem):
    implements(IContentMenuItem)
    adapts(ILayoutAware, IMosaicLayer)

    title = _(u'label_choose_display', default=u'Display')
    submenuId = 'plone_contentmenu_layout'

    order = 25  # between display menu and factories menu:
    # actions menu   - order=10
    # display menu   - order=20
    # factories menu - order=30
    # workflows menu - order=40

    def __init__(self, context, request):
        BrowserSubMenuItem.__init__(self, context, request)
        self.context_state = getMultiAdapter((context, request),
                                             name='plone_context_state')

    @property
    def extra(self):
        return {'id': 'plone-contentmenu-layout', 'disabled': self.disabled()}

    @property
    def description(self):
        if self.disabled():
            return _(u'title_remove_index_html_for_display_control',
                     default=u'Delete or rename the index_html item to gain '
                             u'full control over how this folder is '
                             u'displayed.')
        else:
            return _(u'title_choose_default_layout',
                     default=u'Select a predefined layout for this folder, '
                             u'or set a content item as its default view.')

    @property
    def action(self):
        if self.disabled():
            return ''
        else:
            if self.context_state.is_default_page():
                return self.context_state.parent().absolute_url() + \
                    '/select_default_view'
            else:
                return self.context.absolute_url() + '/select_default_view'

    @view.memoize
    def available(self):
        if self.disabled():
            return False

        context = self.context
        vocab_factory = getUtility(IVocabularyFactory,
                                   name='plone.availableDisplayLayouts')
        vocab = vocab_factory(context)

        if context is None:
            return False
        if len(vocab) > 0:
            return True
        else:
            return False

    def selected(self):
        return False

    @view.memoize
    def disabled(self):
        # From: plone.app.contentmenu.menu.DisplayMenuSubMenuItem.disabled:
        if IFolderContentsView.providedBy(self.request):
            return True
        context = self.context
        if not getattr(context, 'isPrincipiaFolderish', False):
            return False
        elif 'index_html' not in context.objectIds():
            return False
        else:
            return True


def getAvailableViewMethods(context):
    portal_type = getattr(context, 'portal_type', None)
    if portal_type is None:
        return []

    types_tool = api.portal.get_tool('portal_types')
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        return []

    return fti.getAvailableViewMethods(context)


class DisplayLayoutMenu(BrowserMenu):
    def getMenuItems(self, context, request):
        # Check required parameters
        if context is None or request is None:
            return []

        # Get layout vocabulary factory
        vocab_factory = getUtility(IVocabularyFactory,
                                   name='plone.availableDisplayLayouts')

        # Get context state API
        context_state = getMultiAdapter((context, request),
                                        name='plone_context_state')

        # Get folder layout options when this is a default page
        folder_layout = ''
        folder_methods = []
        folder_results = []
        folder_url = ''
        folder_vocab = []
        if context_state.is_default_page():
            folder = parent(context)
            if folder is not None:
                folder_methods = getAvailableViewMethods(folder)
                folder_url = folder.absolute_url()
                folder_vocab = vocab_factory(folder)
                folder_default = ISelectableBrowserDefault(folder, None)
                if folder_default is not None:
                    folder_layout = folder_default.getLayout()
        for term in folder_vocab or []:
            if term.value in folder_methods:
                is_selected = term.value == folder_layout
                id_ = term.value.split('++')[-1]
                actionUrl = '%s/selectViewTemplate?templateId=%s' % (
                    folder_url, quote(term.value),),
                if HAS_PLONE_PROTECT:
                    actionUrl = addTokenToUrl(actionUrl, request)
                folder_results.append({
                    'title': term.title,
                    'description': '',
                    'action': actionUrl,
                    'selected': is_selected,
                    'icon': None,
                    'extra': {
                        'id': 'folder-layout-' + id_,
                        'separator': None,
                        'class': is_selected and 'actionMenuSelected' or ''},
                    'submenu': None,
                })

        # Get context layout options
        context_methods = getAvailableViewMethods(context)
        context_results = []
        context_url = context.absolute_url()
        context_vocab = vocab_factory(context)
        context_default = ISelectableBrowserDefault(context, None)
        if context_default is not None:
            context_layout = context_default.getLayout()
        for term in context_vocab:
            if term.value in context_methods:
                is_selected = term.value == context_layout
                id_ = term.value.split('++')[-1]
                actionUrl = '%s/selectViewTemplate?templateId=%s' % (
                    context_url, quote(term.value),)
                if HAS_PLONE_PROTECT:
                    actionUrl = addTokenToUrl(actionUrl, request)
                context_results.append({
                    'title': term.title,
                    'description': '',
                    'action': actionUrl,
                    'selected': is_selected,
                    'icon': None,
                    'extra': {
                        'id': 'plone-contentmenu-layout-' + id_,
                        'separator': None,
                        'class': is_selected and 'actionMenuSelected' or ''},
                    'submenu': None,
                })

        # Merge the results with the original display meny
        menu = getUtility(IBrowserMenu, 'plone_contentmenu_display')

        results = []
        for result in menu.getMenuItems(context, request):
            id_ = (result.get('extra') or {}).get('id')
            sep = (result.get('extra') or {}).get('separator')

            # Extend results with layouts
            if id_ in ('folderHeader', 'contextHeader'):
                pass
            elif sep and id_.startswith('folder') and folder_results:
                results.extend(folder_results)
                folder_results = []
            elif sep and id_.startswith('context') and context_results:
                results.extend(context_results)
                context_results = []

            # Move 'Custom layout' into bottom
            if id_ in ['folder-view', 'folder-@@view']:
                folder_results.append(result)
            elif id_ in ['plone-contentmenu-display-view',
                         'plone-contentmenu-display-@@view']:
                context_results.append(result)
            else:
                results.append(result)

        # Flush the remaining options
        if folder_results:
            results.extend(folder_results)
        if context_results:
            results.extend(context_results)

        return results
