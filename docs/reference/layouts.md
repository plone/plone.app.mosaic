---
myst:
  html_meta:
    "description": "Technical details for configuring content and site layouts in Plone Mosaic."
    "property=og:description": "Technical details for configuring content and site layouts in Plone Mosaic."
    "property=og:title": "Layout configuration reference"
    "keywords": "Plone, Mosaic, Layout, Configuration, Manifest"
---

(layouts-reference)=

# Layout configuration reference

This section provides technical details for configuring content and site layouts in **Plone Mosaic**.

## Manifest settings (manifest.cfg)

When registering layouts in a package, the `manifest.cfg` file supports the following settings within a `[contentlayout]` or `[sitelayout]` section:

`title`
: The display name of the layout in the selection menu.

`description`
: (Optional) A short description of the layout's purpose.

`file`
: The path to the HTML file containing the layout structure, relative to the manifest file.

`preview`
: (Optional) The path to a PNG image used as a thumbnail in the layout selector.

`for`
: (Optional) A comma-separated list of portal types for which this layout should be available.

## Tile configuration classes

You can control the behavior of individual tiles within a layout by adding specific CSS classes to the tile's wrapper element (the element containing the `mosaic-tile` class).

`movable`
: Allows the tile to be dragged and dropped into different positions within the Mosaic editor.

`removable`
: Allows the user to delete the tile from the page.

`mosaic-read-only-tile`
: Prevents the user from editing the tile's content or changing its settings.

Example:

```html
<div class="movable removable mosaic-tile">
  <!-- tile content -->
</div>
```

## Grid and column configuration

Mosaic uses a row-and-column grid system.
You can configure the maximum number of columns available in a specific panel using the `data-max-columns` attribute.

`data-max-columns`
: Specifies the grid width (typically 4 or 12).
  This attribute must be placed on the element defining the `content` panel.

```html
<div data-panel="content" data-max-columns="12">
  <!-- row/column structure goes here -->
</div>
```
