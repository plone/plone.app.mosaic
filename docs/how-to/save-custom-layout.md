---
myst:
  html_meta:
    "description": "How to save and reuse custom page designs in Plone Mosaic."
    "property=og:description": "How to save and reuse custom page designs in Plone Mosaic."
    "property=og:title": "How to save a custom layout"
    "keywords": "Plone, Mosaic, Layout, Save, Reusable"
---

(how-to-save-custom-layout)=

# How to save a custom layout

Once you have customized the tiles and layout of a specific page, you can save that design to be reused elsewhere.

## Saving for the current item

By default, any changes you make in the Mosaic editor and {guilabel}`Save` using the primary toolbar button are stored only for the current content item.
This creates a "custom layout" unique to that page.

## Saving globally

If you have created a layout that you want to use for other pages of the same type:

1. While in the Mosaic editor, click on the {menuselection}`Layout` dropdown menu.
2. Select {guilabel}`Save`.
3. Provide a name for the new layout.
4. Choose whether to save it {guilabel}`Globally` (requires `plone.ManageContentLayouts` permission).

Once saved globally, the layout will appear in the "Change layout" selector for all other items of that content type.

## Managing custom layouts

To delete or rename custom layouts saved through the web, use the {ref}`how-to-manage-content-layouts` guide.
