============
Plone Mosaic
============

**Plone Mosaic** allows you to define global site layouts and override them on specific contents or sections. You can then compose the content of the page using the Mosaic editor.

The Mosaic editor lets you insert blocks (a.k.a. tiles) into the content of the page so that you can easily build custom composite pages for your contents on the fly.

**Plone Mosaic** works with Plone 6.2 and later.

.. toctree::
   :maxdepth: 2
   :caption: User Guide

   installation
   getting-started
   tiles
   content-layouts

.. toctree::
   :maxdepth: 2
   :caption: Advanced Configuration

   site-layouts
   custom-grid
   registry-reference

.. toctree::
   :maxdepth: 2
   :caption: Developer Guide

   custom-tiles


Screenshots Needed
==================

The documentation contains placeholders for screenshots that need to be captured from a live Plone 6.2+ site to match the modern UI. 

Please place the following images in ``docs/_static/images/``:

* ``p6-mosaic-display-menu.png``: The Plone "Display" menu with "Mosaic layout" highlighted.
* ``p6-mosaic-edit-tab.png``: The Plone toolbar showing the "Edit" tab.
* ``p6-mosaic-layout-selector.png``: The Mosaic layout selection modal that appears on first edit.
* ``p6-mosaic-toolbar-customizing.png``: The Mosaic toolbar after clicking "Customize", showing "Insert" and "Format" menus.
* ``p6-mosaic-insert-menu.png``: The "Insert" menu opened, showing available tile categories.
* ``p6-mosaic-layout-editor.png``: The ``@@layouts-editor`` control panel.
* ``p6-mosaic-site-layout-selector.png``: The site layout selection interface (from the Layout tab/menu).


Terminology changes in Plone Mosaic
===================================


**Plone Mosaic** changes how Plone page composition works, and the new way comes with some new terms:

+---------------------------+------------------------+
| Plone                     | Mosaic                 |
+===========================+========================+
| main template             | site layout            |
+---------------------------+------------------------+
| view template             | content layout         |
|                           | / custom layout        |
+---------------------------+------------------------+
| metal slots               | layout panels          |
+---------------------------+------------------------+
| metal macros, portlets,   | tiles                  |
| viewlets, providers,      |                        |
| etc...                    |                        |
+---------------------------+------------------------+

In short:

* For each page, a configured site layout is looked up (falling back to the old main template).

* A site layout may contain one or more panels, which are later filled from the configured content layout (or custom content layout saved into the current content item).

* Both site layout and content layout may contain one or more tiles to provide the actual context dependent content.
