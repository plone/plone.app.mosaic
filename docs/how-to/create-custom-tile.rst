.. _custom_tiles:

Creating Custom Tiles
=====================

Adding custom tiles is the primary way to extend Plone Mosaic's functionality. There are two main ways to create tiles: Python-based tiles and HTML-based tiles.

Python-based Tiles
------------------

Python tiles allow for complex logic, dynamic data fetching, and custom forms.

1. Create the Tile Class
~~~~~~~~~~~~~~~~~~~~~~~~

Define your tile by inheriting from ``plone.tiles.Tile``.

.. code-block:: python

   from plone.tiles import Tile

   class MyCustomTile(Tile):
       def __call__(self):
           self.data = {"message": "Hello from my custom tile!"}
           return self.index()

2. Register the Tile in ZCML
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Register the tile in your package's ``configure.zcml``.

.. code-block:: xml

   <plone:tile
       name="my.package.customtile"
       title="My Custom Tile"
       description="A tile with custom logic"
       add_permission="cmf.ModifyPortalContent"
       class=".tiles.MyCustomTile"
       template="templates/my_custom_tile.pt"
       for="*"
       permission="zope2.View"
       />

3. Register in the Mosaic Registry
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To make the tile appear in the Mosaic "Insert" menu, you must register it in the Plone registry (usually via ``registry/tiles.xml`` in your GenericSetup profile).

.. code-block:: xml

    <records prefix="plone.app.mosaic.app_tiles.my_package_customtile"
             interface="plone.app.mosaic.interfaces.ITile">
      <value key="name">my.package.customtile</value>
      <value key="label">My Custom Tile</value>
      <value key="category">applications</value>
      <value key="tile_type">app</value>
      <value key="read_only">false</value>
      <value key="settings">true</value>
      <value key="weight">100</value>
    </records>

HTML-based Tiles (TTW)
----------------------

Simple tiles that only contain static HTML or basic template logic can be added through the web or as resources.

1. Add the HTML File
~~~~~~~~~~~~~~~~~~~~

Place an HTML file in your package's resource directory (e.g., ``resources/tiles/simple.html``).

2. Register in the Registry
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Register it as a ``textapp`` or ``app`` tile in the registry, pointing the name to the resource path.

Tile Types
----------

*   **app**: A standard tile that renders its content dynamically.
*   **field**: A tile that displays and allows editing a specific field of the content item.
*   **text**: A simple rich text tile.

Rich Text vs. HTML Tiles
------------------------

When designing layouts, it's important to understand where tile data is stored:

1.  **Structure Tiles (Text, Table, etc.)**: These tiles store their content **within the layout HTML itself**. If you save a layout containing a Text tile and reuse it on another page, changing the text on one page will not be possible without changing the layout, or the text will be identical across all pages using that layout.
2.  **HTML Tiles (plone.app.standardtiles.html)**: These tiles store their data **on the content object**. This allows you to have a predefined layout with editable rich text areas that are unique to each page.

To enable the HTML tile in the "Insert" menu, you can use the following registry configuration:

.. code-block:: xml

  <records prefix="plone.app.mosaic.app_tiles.plone_app_standardtiles_html"
           interface="plone.app.mosaic.interfaces.ITile">
    <value key="category">structure</value>
  </records>

