"""Tests for MosaicRegistry.mapTiles().

See https://github.com/plone/plone.app.mosaic/issues/651: tiles such as
plone.app.standardtiles.discussion register their <plone:tile /> directive
behind a zcml:condition (they only exist for real when the add-on that
provides them, e.g. plone.app.discussion, is installed). The registry entry
that drives the "Insert" tile picker has no such condition though, so
without this filter a site that never installed plone.app.discussion still
offers the Discussion tile in the picker; clicking it produces a 404.
"""

from plone.app.mosaic.registry import MosaicRegistry
from plone.tiles.interfaces import ITileType
from plone.tiles.type import TileType
from zope.component import getGlobalSiteManager
from zope.component.testing import setUp
from zope.component.testing import tearDown

import unittest


class TestMapTiles(unittest.TestCase):
    def setUp(self):
        setUp()
        gsm = getGlobalSiteManager()
        available = TileType(
            "plone.app.mosaic.tests.available",
            "Available tile",
            "cmf.ModifyPortalContent",
            "zope2.View",
        )
        gsm.registerUtility(
            available, ITileType, name="plone.app.mosaic.tests.available"
        )

    def tearDown(self):
        tearDown()

    def _config(self):
        return {
            "tiles": [
                {"name": "applications", "label": "Applications", "tiles": []},
            ]
        }

    def _settings(self):
        return {
            "plone.app.mosaic.app_tiles": {
                "available_entry": {
                    "name": "plone.app.mosaic.tests.available",
                    "category": "applications",
                    "weight": 10,
                },
                "uninstalled_entry": {
                    "name": "plone.app.mosaic.tests.uninstalled",
                    "category": "applications",
                    "weight": 20,
                },
            }
        }

    def test_tile_without_a_registered_type_is_not_listed(self):
        # "uninstalled_entry" mimics a registry record left over for a tile
        # whose actual <plone:tile /> registration is gated by a
        # zcml:condition that isn't met (e.g. discussion tile without
        # plone.app.discussion installed): no ITileType utility exists for
        # it, so it must not show up in the Insert menu.
        adapter = MosaicRegistry(None)
        config = adapter.mapTiles(self._settings(), self._config(), "app_tiles")
        names = [tile["name"] for tile in config["tiles"][0]["tiles"]]
        self.assertNotIn("plone.app.mosaic.tests.uninstalled", names)

    def test_tile_with_a_registered_type_is_still_listed(self):
        adapter = MosaicRegistry(None)
        config = adapter.mapTiles(self._settings(), self._config(), "app_tiles")
        names = [tile["name"] for tile in config["tiles"][0]["tiles"]]
        self.assertIn("plone.app.mosaic.tests.available", names)
