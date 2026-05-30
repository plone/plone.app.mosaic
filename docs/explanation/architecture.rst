.. _mosaic_architecture:

Mosaic Architecture
===================

To work effectively with **Plone Mosaic**, it's important to understand the three core concepts that drive its layout engine: **Panels**, **Layouts**, and **Tiles**.

The Composition Chain
---------------------

Mosaic works by intercepting the standard Plone rendering process and building the page from several layers:

1.  **Site Layout**: The outer wrapper (header, footer, common sidebars). It defines **panels**.
2.  **Content Layout**: The inner structure (columns, rows) that fills the main "content" panel of the site layout.
3.  **Tiles**: The individual blocks of content (text, images, views) that are placed within the content layout.

Panels
------

Panels are "slots" defined in the HTML structure using the ``data-panel`` attribute. 

*   A **Site Layout** defines where the header, content, and footer panels are.
*   A **Content Layout** provides the content for one or more of these panels (most commonly just the ``content`` panel).

Tiles
-----

Tiles are the smallest units of content. They are dynamic blocks that can be placed, moved, and configured through the Mosaic editor. 

Unlike traditional Plone portlets, tiles are designed to be part of the main content flow and can be used both within predefined layouts and in through-the-web customizations.
