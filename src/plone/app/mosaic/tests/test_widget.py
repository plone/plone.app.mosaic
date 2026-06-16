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

        # Test pattern name (default disabled)
        self.assertEqual(widget.pattern, "layout-disabled")

        # enable "layout_view" on widget context
        widget.context = self.layer["portal"]
        widget.context.setLayout("layout_view")
        self.assertEqual(widget.pattern, "layout")

    def test_pattern_disabled_in_display_mode(self):
        # When the widget is rendered in display or hidden mode (e.g. inside
        # @@content-core / @@version-view / versions_history_form) the Mosaic
        # editor must not be enabled, otherwise the `pat-layout` editor markup
        # is emitted and its JavaScript throws on a non-editable element.
        from zope.annotation.interfaces import IAnnotations

        widget = getMultiAdapter(
            (ILayoutAware["customContentLayout"], self.request), IFieldWidget
        )
        widget.context = self.layer["portal"]
        widget.context.setLayout("layout_view")

        # `enabled` is memoized on the request without the mode in its key, so
        # reset the cache before checking each mode.
        annotations = IAnnotations(self.request)

        # Input mode: editor enabled.
        annotations["plone.memoize"] = {}
        widget.mode = "input"
        self.assertEqual(widget.pattern, "layout")

        # Display mode: editor disabled -> "layout-disabled" (no .pat-layout
        # trigger, so the editor JS is never initialized).
        annotations["plone.memoize"] = {}
        widget.mode = "display"
        self.assertEqual(widget.pattern, "layout-disabled")
        self.assertFalse(widget.enabled)
        self.assertEqual(widget.get_pattern_options(), {})

    def test_pattern_options__settings(self):
        widget = getMultiAdapter(
            (ILayoutAware["customContentLayout"], self.request), IFieldWidget
        )

        # get_options need a context with the proper layout view on the widget.
        widget.context = self.layer["portal"]
        widget.context.setLayout("layout_view")
        options = widget.get_pattern_options()

        # Test default disable_edit_bar value
        self.assertIn("disable_edit_bar", options)
        self.assertEqual(options["disable_edit_bar"], True)

        # Test setting disable_edit_bar to False
        plone.api.portal.set_registry_record(
            name="plone.app.mosaic.settings.disable_edit_bar", value=False
        )
        # Clear per-request parseRegistry cache so the new value is picked up
        self.request.environ.pop("plone.app.mosaic.parseRegistry", None)
        options = widget.get_pattern_options()
        self.assertEqual(options["disable_edit_bar"], False)
