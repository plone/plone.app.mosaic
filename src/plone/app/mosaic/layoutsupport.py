# -*- coding: utf-8 -*-
import logging

from Products.CMFCore.utils import getToolByName

from plone.resource.manifest import getAllResources
from plone.resource.traversal import ResourceTraverser
from plone.subrequest import ISubRequest
from z3c.form.interfaces import IGroup
from z3c.form.widget import ComputedWidgetAttribute
from zExceptions import NotFound
from zope.component import adapter
from zope.schema.interfaces import IVocabularyFactory
from zope.schema.vocabulary import SimpleVocabulary
from zope.schema.vocabulary import SimpleTerm

from plone.app.blocks.interfaces import ILayoutField
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.resource import AvailableLayoutsVocabulary
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_FILE_NAME
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_RESOURCE_NAME

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
    if portal_type is None:
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


def getDefaultDisplayLayoutContent():
    layout = '/++contentlayout++default/content.html'
    try:
        return resolveResource(layout)
    except NotFound:
        return u''

ILayoutAware['content'].defaultFactory = getDefaultDisplayLayoutContent


def absolute_path(path):
    """Return path prefixed with slash"""
    if not path.startswith('/'):
        path = '/' + path
    return path


@adapter(IVocabularyFactory)
def AvailableDisplayLayoutsVocabularyFactory(context):
    portal_type = getattr(context, 'portal_type', None)
    if portal_type is None:
        return SimpleVocabulary([])

    types_tool = getToolByName(context, 'portal_types')
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        return SimpleVocabulary([])

    aliases = fti.getMethodAliases() or {}
    layouts = dict([(absolute_path(item[1]), item[0])
                    for item in aliases.items()
                    if item[0].startswith('++layout++')])

    items = []
    format_ = CONTENT_LAYOUT_MANIFEST_FORMAT
    resources = getAllResources(format_)  # memoize?
    for name, manifest in resources.items():
        if manifest is not None:
            filename = manifest['file']
            path = "/++{0:s}++{1:s}/{2:s}".format(format_.resourceType,
                                                  name, filename)
            layout = layouts.get(path)
            if layout is not None:
                title = unicode(manifest['title'], 'utf-8', 'ignore')
                items.append(SimpleTerm(layout, layout, title))

    return SimpleVocabulary(items)
