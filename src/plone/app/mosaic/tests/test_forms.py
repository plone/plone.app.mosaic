# -*- coding: utf-8 -*-
from plone.app.testing import TEST_USER_ID
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_NAME
from plone.app.testing import login
from Products.CMFCore.utils import getToolByName
from zope.component import queryMultiAdapter
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_DEXTERITY_INTEGRATION

import unittest2 as unittest


class TestAddForm(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_DEXTERITY_INTEGRATION

    def setUp(self):
        self.app = self.layer['app']
        self.portal = self.layer['portal']
        self.request = self.layer['request']
        setRoles(self.portal, TEST_USER_ID, ('Member', 'Manager'))

    def _get_add_view(self, container, name):
        ttool = getToolByName(self.portal, 'portal_types')
        ti = ttool.getTypeInfo(name)
        add_view = queryMultiAdapter((container, self.request, ti),
                                     name=ti.factory)
        if add_view is None:
            add_view = queryMultiAdapter((container, self.request, ti))
        add_view.__name__ = ti.factory
        return add_view.__of__(container)

    def test_add_form_removes_groups(self):
        login(self.portal, TEST_USER_NAME)
        view = self._get_add_view(self.portal, 'Document')
        view.form_instance.updateFieldsFromSchemata()
        self.assertEqual(len(view.form_instance.groups), 0)
        self.assertEqual(len(view.form_instance.fields), 2)

    def test_add_form_does_not_affect_non_layout_aware(self):
        login(self.portal, TEST_USER_NAME)
        view = self._get_add_view(self.portal, 'Link')
        view.form_instance.updateFieldsFromSchemata()
        self.assertNotEqual(len(view.form_instance.groups), 0)
        self.assertNotEqual(len(view.form_instance.fields), 2)
