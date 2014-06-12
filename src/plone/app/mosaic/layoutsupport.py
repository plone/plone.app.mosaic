# -*- coding: utf-8 -*-
import logging

from Products.CMFCore.utils import getToolByName
from Products.Five import BrowserView
from plone.resource.traversal import ResourceTraverser
from z3c.form.interfaces import IGroup
from z3c.form.widget import ComputedWidgetAttribute
from zExceptions import NotFound
from zope.component import adapts
from zope.interface import implements
from zope.publisher.interfaces.browser import IBrowserRequest
from zope.traversing.interfaces import ITraversable
from zope.traversing.namespace import SimpleHandler

from plone.app.blocks.interfaces import ILayoutField
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.resource import AvailableLayoutsVocabulary
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import (
    CONTENT_LAYOUT_MANIFEST_FORMAT,
    CONTENT_LAYOUT_FILE_NAME,
    CONTENT_LAYOUT_RESOURCE_NAME
)

logger = logging.getLogger('plone.app.mosaic')


class ContentLayoutTraverser(ResourceTraverser):
    """The content layout traverser.

    Allows traversal to /++contentlayout++<name> using ``plone.resource`` to
    fetch things stored either on the filesystem or in the ZODB.
    """

    name = CONTENT_LAYOUT_RESOURCE_NAME


AvailableContentLayoutsVocabularyFactory = AvailableLayoutsVocabulary(
    CONTENT_LAYOUT_MANIFEST_FORMAT,
    CONTENT_LAYOUT_FILE_NAME,
)


def getDefaultContentLayoutContent(adapter):
    portal_type = getattr(getattr(
        adapter.view, '__parent__', adapter.view), 'portal_type', None)
    if not portal_type:
        return u''

    types_tool = getToolByName(adapter.context, 'portal_types')
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        return u''

    aliases = fti.getMethodAliases() or {}
    layout = aliases.get('++layout++default')

    if layout:
        try:
            return resolveResource(layout)
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))
    return u''

# XXX: It would be best to register this for IAddForm, but if the field
# is moved into fieldset using plone.supermodel.directives.fieldset, its
# form is actually IGroup, not IAddForm.
default_layout_content = ComputedWidgetAttribute(
    getDefaultContentLayoutContent, view=IGroup, field=ILayoutField)


class ViewLayoutTraverser(SimpleHandler):
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
            return ContentLayoutView(self.context, self.request, resource_path)


class ContentLayoutView(BrowserView):
    def __init__(self, context, request, layout):
        super(ContentLayoutView, self).__init__(context, request)
        self.resource_path = layout

    def __call__(self):
        try:
            return resolveResource(self.resource_path)
        except NotFound as e:
            logger.warning('Missing layout {0:s}'.format(e))
            raise
