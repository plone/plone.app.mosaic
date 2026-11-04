from plone.app.mosaic.browser import main_template
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from unittest import mock

import unittest

LAYOUT = """<!DOCTYPE html>
<html>
<head><title>Layout</title></head>
<body><div data-panel="content"></div></body>
</html>"""


class SiteLayoutView:
    def index(self):
        return LAYOUT


class TestLayoutTemplate(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.portal = self.layer["portal"]
        self.request = self.layer["request"]

    def test_same_cooked_layout_compiles_once(self):
        cooked = main_template.cook_layout(LAYOUT, False)
        self.assertIs(
            main_template.layout_template(cooked),
            main_template.layout_template(cooked),
        )

    def test_layout_is_compiled_once_across_requests(self):
        with mock.patch.object(
            main_template, "getMultiAdapter", return_value=SiteLayoutView()
        ):
            first = main_template.MainTemplate(self.portal, self.request).layout
            second = main_template.MainTemplate(
                self.portal, self.request.clone()
            ).layout
        self.assertIs(first.__func__, second.__func__)
