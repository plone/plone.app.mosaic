# -*- coding: utf-8 -*-
from Products.CMFCore.utils import getToolByName
from plone import api
from plone.app.mosaic.setuphandlers import create_ttw_layout_examples

PROFILE_ID = 'profile-plone.app.mosaic:default'


def upgrade_1_to_2(context):
    qi = getToolByName(context, 'portal_quickinstaller')
    qi.reinstallProducts(['plone.app.standardtiles'])

    create_ttw_layout_examples(api.portal.get())


def upgrade_2_to_3(context):
    create_ttw_layout_examples(api.portal.get())


def upgrade_3_to_4(context):
    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')
    setup.runImportStepFromProfile(PROFILE_ID, 'controlpanel')


def upgrade_4_to_5(context):
    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')


def upgrade_5_to_6(context):
    from plone.registry.interfaces import IRegistry
    from zope.component import getUtility

    registry = getUtility(IRegistry)
    for key in tuple(registry.records):
        if key.startswith('plone.app.mosaic.format'):
            del registry.records[key]
        elif key.startswith('plone.app.mosaic.tinymce'):
            del registry.records[key]

    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')


def upgrade_6_to_7(context):
    qi = getToolByName(context, 'portal_quickinstaller')
    qi.reinstallProducts(['plone.app.standardtiles'])

    create_ttw_layout_examples(api.portal.get())


def upgrade_7_to_8(context):
    from plone.registry.interfaces import IRegistry
    from zope.component import getUtility

    registry = getUtility(IRegistry)
    for key in tuple(registry.records):
        if key.startswith('plone.app.mosaic.tinymce'):
            del registry.records[key]

    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')

    qi = getToolByName(context, 'portal_quickinstaller')
    qi.reinstallProducts(['plone.app.standardtiles'])

    create_ttw_layout_examples(api.portal.get())


def upgrade_8_to_9(context):
    portal = api.portal.get()
    types_tool = getToolByName(context, 'portal_types')

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]
    for fti in dx_ftis:
        behaviors = [i for i in fti.behaviors]
        if 'plone.app.blocks.layoutbehavior.ILayoutAware' not in behaviors:
            continue

        # Add Mosaic view into available view methods
        view_methods = [i for i in fti.getAvailableViewMethods(portal)]
        view_methods.append('layout_view')
        if 'view' in view_methods:
            view_methods.remove('view')
        fti.view_methods = list(set(view_methods))

        if fti.default_view == 'view':
            fti.default_view = 'layout_view'

    # Re-import registry configuration
    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')


def upgrade_9_to_10(context):
    from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault

    types_tool = getToolByName(context, 'portal_types')
    pc = getToolByName(context, 'portal_catalog')

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, 'behaviors', False)]
    for fti in dx_ftis:
        behaviors = [i for i in fti.behaviors]
        if 'plone.app.blocks.layoutbehavior.ILayoutAware' not in behaviors:
            continue

        results = pc.unrestrictedSearchResults(portal_type=fti.id)
        for brain in results:
            ob = brain._unrestrictedGetObject()
            ob_default = ISelectableBrowserDefault(ob, None)
            if ob_default is None:
                continue
            if ob_default.getLayout() in ['view', '@@view']:
                ob_default.setLayout('layout_view')


def upgrade_10_to_11(context):
    from plone.registry.interfaces import IRegistry
    from zope.component import getUtility

    registry = getUtility(IRegistry)

    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')


def upgrade_11_to_12(context):
    from plone.registry.interfaces import IRegistry
    from zope.component import getUtility

    registry = getUtility(IRegistry)

    setup = getToolByName(context, 'portal_setup')
    setup.runImportStepFromProfile(PROFILE_ID, 'plone.app.registry')
