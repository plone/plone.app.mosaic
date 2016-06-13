# -*- coding: utf-8 -*-
from plone.app.blocks.interfaces import CONTENT_LAYOUT_RESOURCE_NAME
from plone.app.blocks.interfaces import SITE_LAYOUT_RESOURCE_NAME
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.utils import getPersistentResourceDirectory
from plone.resource.manifest import MANIFEST_FILENAME
from StringIO import StringIO
from zope.component import getUtility
from zope.interface import alsoProvides
from zope.schema.interfaces import IVocabularyFactory


EXAMPLE_SITE_LAYOUT = """\
[sitelayout]
title = Plone layout (Custom)
description = Example site layout
file = site.html
"""

EXAMPLE_CONTENT_LAYOUT = """\
[contentlayout]
title = Basic (Custom)
description = Example content layout
file = basic.html
"""


def post_handler(context):
    portal = context.portal_url.getPortalObject()
    create_ttw_layout_examples(portal)


def create_ttw_site_layout_examples(portal):
    request = portal.REQUEST
    alsoProvides(request, IMosaicLayer)
    sitelayout = getPersistentResourceDirectory(SITE_LAYOUT_RESOURCE_NAME)
    custom = getPersistentResourceDirectory('custom', sitelayout)
    custom.writeFile(MANIFEST_FILENAME, StringIO(EXAMPLE_SITE_LAYOUT))
    custom.writeFile(
        'site.html',
        StringIO(
            resolveResource(
                '++sitelayout++default/default.html'
            ).encode('utf-8')
        )
    )


def create_ttw_content_layout_examples(portal):
    request = portal.REQUEST
    alsoProvides(request, IMosaicLayer)
    contentlayout = getPersistentResourceDirectory(
        CONTENT_LAYOUT_RESOURCE_NAME
    )
    custom = getPersistentResourceDirectory('custom', contentlayout)
    custom.writeFile(MANIFEST_FILENAME, StringIO(EXAMPLE_CONTENT_LAYOUT))
    custom.writeFile(
        'basic.html',
        StringIO(
            resolveResource(
                '++contentlayout++default/basic.html'
            ).encode('utf-8')
        )
    )


def create_ttw_layout_examples(portal):
    factory = getUtility(IVocabularyFactory, name='plone.availableSiteLayouts')
    vocab = factory(portal)
    if '++sitelayout++default/default.html' in vocab:
        create_ttw_site_layout_examples(portal)
    factory = getUtility(
        IVocabularyFactory,
        name='plone.availableContentLayouts'
    )
    vocab = factory(portal)
    if '/++contentlayout++default/basic.html' in vocab:
        create_ttw_content_layout_examples(portal)
