from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from plone.app.mosaic.widget import LayoutWidget
from z3c.form.interfaces import IFieldWidget
from zope.component import getMultiAdapter

import plone.api
import unittest


class TestLayoutWidget(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.request = self.layer["request"]

    def test_layout_widget_is_registered_for_layer(self):
        widget = getMultiAdapter(
            (ILayoutAware["customContentLayout"], self.request), IFieldWidget
        )
        self.assertIsInstance(widget, LayoutWidget)

    def test_pattern_options__pattern(self):
        widget = getMultiAdapter(
            (ILayoutAware["customContentLayout"], self.request), IFieldWidget
        )

        # Test pattern name
        self.assertEqual(widget.pattern, "layout")

    def test_pattern_options__settings(self):
        widget = getMultiAdapter(
            (ILayoutAware["customContentLayout"], self.request), IFieldWidget
        )

        # get_options need a context on the widget.
        widget.context = self.layer["portal"]
        options = widget.get_options()["data"]

        # Test default disable_edit_bar value
        self.assertIn("disable_edit_bar", options)
        self.assertEqual(options["disable_edit_bar"], True)

        # Test setting disable_edit_bar to False
        plone.api.portal.set_registry_record(
            name="plone.app.mosaic.settings.disable_edit_bar", value=False
        )
        options = widget.get_options()["data"]
        self.assertEqual(options["disable_edit_bar"], False)
