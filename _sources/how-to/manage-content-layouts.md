---
myst:
  html_meta:
    "description": "How to manage and register content layouts in Plone Mosaic."
    "property=og:description": "How to manage and register content layouts in Plone Mosaic."
    "property=og:title": "How to manage content layouts"
    "keywords": "Plone, Mosaic, Content Layouts, Management"
---

(how-to-manage-content-layouts)=

# How to manage content layouts

This guide covers the various ways to manage and register content layouts in **Plone Mosaic**.

## Managing layouts through the web

Mosaic provides a dedicated interface for managing layouts globally.

1. Navigate to `@@layouts-editor` in your Plone site.
2. Use the interface to edit HTML, manifest settings, or toggle visibility of existing layouts.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-layout-editor.png
   :alt: The Mosaic Layout Editor interface showing various layout management options.

   The Layout Editor interface.
```

## Hiding layouts from the selection menu

If you want to prevent users from selecting specific layouts, you can hide them.

### Using the UI

In the **Mosaic layout editor** (`@@layouts-editor`), select the {guilabel}`Show/Hide Content Layouts` tab and toggle the desired layouts.

### Using the registry

Add the layout key to your package's `registry.xml`:

```xml
<record name="plone.app.mosaic.hidden_content_layouts">
  <value purge="False">
    <element>default/news_item.html</element>
  </value>
</record>
```

## Registering layouts in a package

To include predefined layouts in your add-on:

1. Create a directory for your layouts (e.g., `src/my/package/layouts/`).
2. Add an HTML file for the layout structure.
3. Add a `manifest.cfg` file to define the metadata.

For detailed information on the manifest syntax and tile classes, see the {ref}`layouts-reference`.

Example `manifest.cfg` snippet:

```ini
[contentlayout]
title = Custom Page
file = custom_page.html
for = Document
```
