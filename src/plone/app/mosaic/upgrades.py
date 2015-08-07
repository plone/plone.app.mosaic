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
