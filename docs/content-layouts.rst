.. _section_content_layouts:

Content Layouts
===============

Content layouts define the structure of a specific page or a type of content.
They are essentially HTML templates that define where tiles can be placed.

Mosaic Layout Editor
--------------------

Plone Mosaic provides a web-based editor to manage content layouts globally.
You can access it by navigating to **@@layouts-editor** in your Plone site.

.. figure:: _static/images/p6-mosaic-layout-editor.png
   :alt: The Mosaic Layout Editor control panel.

   Managing content layouts through the Mosaic Layout Editor.

From this interface, you can:

*   **Edit** existing layouts (HTML and manifest).
*   **Show/Hide** layouts from the editor's "Select layout" menu.
*   **Create** new layouts.

Managing Visibility
-------------------

You can hide specific content layouts from being available in the Mosaic editor's "Change layout" menu.

Through-the-web
~~~~~~~~~~~~~~~

Go to the **Mosaic Layout Editor** (``@@layouts-editor``) and choose the tab **Show/Hide Content Layouts**.
There you can toggle the visibility of each registered layout.

Programmatically
~~~~~~~~~~~~~~~~

Add the layout key to the ``hidden_content_layouts`` list in your product's ``registry.xml``:

.. code-block:: xml

   <record name="plone.app.mosaic.hidden_content_layouts">
     <value purge="False">
       <element>default/news_item.html</element>
     </value>
   </record>

Registering Content Layouts in a Package
----------------------------------------

To provide predefined content layouts in your own add-on, place them in a directory (e.g., ``layouts/``) and add a ``manifest.cfg``.

Example ``manifest.cfg``:

.. code-block:: ini

   [contentlayout]
   title = Custom Document
   description = A layout with a specific grid structure
   file = custom_document.html
   for = Document
   preview = custom_document.png

**Settings:**

*   **title / description**: Displayed in the layout selector.
*   **file**: The HTML file containing the layout structure.
*   **preview**: A PNG image used as a thumbnail in the selector.
*   **for**: (Optional) A comma-separated list of content types this layout applies to.

Tile Configuration in Layouts
-----------------------------

You can control how editors interact with tiles by using specific CSS classes on the tile wrappers in your layout HTML.

*   **movable**: Allows the tile to be moved around the page.
*   **removable**: Allows the tile to be deleted from the page.
*   **mosaic-read-only-tile**: Prevents editing the tile's content or settings.

Example tile wrapper in a layout:

.. code-block:: html

   <div class="movable removable mosaic-tile mosaic-IDublinCore-description-tile">
     <div class="mosaic-tile-content">
       <div data-tile="./@@plone.app.standardtiles.field?field=IDublinCore-description"></div>
     </div>
   </div>

Grid Configuration
------------------

The number of columns available for the grid can be configured using the ``data-max-columns`` attribute on the main content panel:

.. code-block:: html

   <div data-panel="content" data-max-columns="12">
     <!-- tiles here -->
   </div>
