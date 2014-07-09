# -*- coding: utf-8 -*-
import logging

from Products.CMFCore.utils import getToolByName
from plone.resource.traversal import ResourceTraverser
from z3c.form.interfaces import IGroup
from z3c.form.widget import ComputedWidgetAttribute
from zExceptions import NotFound
from zope.component import adapter, getUtility
from zope.schema.interfaces import IVocabularyFactory
from zope.schema.vocabulary import SimpleVocabulary
from zope.schema.vocabulary import SimpleTerm

from plone.app.blocks.interfaces import ILayoutField
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.resource import AvailableLayoutsVocabulary
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_DEFAULT_LAYOUT
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_DEFAULT_DISPLAY
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_FILE_NAME
from plone.app.mosaic.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
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
    layout = absolute_path(aliases.get(CONTENT_LAYOUT_DEFAULT_DISPLAY,
                                       CONTENT_LAYOUT_DEFAULT_LAYOUT))

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
    layout = absolute_path(CONTENT_LAYOUT_DEFAULT_LAYOUT)
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

    vocab_factory = getUtility(IVocabularyFactory,
                               name='plone.availableContentLayouts')
    vocab = vocab_factory(context)

    items = []
    for term in vocab:
        layout = layouts.pop(term.value, None)
        if layout is not None:
            items.append(SimpleTerm(layout, layout, term.title))

    pc = getToolByName(context, 'portal_catalog')
    try:
        uids = pc._catalog.uids
    except AttributeError:
        return SimpleVocabulary(items)

    for key, value in layouts.items():
        rid = uids.get(key) or uids.get(key[:key.rfind('/')])
        if rid is not None:
            md = pc._catalog.getMetadataForRID(rid)
            items.append(SimpleTerm(
                value, value, unicode(md.get('Title') or key,
                                      'utf-8', 'ignore')))
    return SimpleVocabulary(items)
