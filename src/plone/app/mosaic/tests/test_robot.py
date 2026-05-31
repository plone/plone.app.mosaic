from plone.app.mosaic.testing import PLONE_APP_MOSAIC_ACCEPTANCE
from plone.app.testing import ROBOT_TEST_LEVEL
from plone.testing import layered

import os
import robotsuite
import unittest


def test_suite():
    suite = unittest.TestSuite()
    current_dir = os.path.abspath(os.path.dirname(__file__))
    robot_dir = os.path.join(current_dir, "robot")
    robot_tests = [
        os.path.join("robot", doc)
        for doc in os.listdir(robot_dir)
        if doc.endswith(".robot") and doc.startswith("test_")
    ]
    robot_options = {}
    raw_options = os.environ.get("ROBOT_OPTIONS", "").split()
    for i in range(len(raw_options)):
        if raw_options[i] == "--include" and i + 1 < len(raw_options):
            robot_options["include"] = [raw_options[i + 1]]
        elif raw_options[i] == "--outputdir" and i + 1 < len(raw_options):
            robot_options["outputdir"] = raw_options[i + 1]

    for robot_test in robot_tests:
        robottestsuite = robotsuite.RobotTestSuite(
            robot_test, robot_options=robot_options
        )
        robottestsuite.level = ROBOT_TEST_LEVEL
        suite.addTests(
            [
                layered(
                    robottestsuite,
                    layer=PLONE_APP_MOSAIC_ACCEPTANCE,
                ),
            ]
        )
    return suite
