from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from plone.browserlayer.utils import registered_layers
from plone.registry.interfaces import IRegistry
from Products.CMFPlone.utils import get_installer
from zope.component import getUtility

import unittest


PROJECTNAME = "plone.app.mosaic"

RECORDS = [
    "plone.app.mosaic.app_tiles.plone_app_standardtiles_html.available_actions",  # noqa: E501
    "plone.app.mosaic.default_available_actions",
    "plone.app.mosaic.default_omitted_fields",
    "plone.app.mosaic.default_widget_actions",
    "plone.app.mosaic.hidden_content_layouts",
]


class InstallTestCase(unittest.TestCase):

    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.portal = self.layer["portal"]

    def test_installed(self):
        if get_installer is None:
            qi = self.portal["portal_quickinstaller"]
        else:
            qi = get_installer(self.portal)
        self.assertTrue(qi.is_product_installed(PROJECTNAME))

    def test_addon_layer(self):
        layers = [layer.getName() for layer in registered_layers()]
        self.assertIn("IMosaicLayer", layers)

    def test_configlet(self):
        controlpanel = self.portal["portal_controlpanel"]
        action_ids = [a.id for a in controlpanel.listActions()]
        self.assertIn("mosaic-layout-editor", action_ids)

    def test_registry(self):
        registry = getUtility(IRegistry)
        for r in RECORDS:
            self.assertIn(r, registry)

        # TODO: check for records associated with interfaces

    def test_skins(self):
        skins = self.portal["portal_skins"]
        self.assertIn("mosaic", skins.getSkinSelections())


class UninstallTestCase(unittest.TestCase):

    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.portal = self.layer["portal"]
        if get_installer is None:
            self.qi = self.portal["portal_quickinstaller"]
        else:
            self.qi = get_installer(self.portal)
        self.qi.uninstall_product(PROJECTNAME)

    def test_uninstalled(self):
        self.assertFalse(self.qi.is_product_installed(PROJECTNAME))

    def test_addon_layer_removed(self):
        layers = [layer.getName() for layer in registered_layers()]
        self.assertNotIn("IMosaicLayer", layers)

    def test_configlet_removed(self):
        controlpanel = self.portal["portal_controlpanel"]
        action_ids = [a.id for a in controlpanel.listActions()]
        self.assertNotIn("mosaic-layout-editor", action_ids)

    def test_registry_cleaned(self):
        registry = getUtility(IRegistry)
        for r in RECORDS:
            self.assertNotIn(r, registry)

        # TODO: check for records associated with interfaces

    def test_skins_removed(self):
        skins = self.portal["portal_skins"]
        self.assertNotIn("mosaic", skins.getSkinSelections())
