# -*- coding: utf-8 -*- #
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_ROBOT
from plone.app.testing import ROBOT_TEST_LEVEL
from plone.testing import layered

import robotsuite
import unittest


def leveled(suite):
    suite.level = ROBOT_TEST_LEVEL
    return suite


def test_suite():
    suite = unittest.TestSuite()
    suite.addTests([
        layered(
            leveled(robotsuite.RobotTestSuite('robot')),
            layer=PLONE_APP_MOSAIC_ROBOT
        ),
        layered(
            leveled(
                robotsuite.RobotTestSuite(
                    'robot',
                    package='Products.CMFPlone.tests'
                ),
            ),
            layer=PLONE_APP_MOSAIC_ROBOT
        ),
    ])
    return suite
