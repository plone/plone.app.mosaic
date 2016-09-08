# -*- coding: utf-8 -*-
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from plone.app.mosaic.widget import LayoutWidget
from z3c.form.interfaces import IFieldWidget
from zope.component import getMultiAdapter
import unittest2 as unittest


class TestLayoutWidget(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.request = self.layer['request']

    def test_layout_widget_is_registered_for_layer(self):
        widget = getMultiAdapter(
            (ILayoutAware['customContentLayout'], self.request),
            IFieldWidget
        )
        self.assertIsInstance(widget, LayoutWidget)
