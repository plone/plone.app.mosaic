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

After **Plone Mosaic** has been installed, everything should look normal. Yet, each page can now be made to render through the Plone Mosaic composition chain as described soon. If something breaks just by installing **Plone Mosaic**, it's probably a bug and it should be reported_ as such.

.. _reported: https://github.com/plone/plone.app.mosaic/issues


Mosaic layout
-------------

The most prominent feature provided by **Plone Mosaic** is the new **Layout-behavior**, which appears as new **Mosaic layout** option in the familiar display menu.

..  figure:: _screenshots/mosaic-custom-layout-enable.png
..  code:: robotframework

    Show how to select Mosaic layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document

        Element should be visible  id=plone-contentmenu-display
        Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Element should be visible  id=plone-contentmenu-display-layout_view

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-display-layout_view
        Capture and crop page screenshot
        ...  _screenshots/mosaic-custom-layout-enable.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-display
        ...  ${SELECTOR_CONTENTMENU_DISPLAY_ITEMS}

        Mouse over  id=plone-contentmenu-display-layout_view
        Click element  id=plone-contentmenu-display-layout_view

        Run keyword if  '${CMFPLONE_VERSION}'.startswith('4.')
        ...  Page should contain  View changed.

        Run keyword if  '${CMFPLONE_VERSION}'.startswith('5.')
        ...  Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Run keyword if  '${CMFPLONE_VERSION}'.startswith('5.')
        ...  Page should contain element
        ...  css=#plone-contentmenu-display-layout_view.actionMenuSelected

How the current content looks after the first time the **Mosaic layout** is activated, depends on the configured defaults for its portal type. Still, at least the title and the description should be always displayed.

..  figure:: _screenshots/mosaic-custom-layout-enable-done.png
..  code:: robotframework

    Show how to select custom layout view
       Update element style  css=.managePortletsFallback  display  none
       Capture and crop page screenshot
        ...  _screenshots/mosaic-custom-layout-enable-done.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-display  id=content
        ...  jquery=#content > div:last


Mosaic editor
-------------

When the **Mosaic layout** has been enabled, the **Mosaic editor** is opened by clicking the **Edit** tab.

..  figure:: _screenshots/mosaic-editor-open.png
..  code:: robotframework

    Show how Mosaic editor is opened
        Go to  ${PLONE_URL}/example-document
        Highlight  id=contentview-edit
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-open.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=contentview-edit

When the editor is opened for the first time, it asks to the select the initial layout for the content:

..  figure:: _screenshots/mosaic-editor-layout-selector.png
..  code:: robotframework

    Show the layout selector
        Go to  ${PLONE_URL}/example-document/edit
        Element should be visible  css=.mosaic-select-layout
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-layout-selector.png
        ...  css=.plone-modal

The selected layout can then be used as it is, or make it fully custom.

Let's select the basic layout:

..  figure:: _screenshots/mosaic-editor-layout-selector-select.png
..  code:: robotframework

    Show how to select the initial layout
        Page should contain element  jquery=a[data-value="default/basic.html"]

        Highlight  jquery=a[data-value="default/basic.html"] img
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-layout-selector-select.png
        ...  css=.plone-modal

        Click element  jquery=a[data-value="default/basic.html"]

And then enable it for customization:

..  figure:: _screenshots/mosaic-editor-customize.png
..  code:: robotframework

    Show the Mosaic editor
        Element should be visible  css=.mosaic-toolbar

        Highlight  css=.mosaic-button-layout
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-layout.png
        ...  css=html

        Click element  css=.mosaic-button-layout

        Element should be visible  css=.mosaic-button-customizelayout

        Highlight  css=.mosaic-button-customizelayout
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-customize.png
        ...  css=html
        Clear highlight  css=.mosaic-button-layout
        Clear highlight  css=.mosaic-button-customizelayout

        Click element  css=.mosaic-button-customizelayout


To add a new tile in the **Mosaic editor**, select the tile from the rightmost menu

..  figure:: _screenshots/mosaic-editor-select-field-text-tile.png
..  code:: robotframework

    Show how to select a new tile from menu
        Element should be visible  css=.mosaic-toolbar

        Highlight  css=.mosaic-menu-insert
        Click element  css=.mosaic-menu-insert a
        Wait until element is visible  css=.mosaic-option-irichtext-text
        Mouse over  css=.mosaic-dropdown .mosaic-option-irichtext-text

        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-select-field-text-tile.png
        ...  css=.mosaic-toolbar  css=.mosaic-dropdown-insert

        Clear highlight  css=.mosaic-menu-insert

and drag the appearing tile into the desired position.

..  figure:: _screenshots/mosaic-editor-drag-field-text-tile.png
..  code:: robotframework

    Show how to drag a new tile into its initial position

        Click element  css=.mosaic-dropdown .mosaic-option-irichtext-text
        Wait until page contains element  css=.mosaic-helper-tile-new
        Wait until element is visible  css=.mosaic-helper-tile-new
        Update element style
        ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
        ...  display  block
        Mouse over
        ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-drag-field-text-tile.png
        ...  css=html

Finally, a mouse click drops the tile into selected position and the page can be saved.

..  figure:: _screenshots/mosaic-editor-drop-field-text-tile.png
..  code:: robotframework

    Show how to drop a new tile into its initial position

        Click element  css=.mosaic-selected-divider
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
