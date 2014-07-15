============
Plone Mosaic
============

**Plone Mosaic** provides modern WYSIWYG content layout editor with blocks_ and tiles_ based layouts for Dexterity content types on Plone 4.3 and newer.

Mosaic is a spiritual successor of the Plone Deco project, but is designed from ground to work side by side with the existing content.

.. _blocks: https://pypi.python.org/pypi/plone.app.blocks
.. _tiles: https://pypi.python.org/pypi/plone.app.tiles


Tour
====

.. include:: _robot.rst
.. figure:: _screenshots/document-default-layout.png

   After installation, everything should look normal, but behind the curtain
   the main template has been routed through Mosaic composition chain.

.. code:: robotframework

   Show document rendered with the default layout
       Create content  type=Document
       ...  id=example-document
       ...  title=Example Document
       ...  text=<p>This document will soon have a custom layout.</p>
       Go to  ${PLONE_URL}/example-document/++layout++default
       Capture and crop page screenshot
       ...  _screenshots/document-default-layout.png
       ...  css=html

.. figure:: _screenshots/select-custom-layout.png

   The most prominent feature is the new Layout-behavior, which provides a new
   **Custom layout** option in the familiar display menu.

.. code:: robotframework

   Show how to select the custom layout option
       Element should be visible  id=plone-contentmenu-layout
       Click element  css=#plone-contentmenu-layout dt a
       Element should be visible  id=plone-contentmenu-display-view
       Mouse over  id=plone-contentmenu-display-view

       Update element style  css=.managePortletsFallback  display  none
       Capture and crop page screenshot
       ...  _screenshots/select-custom-layout.png
       ...  id=edit-bar  id=plone-contentmenu-layout
       ...  css=#plone-contentmenu-layout dd

       Click element  id=plone-contentmenu-display-view
       Page should contain  View changed.

.. figure:: _screenshots/select-custom-layout-done.png

   How the current page looks after the first time **Custom layout** is
   activated, depends on the configured defaults.

.. code:: robotframework

   Show how to custom layout view
       Capture and crop page screenshot
       ...  _screenshots/select-custom-layout-done.png
       ...  id=edit-bar  id=plone-contentmenu-layout
       ...  jquery=.portalMessage:visible

.. figure:: _screenshots/mosaic-editor.png

   But just clicking the Edit-tab, the Mosaic Editor will open and allow
   you to design your own custom content layout.

.. code:: robotframework

   Show the Mosaic Editor
       Go to  ${PLONE_URL}/example-document/edit
       Element should be visible  css=.mosaic-toolbar
       Capture and crop page screenshot
       ...  _screenshots/mosaic-editor.png
       ...  css=html

.. figure:: _screenshots/mosaic-select-richtext-tile.png

   To add a tile, select the tile from the rightmost menu...

.. code:: robotframework

   Show how to select a new tile from menu
       Element should be visible  css=.mosaic-toolbar

       Mouse down  css=.mosaic-menu-insert
       Mouse over  css=.mosaic-option-IRichText-text

       Capture and crop page screenshot
       ...  _screenshots/mosaic-select-richtext-tile.png
       ...  css=.mosaic-toolbar

.. figure:: _screenshots/mosaic-drag-tile.png

   ... drag the appearing tile into the desired position.

.. code:: robotframework

   Show how to drag a new tile into its initial position

       Mouse up  css=.mosaic-option-IRichText-text
       Mouse over  css=.mosaic-tile.removable
       Capture and crop page screenshot
       ...  _screenshots/mosaic-drag-tile.png
       ...  css=html

.. figure:: _screenshots/mosaic-drop-tile.png

   Finally, one click drops the tile and the page can be saved.

.. code:: robotframework

   Show how to drop a new tile into its initial position

       Click element at coordinates  css=.mosaic-tile.removable  0  25
       Capture and crop page screenshot
       ...  _screenshots/mosaic-drop-tile.png
       ...  css=html

.. figure:: _screenshots/mosaic-page-saved.png

   And that's how we can build custom content layouts using Plone Mosaic.

.. code:: robotframework

   Show how the custom layout looks after saving

       Choose Ok On Next Confirmation
       Click button  css=.mosaic-button-save
       Page should contain  Changes saved
       Capture and crop page screenshot
       ...  _screenshots/mosaic-page-saved.png
       ...  css=html


Design concepts
===============

The current, pre-mosaics, layouts (also known as templates or views) in Plone are usually created using only one site wide *main template*.
The main template provides fillable content areas called *slots*, which are later filled with content from content type specific *view templates*.

Plone Mosaic replaces main template and view templates with the following concepts:

Site layouts
    Site layouts replace main template in providing the shared layout between content.
    In other words: everithing from <html> to </html>.
    There must always be at least one site layout, but there's no upper limit.
    Site layouts defines *panels* (similar to main template slots), which a filled with context specific content.

Content layouts
    ...


Custom layout behavior
======================

...

Custom layout view option
=========================

...


Binding layouts to contnet types
================================

...

