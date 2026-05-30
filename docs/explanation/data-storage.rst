.. _tile_data_storage:

Understanding Tile Data Storage
===============================

When using **Plone Mosaic**, it's crucial to understand where the information you enter into a tile is actually saved. Mosaic uses two distinct methods for storing tile data, and choosing the wrong one for a layout can lead to unexpected behavior.

Storage in the Layout (Structure Tiles)
---------------------------------------

Standard tiles like **Text**, **Table**, and **Bulleted List** are designed for through-the-web page composition. When you use these tiles in the editor:

*   The content you type is saved **directly into the HTML layout code** of that specific page.
*   **Implication**: If you save a layout containing one of these tiles and reuse it on another page, the content of that tile will be identical on both pages. If you change the text on one page, it will change on all pages using that layout (if it's a global layout) or it won't be editable at all without changing the layout.

Storage on the Content Object (HTML Tiles)
------------------------------------------

The ``plone.app.standardtiles.html`` tile (and other "field" tiles) works differently:

*   The content is saved **as an attribute of the content item itself** (the Document, Event, etc.), not in the layout.
*   The layout simply contains a reference (a "link") to where the data is stored on the object.
*   **Implication**: This is the correct choice for **predefined layouts** provided by a package. It allows you to define a standard look (e.g., "Our Team Member Layout") with editable rich text areas that contain different information for every person in the team.

When to use which?
------------------

*   Use **Structure tiles** for "one-off" page designs created by editors through the web.
*   Use **HTML tiles** (field tiles) when creating reusable layouts in a package or when you want specific parts of a layout to remain editable and unique for every page.
