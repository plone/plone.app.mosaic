# -*- coding: utf-8 -*-
import logging

from plone import api
from plone.resource.traversal import ResourceTraverser
from zope.component import adapter
from zope.component import getUtility
from zope.component import queryMultiAdapter
from zope.component.hooks import getSite
from zope.globalrequest import getRequest
from zope.schema.interfaces import IVocabularyFactory
from zope.schema.vocabulary import SimpleVocabulary
from zope.schema.vocabulary import SimpleTerm

from plone.app.blocks.resource import AvailableLayoutsVocabulary
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


def absolute_path(path):
    """Return path prefixed with slash"""
    if not path.startswith('/'):
        path = '/' + path
    return path


def decode(s):
    if isinstance(s, unicode):
        return s
    else:
        return unicode(str(s), 'utf-8', 'ignore')


def encode(s):
    if isinstance(s, unicode):
        return s.encode('utf-8', 'ignore')
    else:
        return str(s)


@adapter(IVocabularyFactory)
def AvailableDisplayLayoutsVocabularyFactory(context):
    portal_type = getattr(context, 'portal_type', None)
    if portal_type is None:
        return SimpleVocabulary([])

    types_tool = api.portal.get_tool('portal_types')
    fti = getattr(types_tool, portal_type, None)
    if fti is None:
        return SimpleVocabulary([])

    aliases = fti.getMethodAliases() or {}
    layouts = dict([(absolute_path(item[1]), item[0])
                    for item in aliases.items()
                    if item[0].startswith('++layout++') and item[0]])

    vocab_factory = getUtility(IVocabularyFactory,
                               name='plone.availableContentLayouts')
    vocab = vocab_factory(context)

    items = []
    for term in vocab:
        layout = layouts.pop(term.value, None)
        if layout is not None:
            items.append(SimpleTerm(encode(layout), encode(layout),
                                    decode(term.title)))

    # Return if more layout candidates
    sorted_key = lambda value: (getattr(value, 'title', None) or u'').lower()
    if not layouts:
        return SimpleVocabulary(sorted(items, key=sorted_key))

    # Append programmatic @@-prefixed layouts
    request = getRequest()
    for key, value in layouts.items():
        if key.startswith('/@@'):  # '/' by absolute_path
            value = layouts.pop(key)
            name = key[3:].split('/')[0]
            adapter = queryMultiAdapter((context, request), name=name)
            if adapter:
                items.append(SimpleTerm(encode(value), encode(value),
                                        decode(value[10:].capitalize())))

    # Return if more layout candidates
    if not layouts:
        return SimpleVocabulary(sorted(items, key=sorted_key))

    # Append layouts from the content space
    pc = api.portal.get_tool('portal_catalog')
    site = getSite()
    try:
        uids = pc._catalog.uids
        base = '/'.join(site.getPhysicalPath())
    except AttributeError:
        return SimpleVocabulary(sorted(items, key=sorted_key))

    for key, value in layouts.items():
        rid = (uids.get(base + key) or uids.get(key)
               or uids.get(key[:key.rfind('/')]))
        if rid is not None:
            md = pc._catalog.getMetadataForRID(rid)
            items.append(SimpleTerm(encode(value), encode(value),
                                    decode(md.get('Title') or key)))

    return SimpleVocabulary(sorted(items, key=sorted_key))
