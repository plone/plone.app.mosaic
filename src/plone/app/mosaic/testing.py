# -*- coding: utf-8 -*-
from plone.app.robotframework.testing import REMOTE_LIBRARY_BUNDLE_FIXTURE
from plone.app.testing import applyProfile
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import PloneWithPackageLayer
from plone.testing import z2
from zope.configuration import xmlconfig

import plone.app.mosaic


class PloneAppMosaicLayer(PloneWithPackageLayer):

    def setUpPloneSite(self, portal):
        super(PloneAppMosaicLayer, self).setUpPloneSite(portal)
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")


class PloneAppMosaicDexterityLayer(PloneSandboxLayer):
    defaultBases = (PLONE_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        import plone.app.contenttypes
        self.loadZCML(package=plone.app.contenttypes)

        import plone.app.mosaic
        xmlconfig.file('configure.zcml', plone.app.mosaic,
                       context=configurationContext)

    def setUpPloneSite(self, portal):
        super(PloneAppMosaicDexterityLayer, self).setUpPloneSite(portal)
        applyProfile(portal, 'plone.app.contenttypes:default')
        applyProfile(portal, 'plone.app.mosaic:default')
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")


PLONE_APP_MOSAIC_DEXTERITY = PloneAppMosaicDexterityLayer(
    bases=(PLONE_FIXTURE,),
    name='PLONE_APP_MOSAIC_DEXTERITY')

PLONE_APP_MOSAIC = PloneAppMosaicLayer(
    bases=(PLONE_FIXTURE,),
    name='PLONE_APP_MOSAIC',
    gs_profile_id='plone.app.mosaic:default',
    zcml_package=plone.app.mosaic,
    zcml_filename='configure.zcml'
)

PLONE_APP_MOSAIC_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name='PLONE_APP_MOSAIC_INTEGRATION')


PLONE_APP_MOSAIC_DEXTERITY_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC_DEXTERITY, ),
    name='PLONE_APP_MOSAIC_DEXTERITY_INTEGRATION')


PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name='PLONE_APP_MOSAIC_FUNCTIONAL')

PLONE_APP_MOSAIC_ROBOT = FunctionalTesting(
    bases=(REMOTE_LIBRARY_BUNDLE_FIXTURE,
           PLONE_APP_MOSAIC, z2.ZSERVER_FIXTURE),
    name='PLONE_APP_MOSAIC_ROBOT')
