from plone.app.contenttypes.testing import PLONE_APP_CONTENTTYPES_FIXTURE
from plone.app.robotframework.testing import REMOTE_LIBRARY_BUNDLE_FIXTURE
from plone.app.testing import applyProfile
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PloneSandboxLayer
from plone.testing import zope

import plone.app.mosaic


class PloneAppMosaicLayer(PloneSandboxLayer):

    defaultBases = (PLONE_APP_CONTENTTYPES_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        self.loadZCML(package=plone.app.mosaic)

    def setUpPloneSite(self, portal):
        applyProfile(portal, "plone.app.mosaic:default")
        portal.portal_workflow.setDefaultChain("simple_publication_workflow")


PLONE_APP_MOSAIC_FIXTURE = PloneAppMosaicLayer()


PLONE_APP_MOSAIC_INTEGRATION = IntegrationTesting(
    bases=(PLONE_APP_MOSAIC_FIXTURE,), name="PloneAppMosaic:Integration"
)


PLONE_APP_MOSAIC_FUNCTIONAL = FunctionalTesting(
    bases=(PLONE_APP_MOSAIC_FIXTURE,), name="PloneAppMosaic:Functional"
)


PLONE_APP_MOSAIC_ACCEPTANCE = FunctionalTesting(
    bases=(
        PLONE_APP_MOSAIC_FIXTURE,
        REMOTE_LIBRARY_BUNDLE_FIXTURE,
        zope.WSGI_SERVER_FIXTURE,
    ),
    name="PloneAppMosaic:Acceptance",
)
