# -*- coding: utf-8 -*-
from plone import api
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION

import unittest2 as unittest


class TestExample(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.app = self.layer['app']
        self.portal = self.layer['portal']
        self.qi_tool = api.portal.get_tool('portal_quickinstaller')

    def test_product_is_installed(self):
        """ Validate that our products GS profile has been run and the product
            installed
        """
        pid = 'plone.app.mosaic'
        installed = [p['id'] for p in self.qi_tool.listInstalledProducts()]
        self.assertTrue(pid in installed,
                        'package appears not to have been installed')
