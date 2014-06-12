import logging
from urllib import quote

from Products.CMFCore.utils import getToolByName
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from Products.Five import BrowserView
from plone.app.content.browser.interfaces import IContentsPage
from plone.app.contentmenu.interfaces import IContentMenuItem
from zExceptions import NotFound
from zope.browsermenu.menu import BrowserMenu, BrowserSubMenuItem
from zope.component import adapts, getMultiAdapter, getUtility
from zope.interface import implements
from zope.publisher.interfaces.browser import IBrowserRequest
from zope.schema.interfaces import IVocabularyFactory
from zope.traversing.interfaces import ITraversable
from zope.traversing.namespace import SimpleHandler
from plone.memoize import view

from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import _


logger = logging.getLogger('plone.app.mosaic')


class DisplayLayoutTraverser(SimpleHandler):
    """A traverser to allow unique URLs for caching"""

    implements(ITraversable)
    adapts(ILayoutAware, IBrowserRequest)

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def traverse(self, name, remaining):
        portal_type = getattr(self.context, 'portal_type', None)
        if not portal_type:
            raise NotFound(self.context, name, self.request)

        types_tool = getToolByName(self.context, 'portal_types')
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            raise NotFound(self.context, name, self.request)

        aliases = fti.getMethodAliases() or {}
        layout = '++layout++{0:s}'.format(name)
        resource_path = aliases.get(layout)

        if resource_path is None:
            raise NotFound(self.context, name, self.request)
        else:
            return DisplayLayoutView(self.context, self.request, resource_path)


class DisplayLayoutView(BrowserView):
    def __init__(self, context, request, layout):
        super(DisplayLayoutView, self).__init__(context, request)
        self.resource_path = layout

    def __call__(self):
        try:
            return resolveResource(self.resource_path)
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))
            raise


class DisplayLayoutSubMenuItem(BrowserSubMenuItem):
    implements(IContentMenuItem)
    adapts(ILayoutAware, IBrowserRequest)

    title = _(u'label_choose_layout', default=u'Layout')
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
            # TODO: A standalone action view should be made and links added
            return '#'

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
        if IContentsPage.providedBy(self.request):
            return True
        context = self.context
        if not getattr(context, 'isPrincipiaFolderish', False):
            return False
        elif 'index_html' not in context.objectIds():
            return False
        else:
            return True


class DisplayLayoutMenu(BrowserMenu):
    def getMenuItems(self, context, request):
        results = []

        vocab_factory = getUtility(IVocabularyFactory,
                                   name='plone.availableDisplayLayouts')
        vocab = vocab_factory(context)
        context = ISelectableBrowserDefault(context, None)
        layout = context.getLayout()
        if context is None:
            return []

        # Add the 'Custom layout' option
        is_selected = layout == 'view'
        results.append({
            'title': _('Custom layout'),
            'description': '',
            'action': '{0:s}/selectViewTemplate?templateId={1:s}'.format(
                context.absolute_url(), 'view'),
            'selected': is_selected,
            'icon': None,
            'extra': {
                'id': 'layout-view',
                'separator': None,
                'class': is_selected and 'actionMenuSelected' or ''},
            'submenu': None,
        })

        # Add the predefined layout options
        for term in vocab:
            is_selected = term.value == layout
            results.append({
                'title': term.title,
                'description': '',
                'action': '%s/selectViewTemplate?templateId=%s' % (
                    context.absolute_url(), quote(term.value),),
                'selected': is_selected,
                'icon': None,
                'extra': {
                    'id': 'layout-' + term.value.split('++')[-1],
                    'separator': None,
                    'class': is_selected and 'actionMenuSelected' or ''},
                'submenu': None,
            })
        return results
