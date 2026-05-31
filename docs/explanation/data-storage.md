---
myst:
  html_meta:
    "description": "Understanding where the information you enter into a tile is actually saved in Plone Mosaic."
    "property=og:description": "Understanding where the information you enter into a tile is actually saved in Plone Mosaic."
    "property=og:title": "Understanding tile data storage"
    "keywords": "Plone, Mosaic, Storage, Tiles, Layouts"
---

(tile-data-storage)=

# Understanding tile data storage

When using **Plone Mosaic**, it's crucial to understand where the information you enter into a tile is actually saved.
Mosaic uses two distinct methods for storing tile data, and choosing the wrong one for a layout can lead to unexpected behavior.

## Storage in the layout (structure tiles)

Standard tiles like **Text**, **Table**, and **Bulleted list** are designed for through-the-web page composition.
When you use these tiles in the editor:

- The content you type is saved **directly into the HTML layout code** of that specific page.
- **Implication**: If you save a layout containing one of these tiles and reuse it on another page, the content of that tile will be identical on both pages.
  If you change the text on one page, it will change on all pages using that layout (if it's a global layout) or it won't be editable at all without changing the layout.

## Storage on the content object (HTML tiles)

The `plone.app.standardtiles.html` tile (and other "field" tiles) works differently:

- The content is saved **as an attribute of the content item itself** (the document, event, etc.), not in the layout.
- The layout simply contains a reference (a "link") to where the data is stored on the object.
- **Implication**: This is the correct choice for **predefined layouts** provided by a package.
  It allows you to define a standard look (e.g., "Our Team Member Layout") with editable rich text areas that contain different information for every person in the team.

## When to use which?

- Use **structure tiles** for "one-off" page designs created by editors through the web.
- Use **HTML tiles** (field tiles) when creating reusable layouts in a package or when you want specific parts of a layout to remain editable and unique for every page.
