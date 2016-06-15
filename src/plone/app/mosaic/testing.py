# -*- coding: utf-8 -*-
from plone.app.robotframework.testing import REMOTE_LIBRARY_BUNDLE_FIXTURE
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PLONE_FIXTURE
from plone.app.testing import PloneWithPackageLayer
from plone.testing import z2

import plone.app.mosaic


class PloneAppMosaicLayer(PloneWithPackageLayer):

    def setUpPloneSite(self, portal):
        super(PloneAppMosaicLayer, self).setUpPloneSite(portal)
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")


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

PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name='PLONE_APP_MOSAIC_FUNCTIONAL')

PLONE_APP_MOSAIC_ROBOT = FunctionalTesting(
    bases=(REMOTE_LIBRARY_BUNDLE_FIXTURE,
           PLONE_APP_MOSAIC, z2.ZSERVER_FIXTURE),
    name='PLONE_APP_MOSAIC_ROBOT')
