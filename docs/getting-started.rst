.. _section_getting_started:

Getting started
===============

..  include:: _robot.rst

First steps with Mosaic
-----------------------

This documentation will present you details how to work with **Plone Mosaic**
through the web and within a package.
If you haven't done it yet,
please read the `README.rst`_ to learn about the concepts in **Plone Mosaic**,
the requirements for the installation,
the projects status and how the development process of the product works.

.. _README.rst: https://github.com/plone/plone.app.mosaic/blob/master/README.rst


.. index:: Installation

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

        Wait Until Element Contains  ${SELECTOR_ADDONS_MOSAIC}  Mosaic
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


Mosaic Layout
-------------

In this section we will look at the **Layout-behavior** of **Plone Mosaic**.
It needs to be enabled in the display menu of a content item.
To follow along create a document and after saving it,
set the **Display** option to **Mosaic layout**.

..  figure:: _screenshots/mosaic-custom-layout-enable.png
..  code:: robotframework

    Show how to select Mosaic layout option
        Run keyword and ignore error  Set window size  1024  1500
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

        ## XXX: Mouse over got stuck on Firefox 52
        # Mouse over  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
        Run keyword and ignore error  Set window size  1024  800
        Wait until page contains element
        ...  css=#plone-contentmenu-display-layout_view.actionMenuSelected

How the current content looks after the first time the **Mosaic layout** is enabled
depends on the configured defaults for its portal type.
Still,
at least the title and the description should always be displayed.

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
or it can be customized by adding, removing and formatting tiles.
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

        ## XXX: Only double click worked on Firefox 52
        # Click element  jquery=a[data-value="default/basic.html"]
        Double click element  jquery=a[data-value="default/basic.html"]

Now the toolbar of the **Mosaic Editor** will appear on top.
The buttons *Save* and *Cancel* belong to the current *Edit* action of the content.
With them you can either save or discard the canges that were made to the current content element.

The button **Properties** opens a form where you can edit several properties of the content element,
like the publishing date or the short name.


.. figure:: _screenshots/mosaic-editor-properties-modal.png
.. code:: robotframework

   Show the properties view in Mosaic editor
       Run keyword and ignore error  Set window size  1024  1200
       Wait Until Element Is Visible  css=.mosaic-toolbar
       Click element  css=.mosaic-button-properties

       Highlight  css=.autotoc-nav

       Capture and crop page screenshot
       ...  _screenshots/mosaic-editor-properties-modal.png
       ...  css=.plone-modal-content

       #...  css=html
       #.plone-modal-content
       Run keyword and ignore error  Set window size  1024  800
       Click element  css=.mosaic-overlay-ok-button



The dropdown *Layout* has the two options *Change* and *Customize*.
*Change* opens the form where you can choose another layout from all available layouts.

With the option *Customize* you enable the current layout for customization,
i.e. two new dropdowns *Insert* and *Format* appear and allow to add new tiles and format existing ones.

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

To add a new tile in the **Mosaic editor**, select the "Text" tile from the *Insert* menu.
An overview about all available standard tiles refer to the :ref:`mosaic_tiles` part of this documentation.

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

Note that this costum layout is saved for the current content element.
The *Layout* dropdown now has the button *Save* instead of *Customize*.
With this you could save the layout for the whole site and make it available for other content elements.
You can find more information about this in the sectionXXX.

**ToDo Screenshot with Layout dropdown showing Change/Save focus on Save**

The button *Change* will open up the *Select Layout* form again and all the
customizations you made on the page will be discarded.

**ToDo Screenshot discard current custom layout on form**
