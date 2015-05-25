Getting started
===============

..  include:: _robot.rst

Installation
------------

**Plone Mosaic** is installed just like any other Plone add-on by activating it at the Add-on control panel.

..  figure:: _screenshots/mosaic-product-activated.png
..  code:: robotframework

    Show Plone Mosaic activation
        Go to  ${PLONE_URL}/prefs_install_products_form

        Element should contain  ${SELECTOR_ADDONS_MOSAIC}  Plone Mosaic
        Highlight  ${SELECTOR_ADDONS_MOSAIC}
        Capture and crop page screenshot
        ...  _screenshots/mosaic-product-activated.png
        ...  ${SELECTOR_ADDONS_ENABLED}

After **Plone Mosaic** has been installed, everything should look normal. Yet, each page is now being rendered through the Plone Mosaic composition chain.

..  figure:: _screenshots/mosaic-document-layout-default.png
..  code:: robotframework

    Show document rendered with the default layout
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document/++layout++default
        Capture and crop page screenshot
        ...  _screenshots/mosaic-document-layout-default.png
        ...  css=html

If something breaks just by installing **Plone Mosaic**, it's probably a bug and it should be reported_ as such.

.. _reported: https://github.com/plone/plone.app.mosaic/issues


Custom layout
-------------

The most prominent feature provided by **Plone Mosaic** is the new **Layout-behavior**, which appears as new **Custom layout** option in the familiar display menu.

..  figure:: _screenshots/mosaic-custom-layout-enable.png
..  code:: robotframework

    Show how to select the custom layout option
        Element should be visible  id=plone-contentmenu-layout
        Click element  ${SELECTOR_CONTENTMENU_LAYOUT_LINK}
        Element should be visible  id=plone-contentmenu-display-view

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-display-view
        Capture and crop page screenshot
        ...  _screenshots/mosaic-custom-layout-enable.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-layout
        ...  ${SELECTOR_CONTENTMENU_LAYOUT_ITEMS}

        Mouse over  id=plone-contentmenu-display-view
        Click element  id=plone-contentmenu-display-view

        Run keyword if  '${CMFPLONE_VERSION}'.startswith('4.')
        ...  Page should contain  View changed.

        Run keyword if  '${CMFPLONE_VERSION}'.startswith('5.')
        ...  Click element  ${SELECTOR_CONTENTMENU_LAYOUT_LINK}
        Run keyword if  '${CMFPLONE_VERSION}'.startswith('5.')
        ...  Page should contain element
        ...  css=#plone-contentmenu-display-view.actionMenuSelected

How the current content looks after the first time the **Custom layout** is activated, depends on the configured defaults for its portal type. Still, at least the title and the description should be always displayed.

..  figure:: _screenshots/mosaic-custom-layout-enable-done.png
..  code:: robotframework

    Show how to select custom layout view
       Update element style  css=.managePortletsFallback  display  none
       Capture and crop page screenshot
        ...  _screenshots/mosaic-custom-layout-enable-done.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-layout  id=content
        ...  jquery=#content > div:last


Mosaic editor
-------------

When the **Custom layout** has been enabled, the **Mosaic editor** is opened by clicking the **Edit** tab.

..  figure:: _screenshots/mosaic-editor-open.png
..  code:: robotframework

    Show how Mosaic editor is opened
        Delete content  /plone/example-document
        Create content  type=News Item
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>

        Go to  ${PLONE_URL}/example-document
        Highlight  id=contentview-edit
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-open.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=contentview-edit

..  figure:: _screenshots/mosaic-editor-overview.png
..  code:: robotframework

    Show the Mosaic editor
        Go to  ${PLONE_URL}/example-document/edit
        Element should be visible  css=.mosaic-toolbar
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-overview.png
        ...  css=html

To add a new tile in the **Mosaic editor**, select the tile from the rightmost menu

..  figure:: _screenshots/mosaic-editor-select-field-text-tile.png
..  code:: robotframework

    Show how to select a new tile from menu
        Element should be visible  css=.mosaic-toolbar

        Highlight  css=.mosaic-menu-insert
        Click element  css=.mosaic-menu-insert a
        Mouse over  css=.mosaic-dropdown .mosaic-option-IRichText-text

        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-select-field-text-tile.png
        ...  css=.mosaic-toolbar  css=.mosaic-dropdown-insert

        Clear highlight  css=.mosaic-menu-insert

and drag the appearing tile into the desired position.

..  figure:: _screenshots/mosaic-editor-drag-field-text-tile.png
..  code:: robotframework

    Show how to drag a new tile into its initial position

        Click element  css=.mosaic-dropdown .mosaic-option-IRichText-text
        Mouse over  css=.mosaic-tile.removable
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-drag-field-text-tile.png
        ...  css=html

Finally, a mouse click drops the tile into selected position and the page can be saved.

..  figure:: _screenshots/mosaic-editor-drop-field-text-tile.png
..  code:: robotframework

    Show how to drop a new tile into its initial position

        Click element at coordinates  css=.mosaic-tile.removable  0  25
        Highlight  css=.mosaic-button-save
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-drop-field-text-tile.png
        ...  css=html

That's how we can build custom content layouts using Plone Mosaic.

..  figure:: _screenshots/mosaic-page-saved.png
..  code:: robotframework

    Show how the custom layout looks after saving

        Choose ok on next confirmation
        Click button  css=.mosaic-button-save
        Page should contain  Changes saved
        Capture and crop page screenshot
        ...  _screenshots/mosaic-page-saved.png
        ...  css=html
