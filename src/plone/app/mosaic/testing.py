# -*- coding: utf-8 -*-
from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import IntegrationTesting
from plone.app.testing import FunctionalTesting
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import applyProfile
from zope.configuration import xmlconfig


class PloneAppMosaic(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        # Load ZCML
        import plone.app.mosaic
        xmlconfig.file('configure.zcml',
                       plone.app.mosaic,
                       context=configurationContext)

        import plone.app.blocks
        xmlconfig.file('configure.zcml',
                       plone.app.blocks,
                       context=configurationContext)

        import plone.app.dexterity
        xmlconfig.file('configure.zcml',
                       plone.app.dexterity,
                       context=configurationContext)

        import plone.app.tiles
        xmlconfig.file('configure.zcml',
                       plone.app.tiles,
                       context=configurationContext)

        import plone.app.contenttypes
        xmlconfig.file('configure.zcml',
                       plone.app.contenttypes,
                       context=configurationContext)

    def setUpPloneSite(self, portal):
        # Install into Plone site using portal_setup
        applyProfile(portal, 'plone.app.mosaic:default')
        applyProfile(portal, 'plone.app.mosaic:bbb')


PLONE_APP_MOSAIC = PloneAppMosaic()
PLONE_APP_MOSAIC_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_INTEGRATION")

PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_FUNCTIONAL")
