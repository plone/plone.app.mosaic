# -*- coding: utf-8 -*-
from plone.resource.traversal import ResourceTraverser

from plone.app.blocks.resource import AvailableLayoutsVocabulary
from plone.app.mosaic.interfaces import (
    PAGE_LAYOUT_MANIFEST_FORMAT,
    PAGE_LAYOUT_FILE_NAME,
    PAGE_LAYOUT_RESOURCE_NAME
)


class PageLayoutTraverser(ResourceTraverser):
    """The page layout traverser.

    Allows traveral to /++pagelayout++<name> using ``plone.resource`` to fetch
    things stored either on the filesystem or in the ZODB.
    """

    name = PAGE_LAYOUT_RESOURCE_NAME


AvailablePageLayoutsVocabularyFactory = AvailableLayoutsVocabulary(
    PAGE_LAYOUT_MANIFEST_FORMAT,
    PAGE_LAYOUT_FILE_NAME,
)
