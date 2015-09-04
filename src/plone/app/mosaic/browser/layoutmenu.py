# -*- coding: utf-8 -*-
from urllib import quote
import logging
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from Products.CMFPlone.utils import parent
from plone.app.content.browser.interfaces import IFolderContentsView
from plone.app.contentmenu.interfaces import IContentMenuItem
from plone.app.contentmenu.menu import DisplaySubMenuItem
from plone.dexterity.browser.view import DefaultView
from plone.memoize import view
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
from plone import api
from plone.app.blocks.interfaces import IBlocksTransformEnabled
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.interfaces import _
from plone.app.blocks.resource import ContentLayoutTraverser

try:
    from plone.protect.utils import addTokenToUrl
    HAS_PLONE_PROTECT = True
except ImportError:
    HAS_PLONE_PROTECT = False

try:
    from plone.app.content.browser.selection import DefaultViewSelectionView
    HAS_SELECTION_VIEW = True
except ImportError:
    HAS_SELECTION_VIEW = False

logger = logging.getLogger('plone.app.mosaic')


def absolute_path(path):
    """Return path prefixed with slash"""
    if not path.startswith('/'):
        path = '/' + path
    return path


class DisplayLayoutTraverser(SimpleHandler):
    implements(ITraversable)
    adapts(ILayoutAware, IMosaicLayer)

    def __init__(self, context, request):
        super(DisplayLayoutTraverser, self).__init__(context)
        self.request = request

    def traverse(self, name, remaining):
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
            return DisplayLayoutView(self.context, self.request, resource_path)


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


if HAS_SELECTION_VIEW:

    class LayoutAwareDefaultViewSelectionView(DefaultViewSelectionView):

        @property
        def vocab(self):
            vocab_factory = getUtility(IVocabularyFactory,
                                       name='plone.availableDisplayLayouts')
            vocab = vocab_factory(self.context)
            return (
                list(super(LayoutAwareDefaultViewSelectionView, self).vocab) +
                [(term.value, term.title) for term in vocab]
            )
