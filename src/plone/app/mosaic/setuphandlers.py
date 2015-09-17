# -*- coding: utf-8 -*-
from StringIO import StringIO

import pkg_resources
from zExceptions import NotFound
from zope.schema.interfaces import IVocabularyFactory
from plone import api
from plone.app.blocks.interfaces import CONTENT_LAYOUT_RESOURCE_NAME
from plone.app.blocks.interfaces import IBlocksSettings
from plone.app.blocks.interfaces import SITE_LAYOUT_RESOURCE_NAME
from plone.app.blocks.utils import resolveResource
from plone.app.mosaic.interfaces import HAVE_PLONE_5
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.utils import getPersistentResourceDirectory
from plone.registry.interfaces import IRegistry
from plone.resource.manifest import MANIFEST_FILENAME
from zope.component import getUtility
from zope.globalrequest import getRequest
from zope.interface import alsoProvides

try:
    pkg_resources.get_distribution('plone.app.widgets')
except pkg_resources.DistributionNotFound:
    HAS_PLONE_APP_WIDGETS = False
else:
    HAS_PLONE_APP_WIDGETS = True

try:
    pkg_resources.get_distribution('plone.app.contenttypes')
except pkg_resources.DistributionNotFound:
    HAS_PLONE_APP_CONTENTTYPES = False
else:
    HAS_PLONE_APP_CONTENTTYPES = True


def step_setup_various(context):
    if context.readDataFile('plone.app.mosaic_default.txt') is None:
        return
    portal = context.getSite()
    if HAS_PLONE_APP_WIDGETS:
        try:
            import_profile(portal, 'profile-plone.app.widgets:default')
        except KeyError:
            pass
    if HAS_PLONE_APP_CONTENTTYPES:
        if getattr(getattr(portal, 'front-page', None),
                   'meta_type', None) == 'ATDocument':
            # For a new site, import also PAC default content
            profile_name = 'profile-plone.app.contenttypes:plone-content'
        else:
            # For an old site, just install PAC without any migration
            profile_name = 'profile-plone.app.contenttypes:default'
        try:
            import_profile(portal, profile_name)
            enable_layout_behavior(portal)
        except KeyError:
            pass
        if not HAVE_PLONE_5:
            try:
                import_profile(portal, 'profile-plone.app.event.bbb:default')
            except KeyError:
                pass
        else:
            registry = getUtility(IRegistry)
            block_settings = registry.forInterface(IBlocksSettings)
            block_settings.default_grid_system = 'bs3'
    create_ttw_layout_examples(portal)


def enable_layout_behavior(portal):
    types_tool = portal.portal_types

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]
    for fti in dx_ftis:
        # Only enable for selected default types
        if fti.getId() not in ['Document', 'Event', 'Folder', 'News Item']:
            continue

        # Enable layout aware behavior for all types
        behaviors = [i for i in fti.behaviors]
        behaviors.extend([
            'plone.app.blocks.layoutbehavior.ILayoutAware',
            'plone.app.drafts.interfaces.IDraftable',
        ])
        behaviors = tuple(set(behaviors))
        fti._updateProperty('behaviors', behaviors)

        # Add Mosaic view into available view methods
        view_methods = [i for i in fti.getAvailableViewMethods(portal)]
        view_methods.append('layout_view')
        fti.view_methods = list(set(view_methods))


def enable_layout_view(portal):
    types_tool = portal.portal_types

    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]

    for fti in dx_ftis:
        if fti.getId() in ['Document']:
            fti.default_view = 'layout_view'


def create_ttw_site_layout_examples(portal):
    request = getRequest()
    alsoProvides(request, IMosaicLayer)

    sitelayout = getPersistentResourceDirectory(SITE_LAYOUT_RESOURCE_NAME)
    custom = getPersistentResourceDirectory('custom', sitelayout)
    custom.writeFile(MANIFEST_FILENAME, StringIO("""\
[sitelayout]
title = Plone layout (Custom)
description = Example site layout
file = site.html
"""))
    custom.writeFile(
        'site.html',
        StringIO(resolveResource('++sitelayout++default/default.html')
                 .encode('utf-8'))
    )


def create_ttw_content_layout_examples(portal):
    request = getRequest()
    alsoProvides(request, IMosaicLayer)

    contentlayout = getPersistentResourceDirectory(CONTENT_LAYOUT_RESOURCE_NAME)
    custom = getPersistentResourceDirectory('custom', contentlayout)
    custom.writeFile(MANIFEST_FILENAME, StringIO("""\
[contentlayout]
title = Basic (Custom)
description = Example content layout
file = basic.html
"""))
    custom.writeFile(
        'basic.html',
        StringIO(resolveResource('++contentlayout++default/basic.html')
                 .encode('utf-8'))
    )


def create_ttw_layout_examples(portal):
    factory = getUtility(IVocabularyFactory, name="plone.availableSiteLayouts")
    vocab = factory(portal)
    if '++sitelayout++default/default.html' in vocab:
        create_ttw_site_layout_examples(portal)


def import_profile(portal, profile_name):
    setup_tool = api.portal.get_tool('portal_setup')
    if not setup_tool.getProfileImportDate(profile_name):
        setup_tool.runAllImportStepsFromProfile(profile_name)
