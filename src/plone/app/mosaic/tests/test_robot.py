# -*- coding: utf-8 -*- #
import unittest
import robotsuite

from plone.testing import layered
from plone.app.testing import ROBOT_TEST_LEVEL
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_ROBOT


def leveled(suite):
    suite.level = ROBOT_TEST_LEVEL
    return suite


def test_suite():
    suite = unittest.TestSuite()
    suite.addTests([
        layered(leveled(
            robotsuite.RobotTestSuite('robot'),
        ), layer=PLONE_APP_MOSAIC_ROBOT),
        layered(leveled(
            robotsuite.RobotTestSuite('robot',
                                      package='Products.CMFPlone.tests'),
        ), layer=PLONE_APP_MOSAIC_ROBOT),
    ])
    return suite