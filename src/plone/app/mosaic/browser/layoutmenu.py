from plone import api
from plone.app.blocks.interfaces import IBlocksTransformEnabled
from plone.app.blocks.layoutbehavior import ILayoutBehaviorAdaptable
from plone.app.blocks.resource import ContentLayoutTraverser
from plone.app.blocks.utils import resolveResource
from plone.app.content.browser.interfaces import IFolderContentsView
from plone.app.content.browser.selection import DefaultViewSelectionView
from plone.app.contentmenu.interfaces import IContentMenuItem
from plone.app.contentmenu.menu import DisplaySubMenuItem
from plone.app.mosaic.interfaces import _
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.dexterity.browser.view import DefaultView
from plone.memoize import view
from plone.protect.utils import addTokenToUrl
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from Products.CMFPlone.utils import parent
from urllib.parse import quote
from zExceptions import NotFound
from zope.browsermenu.interfaces import IBrowserMenu
from zope.browsermenu.menu import BrowserMenu
from zope.browsermenu.menu import BrowserSubMenuItem
from zope.component import adapter
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.interface import implementer
from zope.schema.interfaces import IVocabularyFactory
from zope.traversing.interfaces import ITraversable
from zope.traversing.namespace import SimpleHandler

import logging


logger = logging.getLogger("plone.app.mosaic")


def absolute_path(path):
    """Return path prefixed with slash"""
    if not path.startswith("/"):
        path = "/" + path
    return path


@implementer(ITraversable)
@adapter(ILayoutBehaviorAdaptable, IMosaicLayer)
class DisplayLayoutTraverser(SimpleHandler):
    def __init__(self, context, request):
        super().__init__(context)
        self.request = request

    def traverse(self, name, remaining):
        portal_type = getattr(self.context, "portal_type", None)
        if not portal_type:
            raise NotFound(self.context, name, self.request)

        types_tool = api.portal.get_tool("portal_types")
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            raise NotFound(self.context, name, self.request)

        aliases = fti.getMethodAliases() or {}
        layout = f"++layout++{name:s}"
        resource_path = absolute_path(aliases.get(layout))

        if resource_path is None:
            raise NotFound(self.context, name, self.request)
        return DisplayLayoutView(self.context, self.request, resource_path)


@implementer(ITraversable)
@adapter(ILayoutBehaviorAdaptable, IMosaicLayer)
class DisplayContentLayoutTraverser(SimpleHandler):
    def __init__(self, context, request):
        super().__init__(context)
        self.request = request

    def traverse(self, name, remaining):
        resource_path = "/++contentlayout++" + name
        vocab_factory = getUtility(
            IVocabularyFactory, name="plone.availableContentLayouts"
        )
        vocab = vocab_factory(self.context)
        if resource_path in vocab:
            self.request.URL = self.context.absolute_url() + "/"
            return DisplayLayoutView(self.context, self.request, resource_path)
        # Fallback to the original resource traverser
        traverser = ContentLayoutTraverser(self.context, self.request)
        return traverser.traverse(name, remaining)


@implementer(IBlocksTransformEnabled)
class DisplayLayoutView(DefaultView):
    def __init__(self, context, request, layout):
        super().__init__(context, request)
        self.resource_path = layout

    def __call__(self):
        try:
            return resolveResource(self.resource_path)
        except NotFound as e:
            logger.warning(f"Missing layout {e:s}")
            raise


@adapter(ILayoutBehaviorAdaptable, IMosaicLayer)
class HiddenDisplaySubMenuItem(DisplaySubMenuItem):
    @view.memoize
    def available(self):
        layout_menu = getMultiAdapter(
            (self.context, self.request),
            IContentMenuItem,
            name="plone.contentmenu.layout",
        )
        return layout_menu.available() and super().available()


@implementer(IContentMenuItem)
@adapter(ILayoutBehaviorAdaptable, IMosaicLayer)
class DisplayLayoutSubMenuItem(BrowserSubMenuItem):

    title = _("label_choose_display", default="Display")
    submenuId = "plone_contentmenu_layout"

    order = 25  # between display menu and factories menu:
    # actions menu   - order=10
    # display menu   - order=20
    # factories menu - order=30
    # workflows menu - order=40

    def __init__(self, context, request):
        super().__init__(context, request)
        self.context_state = getMultiAdapter(
            (context, request), name="plone_context_state"
        )

    @property
    def extra(self):
        return {"id": "plone-contentmenu-layout", "disabled": self.disabled()}

    @property
    def description(self):
        if self.disabled():
            return _(
                "title_remove_index_html_for_display_control",
                default="Delete or rename the index_html item to gain "
                "full control over how this folder is "
                "displayed.",
            )
        return _(
            "title_choose_default_layout",
            default="Select a predefined layout for this folder, "
            "or set a content item as its default view.",
        )

    @property
    def action(self):
        if self.disabled():
            return ""
        if self.context_state.is_default_page():
            return self.context_state.parent().absolute_url() + "/select_default_view"
        return self.context.absolute_url() + "/select_default_view"

    @view.memoize
    def available(self):
        if self.disabled():
            return False

        context = self.context
        if context is None:
            return False

        vocab_factory = getUtility(
            IVocabularyFactory, name="plone.availableDisplayLayouts"
        )
        vocab = vocab_factory(context)
        return len(vocab) > 0

    def selected(self):
        return False

    @view.memoize
    def disabled(self):
        # From: plone.app.contentmenu.menu.DisplayMenuSubMenuItem.disabled:
        if IFolderContentsView.providedBy(self.request):
            return True
        if not getattr(self.context, "isPrincipiaFolderish", False):
            return False
        return "index_html" in self.context.objectIds()


def getAvailableViewMethods(context):
    portal_type = getattr(context, "portal_type", None)
    if portal_type is None:
        return []

    types_tool = api.portal.get_tool("portal_types")
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        return []

    return fti.getAvailableViewMethods(context)


class DisplayLayoutMenu(BrowserMenu):
    def getMenuItems(self, context, request):  # noqa for now - C901 is too complex
        # Check required parameters
        if context is None or request is None:
            return []

        # Get layout vocabulary factory
        vocab_factory = getUtility(
            IVocabularyFactory, name="plone.availableDisplayLayouts"
        )

        # Get context state API
        context_state = getMultiAdapter((context, request), name="plone_context_state")

        # Get folder layout options when this is a default page
        folder_layout = ""
        folder_methods = []
        folder_results = []
        folder_url = ""
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
            if term.value not in folder_methods:
                continue
            is_selected = term.value == folder_layout
            id_ = term.value.split("++")[-1]
            actionUrl = "{:s}/selectViewTemplate?templateId={:s}".format(
                folder_url, quote(term.value)
            )
            actionUrl = addTokenToUrl(actionUrl, request)
            folder_results.append(
                {
                    "title": term.title,
                    "description": "",
                    "action": actionUrl,
                    "selected": is_selected,
                    "icon": None,
                    "extra": {
                        "id": "folder-layout-" + id_,
                        "separator": None,
                        "class": "actionMenuSelected" if is_selected else "",
                    },
                    "submenu": None,
                }
            )

        # Get context layout options
        context_methods = getAvailableViewMethods(context)
        context_results = []
        context_url = context.absolute_url()
        context_vocab = vocab_factory(context)
        context_default = ISelectableBrowserDefault(context, None)
        if context_default is not None:
            context_layout = context_default.getLayout()
        for term in context_vocab:
            if term.value not in context_methods:
                continue
            is_selected = term.value == context_layout
            id_ = term.value.split("++")[-1]
            actionUrl = "{:s}/selectViewTemplate?templateId={:s}".format(
                context_url, quote(term.value)
            )
            actionUrl = addTokenToUrl(actionUrl, request)
            context_results.append(
                {
                    "title": term.title,
                    "description": "",
                    "action": actionUrl,
                    "selected": is_selected,
                    "icon": None,
                    "extra": {
                        "id": "plone-contentmenu-layout-" + id_,
                        "separator": None,
                        "class": "actionMenuSelected" if is_selected else "",
                    },
                    "submenu": None,
                }
            )

        # Merge the results with the original display meny
        menu = getUtility(IBrowserMenu, "plone_contentmenu_display")

        results = []
        for result in menu.getMenuItems(context, request):
            id_ = (result.get("extra") or {}).get("id")
            sep = (result.get("extra") or {}).get("separator")

            # Extend results with layouts
            if id_ in ("folderHeader", "contextHeader"):
                pass
            elif sep and id_.startswith("folder") and folder_results:
                results.extend(folder_results)
                folder_results = []
            elif sep and id_.startswith("context") and context_results:
                results.extend(context_results)
                context_results = []

            # Move 'Custom layout' into bottom
            if id_ in ["folder-view", "folder-@@view"]:
                folder_results.append(result)
            elif id_ in [
                "plone-contentmenu-display-view",
                "plone-contentmenu-display-@@view",
            ]:
                context_results.append(result)
            else:
                results.append(result)

        # Flush the remaining options
        if folder_results:
            results.extend(folder_results)
        if context_results:
            results.extend(context_results)

        return results


class LayoutAwareDefaultViewSelectionView(DefaultViewSelectionView):
    @property
    def vocab(self):
        vocab_factory = getUtility(
            IVocabularyFactory, name="plone.availableDisplayLayouts"
        )
        vocab = vocab_factory(self.context)
        return list(super().vocab) + [(term.value, term.title) for term in vocab]
