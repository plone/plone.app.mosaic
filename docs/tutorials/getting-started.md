---
myst:
  html_meta:
    "description": "This tutorial will guide you through the first steps of using Plone Mosaic to create a custom page layout."
    "property=og:description": "This tutorial will guide you through the first steps of using Plone Mosaic to create a custom page layout."
    "property=og:title": "Getting started with Mosaic"
    "keywords": "Plone, Mosaic, Tutorial, Layout, Site Builder"
---

(getting-started-tutorial)=

# Getting started with Mosaic

This tutorial will guide you through the first steps of using **Plone Mosaic** to create a custom page layout.

## Prerequisites

Before starting, ensure that **Mosaic** is installed and activated in your Plone site.
See the {ref}`installation` guide for details.

## Step 1: Enable Mosaic layout

1. Create a new **Document** in your Plone site.
2. Save the document.
3. In the toolbar, click on the {menuselection}`Display` menu and select {guilabel}`Mosaic layout`.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-display-menu.png
   :alt: The display menu in Plone 6 showing the Mosaic layout option.

   Selecting "Mosaic layout" from the Display menu.
```

Your document is now using the Mosaic composition engine.
By default, it will show the title and description.

## Step 2: Open the Mosaic editor

1. Click the {guilabel}`Edit` tab in the Plone toolbar.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-edit-tab.png
   :alt: The Plone toolbar highlighting the Edit tab.

   Opening the Mosaic editor.
```

2. If this is the first time you've edited this page, you will be prompted to select an initial layout.
   Select the **Basic** layout.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-layout-selector.png
   :alt: The layout selector modal.

   Selecting an initial layout.
```

## Step 3: Customize the layout

The Mosaic toolbar appears at the top of the content area.

1. Click the {menuselection}`Layout` menu and select {guilabel}`Customize`.
   This enables the {menuselection}`Insert` and {menuselection}`Format` menus.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-toolbar-customizing.png
   :alt: The Mosaic toolbar in customization mode.

   The toolbar after clicking "Customize".
```

2. Click the {menuselection}`Insert` menu.
   You will see categories of tiles like **Structure**, **Media**, and **Fields**.

```{eval-rst}
.. figure:: ../_static/generated-screenshots/p6-mosaic-insert-menu.png
   :alt: The Insert menu.

   Available tiles in the Insert menu.
```

3. Select a **Text** tile from the **Structure** category.
   It will appear as a draggable box.
4. Drag the tile to a new position on the page.
   Notice how potential drop zones highlight as you move.
5. Click to drop the tile.

## Step 4: Save your changes

1. Click the {guilabel}`Save` button in the Mosaic toolbar (not the Plone toolbar).

Congratulations!
You have created your first custom page layout with Plone Mosaic.

## Next steps

- Learn how to reuse this design by reading {ref}`how-to-save-custom-layout`.
- Explore more advanced tasks in the **How-to guides**.
