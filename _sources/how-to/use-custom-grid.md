---
myst:
  html_meta:
    "description": "Using rows and columns to define layout structure in Plone Mosaic."
    "property=og:description": "Using rows and columns to define layout structure in Plone Mosaic."
    "property=og:title": "Using a custom grid"
    "keywords": "Plone, Mosaic, Grid, SCSS, Bootstrap"
---

(using-a-custom-grid)=

# Using a custom grid

Mosaic uses specific class names to define the layout structure using rows and columns.
In Plone 6, the default grid system is based on **Bootstrap 5**.

## Standard grid structure

Mosaic generates rows and columns that typically look like this in the HTML:

```html
<div class="row">
  <div class="col-md-6 mosaic-column">
    <!-- tiles -->
  </div>
  <div class="col-md-6 mosaic-column">
    <!-- tiles -->
  </div>
</div>
```

## Customizing via SCSS

In Plone 6, you should customize the grid styles using **SCSS**.
The layout engine relies on classes like `mosaic-grid-row` and `mosaic-column`.

If you want to use a different grid system (like CSS grid or a different framework), you will need to:

1. Override the default Mosaic CSS/SCSS.
2. Ensure your theme provides the necessary styling for the column classes Mosaic generates.

## Supported column spans

By default, Mosaic supports:

- Full width (100%)
- Halves (50%)
- Thirds (33.3%)
- Quarters (25%)

These are mapped to the appropriate Bootstrap `col-md-*` classes.

## Responsive considerations

```{tip}
While your theme should be responsive, you might want to maintain a fixed-width grid in the **Mosaic editor** itself.
This ensures that the drop zones and tile positions remain predictable for the editor while they are composing the page.
```
