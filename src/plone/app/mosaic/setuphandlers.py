# -*- coding: utf-8 -*-
from Products.CMFCore.utils import getToolByName
import pkg_resources

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
    if HAS_PLONE_APP_CONTENTTYPES:
        if getattr(getattr(portal, 'front-page', None),
                   'meta_type', None) == 'ATDocument':
            # For a new site, import also PAC default content
            profile_name = 'profile-plone.app.contenttypes:plone-content'
        else:
            # For an old site, just install PAC without any migration
            profile_name = 'profile-plone.app.contenttypes:default'
        import_profile(portal, profile_name)
        enable_layout_behavior(portal)


def enable_layout_behavior(portal):
    types_tool = portal.portal_types

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]
    for fti in dx_ftis:

        # Enable layout aware behavior for all types
        behaviors = [i for i in fti.behaviors]
        behaviors.extend([
            'plone.app.blocks.layoutbehavior.ILayoutAware',
        ])
        behaviors = tuple(set(behaviors))
        fti._updateProperty('behaviors', behaviors)

        # Set the default content layout for all types
        aliases = fti.getMethodAliases() or {}
        aliases['++layout++default'] = '++contentlayout++default/content.html'
        fti.setMethodAliases(aliases)

        # Set the default view method
        view_methods = [i for i in fti.view_methods]
        view_methods.append('view')
        fti.view_methods = list(set(view_methods))


def enable_layout_view(portal):
    types_tool = portal.portal_types

    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]
    for fti in dx_ftis:
        if fti.getId() in ['Document']:
            fti.default_view = 'view'


def import_profile(portal, profile_name):
    setup_tool = getToolByName(portal, 'portal_setup')
    if not setup_tool.getProfileImportDate(profile_name):
        setup_tool.runAllImportStepsFromProfile(profile_name)
