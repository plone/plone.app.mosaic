Getting started
===============

..  include:: _robot.rst

First steps with Mosaic
-----------------------

This documentation will present you details how to work with **Plone Mosaic** through the web and within a package.
If you haven't done it yet,
please read the `README.rst`_ to learn about the concepts in **Plone Mosaic**,
the requirements for the installation,
the projects status and how the development process of the product works.

.. _README.rst: https://github.com/plone/plone.app.mosaic/blob/master/README.rst

Installation and activation
---------------------------

**Plone Mosaic** is installed like any other Plone add-on with buildout.
It has several dependencies that need to be installed in specific versions.
Please check `installation notes`_.

.. _installation notes: https://github.com/plone/plone.app.mosaic/blob/master/README.rst#installation

.. note:: 
          Check :ref:`enable_site_layouts` if you want to use Mosaic Site Layouts
          on top of Content Layouts.


After the installation it needs to be activated in the Add-on control panel.

..  figure:: _screenshots/mosaic-product-activated.png
..  code:: robotframework

    Show Plone Mosaic activation
        Go to  ${PLONE_URL}/prefs_install_products_form

        Element should contain  ${SELECTOR_ADDONS_MOSAIC}  Mosaic
        Highlight  ${SELECTOR_ADDONS_MOSAIC}
        Capture and crop page screenshot
        ...  _screenshots/mosaic-product-activated.png
        ...  ${SELECTOR_ADDONS_ENABLED}

Even with **Plone Mosaic** installed and activated the Plone site should look and behave normal.
But now it is possible to add tiles to each page and get them rendered through the Plone Mosaic composition chain.

.. note::

  If something breaks just by installing **Plone Mosaic**,
  it's probably a bug and it should be reported_ as such.

.. _reported: https://github.com/plone/plone.app.mosaic/issues


Mosaic layout
-------------

In this section we will look at the **Layout-behavior** of **Plone Mosaic**.
It needs to be enabled in the display menu of a content item.
To follow along create a document and after saving it,
set the **Display** option to **Mosaic layout**.

..  figure:: _screenshots/mosaic-custom-layout-enable.png
..  code:: robotframework

    Show how to select Mosaic layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document

        Wait Until Element Is Visible  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Wait Until Element Is Visible  id=plone-contentmenu-display-layout_view

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-display-layout_view
        Capture and crop page screenshot
        ...  _screenshots/mosaic-custom-layout-enable.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-display
        ...  ${SELECTOR_CONTENTMENU_DISPLAY_ITEMS}

        Mouse over  id=plone-contentmenu-display-layout_view
        Click element  id=plone-contentmenu-display-layout_view

        Mouse over  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Wait until page contains element
        ...  css=#plone-contentmenu-display-layout_view.actionMenuSelected

How the current content looks after the first time the **Mosaic layout** is enabled,
depends on the configured defaults for its portal type.
Still,
at least the title and the description should be always displayed.

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

When the **Mosaic layout** has been enabled,
the **Mosaic editor** is opened by clicking the **Edit** tab.

..  figure:: _screenshots/mosaic-editor-open.png
..  code:: robotframework

    Show how Mosaic editor is opened
        Go to  ${PLONE_URL}/example-document
        Wait Until Element Is Visible  id=contentview-edit
        Highlight  id=contentview-edit
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-open.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=contentview-edit

When the editor is opened for the first time,
it asks to the select the initial layout for the content:

..  figure:: _screenshots/mosaic-editor-layout-selector.png
..  code:: robotframework

    Show the layout selector
        Go to  ${PLONE_URL}/example-document/edit
        Wait Until Element Is Visible  css=.mosaic-select-layout
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-layout-selector.png
        ...  css=.plone-modal

The selected layout can then be used as it is,
or make it fully custom.
How to achieve this will be described later on.

Let's select the basic layout:

..  figure:: _screenshots/mosaic-editor-layout-selector-select.png
..  code:: robotframework

    Show how to select the initial layout
        Wait until Page contains element  jquery=a[data-value="default/basic.html"]
        Highlight  jquery=a[data-value="default/basic.html"] img
        Capture and crop page screenshot
        ...  _screenshots/mosaic-editor-layout-selector-select.png
        ...  css=.plone-modal

        Click element  jquery=a[data-value="default/basic.html"]

**Here some words about the tool bar of the Mosaic Editor**

And then enable it for customization:

..  figure:: _screenshots/mosaic-editor-customize.png
..  code:: robotframework

    Show the Mosaic editor
        Wait Until Element Is Visible  css=.mosaic-toolbar
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
        Wait Until Element Is Visible  css=.mosaic-toolbar
        Highlight  css=.select2-container.mosaic-menu-insert
        Click element  css=.select2-container.mosaic-menu-insert a
        Wait until element is visible  css=.select2-result.mosaic-option-irichtext-text
        Mouse over  css=.mosaic-dropdown .select2-result.mosaic-option-irichtext-text

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
        Wait Until Element Is Visible  css=.mosaic-button-save
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
        Wait until page contains  Changes saved
        Capture and crop page screenshot
        ...  _screenshots/mosaic-page-saved.png
        ...  css=html
