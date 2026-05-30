============
Plone Mosaic
============

**Plone Mosaic** allows you to define global site layouts and override them on specific contents or sections. You can then compose the content of the page using the Mosaic editor.

The Mosaic editor lets you insert blocks (a.k.a. tiles) into the content of the page so that you can easily build custom composite pages for your contents on the fly.

**Plone Mosaic** works with Plone 6.2 and later.

.. toctree::
   :maxdepth: 2
   :caption: Tutorials

   tutorials/getting-started

.. toctree::
   :maxdepth: 2
   :caption: How-to Guides

   how-to/install
   how-to/manage-content-layouts
   how-to/save-custom-layout
   how-to/manage-site-layouts
   how-to/create-custom-tile
   how-to/use-custom-grid

.. toctree::
   :maxdepth: 2
   :caption: Reference

   reference/tiles
   reference/layouts
   reference/registry

.. toctree::
   :maxdepth: 2
   :caption: Explanation

   explanation/architecture
   explanation/data-storage


Automated Screenshots
=====================

The documentation uses screenshots that are automatically generated during the acceptance test execution. 

To regenerate the screenshots locally, you can run:

.. code-block:: bash

   tox -e docs-screenshots

This will run the subset of Robot Framework tests tagged with ``robot:docs`` and place the resulting images in ``docs/_static/generated-screenshots/``.


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
