# -*- coding: utf-8 -*-
from plone.app.testing import PloneWithPackageLayer
from plone.app.testing import IntegrationTesting
from plone.app.testing import FunctionalTesting

import plone.app.mosaic


PLONE_APP_MOSAIC = PloneWithPackageLayer(
    zcml_package=plone.app.mosaic,
    zcml_filename='testing.zcml',
    gs_profile_id='plone.app.mosaic:testing',
    name="PLONE_APP_MOSAIC")

PLONE_APP_MOSAIC_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_INTEGRATION")

PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC, ),
    name="PLONE_APP_MOSAIC_FUNCTIONAL")
