from AccessControl import Unauthorized
from plone.app.blocks.interfaces import CONTENT_LAYOUT_RESOURCE_NAME
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from plone.app.testing import login
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.resource.utils import queryResourceDirectory

import unittest


class TestManageLayouts(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def setUp(self):
        self.request = self.layer["request"]
        self.portal = self.layer["portal"]

    def test_manager_can_save_global_layout(self):
        self.request.form.update(
            {
                "action": "save",
                "name": "my-layout",
                "global": "true",
                "layout": "<html><body>foobar</body></html>",
            }
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()
        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, "custom"
        )
        self.assertEqual(
            str(layout_resources["my-layout.html"]), "<html><body>foobar</body></html>"
        )

    def test_manager_can_delete_global_layout(self):
        self.request.form.update(
            {"action": "deletelayout", "layout": "custom/basic.html"}
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()
        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, "custom"
        )
        self.assertTrue("basic.html" not in layout_resources.listDirectory())

    def test_manager_can_delete_user_layout(self):
        # first, add layout
        self.request.form.update(
            {
                "action": "save",
                "name": "my-layout",
                "global": "false",
                "layout": "<html><body>foobar</body></html>",
            }
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()

        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, "custom"
        )

        user_directory = layout_resources[f"user-layouts/{TEST_USER_ID:s}"]  # noqa
        self.assertTrue("my-layout.html" in user_directory.listDirectory())

        # now try to delete user layout
        self.request.form.update(
            {
                "action": "deletelayout",
                "layout": f"custom/user-layouts/{TEST_USER_ID:s}/my-layout.html",  # noqa
            }
        )
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()
        self.assertTrue("my-layout.html" not in user_directory.listDirectory())

    def test_editor_can_add_user_layout(self):
        self.request.form.update(
            {
                "action": "save",
                "name": "my-layout",
                "global": "false",
                "layout": "<html><body>foobar</body></html>",
            }
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Editor"])
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()

        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, "custom"
        )

        user_directory = layout_resources["user-layouts/" + TEST_USER_ID]
        self.assertTrue("my-layout.html" in user_directory.listDirectory())

    def test_editor_can_delete_user_layout(self):
        # first, add layout
        self.request.form.update(
            {
                "action": "save",
                "name": "my-layout",
                "global": "false",
                "layout": "<html><body>foobar</body></html>",
            }
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Editor"])
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()

        layout_resources = queryResourceDirectory(
            CONTENT_LAYOUT_RESOURCE_NAME, "custom"
        )

        user_directory = layout_resources["user-layouts/" + TEST_USER_ID]
        self.assertTrue("my-layout.html" in user_directory.listDirectory())

        # now try to delete user layout
        self.request.form.update(
            {
                "action": "deletelayout",
                "layout": f"custom/user-layouts/{TEST_USER_ID:s}/my-layout.html",  # noqa
            }
        )
        self.portal.restrictedTraverse("@@manage-layouts-from-editor")()
        self.assertTrue("my-layout.html" not in user_directory.listDirectory())

    def test_user_can_not_delete_global_layout(self):
        self.request.form.update(
            {"action": "deletelayout", "layout": "custom/basic.html"}
        )
        login(self.portal, TEST_USER_NAME)
        setRoles(self.portal, TEST_USER_ID, ["Editor"])
        with self.assertRaises(Unauthorized):
            self.portal.restrictedTraverse("@@manage-layouts-from-editor")()

    def test_non_editor_can_not_add_layout(self):
        self.request.form.update(
            {
                "action": "save",
                "name": "my-layout",
                "global": "false",
                "layout": "<html><body>foobar</body></html>",
            }
        )
        login(self.portal, TEST_USER_NAME)
        with self.assertRaises(Unauthorized):
            self.portal.restrictedTraverse("@@manage-layouts-from-editor")()

    def test_non_editor_can_not_delete_layout(self):
        self.request.form.update(
            {"action": "deletelayout", "layout": "custom/basic.html"}
        )
        login(self.portal, TEST_USER_NAME)
        with self.assertRaises(Unauthorized):
            self.portal.restrictedTraverse("@@manage-layouts-from-editor")()
