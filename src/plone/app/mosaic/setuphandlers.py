# -*- coding: utf-8 -*-


def step_setup_various(context):
    if context.readDataFile('plone.app.mosaic_default.txt') is None:
        return
    portal = context.getSite()
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
        aliases['++layout++default'] = '/++contentlayout++default/content.html'
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
