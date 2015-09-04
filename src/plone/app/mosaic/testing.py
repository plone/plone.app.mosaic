# -*- coding: utf-8 -*-
from Products.CMFPlone.testing import PRODUCTS_CMFPLONE_ROBOT_REMOTE_LIBRARY_FIXTURE  # noqa
from ZPublisher import HTTPResponse
from plone.app.mosaic.interfaces import HAVE_PLONE_5
from plone.app.robotframework.testing import REMOTE_LIBRARY_BUNDLE_FIXTURE
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import applyProfile
from plone.testing import z2
from zope.configuration import xmlconfig
from zope.globalrequest import clearRequest
from zope.globalrequest import setRequest


class PloneAppMosaic(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        # Fix subrequest not fallbacking to wrong encoding in test environment:
        HTTPResponse.default_encoding = 'utf-8'

        # Load ZCML
        import plone.app.dexterity
        xmlconfig.file('configure.zcml',
                       plone.app.dexterity,
                       context=configurationContext)

        # prepare installing plone.app.contenttypes
        z2.installProduct(app, 'Products.DateRecurringIndex')

        import plone.app.contenttypes
        xmlconfig.file('configure.zcml',
                       plone.app.contenttypes,
                       context=configurationContext)

        import plone.app.blocks
        xmlconfig.file('configure.zcml',
                       plone.app.blocks,
                       context=configurationContext)

        import plone.app.tiles
        xmlconfig.file('configure.zcml',
                       plone.app.tiles,
                       context=configurationContext)

        import plone.app.standardtiles
        xmlconfig.file('configure.zcml',
                       plone.app.standardtiles,
                       context=configurationContext)

        import plone.app.mosaic
        xmlconfig.file('configure.zcml',
                       plone.app.mosaic,
                       context=configurationContext)

        # Import bbb profile only on Plone 4 without main_template view
        if not HAVE_PLONE_5:
            import plone.app.mosaic.browser.bbb
            xmlconfig.file('configure.zcml',
                           plone.app.mosaic.browser.bbb,
                           context=configurationContext)

    def setUpPloneSite(self, portal):
        # Configure five.globalrequest
        portal.REQUEST['PARENTS'] = [portal.__parent__]
        setRequest(portal.REQUEST)

        # Set the default workflow
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")

        # Install into Plone site using portal_setup
        applyProfile(portal, 'plone.app.contenttypes:default')
        if not HAVE_PLONE_5:
            applyProfile(portal, 'plone.app.widgets:default')
        applyProfile(portal, 'plone.app.mosaic:default')
        if not HAVE_PLONE_5:
            applyProfile(portal, 'plone.app.mosaic:bbb')

        # Clear globalrequest
        clearRequest()


PLONE_APP_MOSAIC = PloneAppMosaic()
PLONE_APP_MOSAIC_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_INTEGRATION")

PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_FUNCTIONAL")

PLONE_APP_MOSAIC_ROBOT = FunctionalTesting(
    bases=(REMOTE_LIBRARY_BUNDLE_FIXTURE,
           PLONE_APP_MOSAIC, z2.ZSERVER_FIXTURE),
    name="PLONE_APP_MOSAIC_ROBOT")


class PloneAppMosaicNoPAC(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        # Fix subrequest not fallbacking to wrong encoding in test environment:
        HTTPResponse.default_encoding = 'utf-8'

        # Load ZCML
        import plone.app.dexterity
        xmlconfig.file('configure.zcml',
                       plone.app.dexterity,
                       context=configurationContext)

        import plone.app.blocks
        xmlconfig.file('configure.zcml',
                       plone.app.blocks,
                       context=configurationContext)

        import plone.app.tiles
        xmlconfig.file('configure.zcml',
                       plone.app.tiles,
                       context=configurationContext)

        import plone.app.standardtiles
        xmlconfig.file('configure.zcml',
                       plone.app.standardtiles,
                       context=configurationContext)

        import plone.app.mosaic
        xmlconfig.file('configure.zcml',
                       plone.app.mosaic,
                       context=configurationContext)

        import plone.app.mosaic.browser.bbb
        xmlconfig.file('configure.zcml',
                       plone.app.mosaic.browser.bbb,
                       context=configurationContext)

    def setUpPloneSite(self, portal):
        # Configure five.globalrequest
        portal.REQUEST['PARENTS'] = [portal.__parent__]
        setRequest(portal.REQUEST)

        # Set the default workflow
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")

        # Install into Plone site using portal_setup
        applyProfile(portal, 'plone.app.mosaic:default')
        applyProfile(portal, 'plone.app.mosaic:bbb')

        ## This was a bad idea, because we want to run CMFPlone tests
        # enable_layout_view(portal)

        # Clear globalrequest
        clearRequest()

PLONE_APP_MOSAIC_NO_PAC = PloneAppMosaicNoPAC()

PLONE_APP_MOSAIC_NO_PAC_ROBOT = FunctionalTesting(
    bases=(PRODUCTS_CMFPLONE_ROBOT_REMOTE_LIBRARY_FIXTURE,
           PLONE_APP_MOSAIC_NO_PAC, z2.ZSERVER_FIXTURE),
    name="PLONE_APP_MOSAIC_ROBOT")
