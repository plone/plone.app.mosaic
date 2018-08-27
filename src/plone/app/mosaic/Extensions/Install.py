# -*- coding: utf-8 -*-


def uninstall(portal, reinstall=False):
    from Products.CMFCore.utils import getToolByName
    if not reinstall:
        profile = 'profile-plone.app.mosaic:uninstall'
        setup_tool = getToolByName(portal, 'portal_setup')
        setup_tool.runAllImportStepsFromProfile(profile)
        return 'Ran all uninstall steps.'
