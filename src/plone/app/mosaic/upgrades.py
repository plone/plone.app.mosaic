# -*- coding: utf-8 -*-
from Products.CMFCore.utils import getToolByName
from plone import api
from plone.app.mosaic.setuphandlers import create_ttw_layout_examples


def upgrade_1_to_2(context):
    qi = getToolByName(context, 'portal_quickinstaller')
    qi.reinstallProducts(['plone.app.standardtiles'])

    create_ttw_layout_examples(api.portal.get())
