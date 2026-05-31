---
myst:
  html_meta:
    "description": "Conceptual overviews and architectural design of Plone Mosaic."
    "property=og:description": "Conceptual overviews and architectural design of Plone Mosaic."
    "property=og:title": "Mosaic architecture"
    "keywords": "Plone, Mosaic, Architecture, Panels, Layouts, Tiles"
---

(mosaic-architecture)=

# Mosaic architecture

To work effectively with **Plone Mosaic**, it is important to understand the three core concepts that drive its layout engine: **Panels**, **Layouts**, and **Tiles**.

## The composition chain

Mosaic works by intercepting the standard Plone rendering process and building the page from several layers:

1. **Site layout**: The outer wrapper (header, footer, common sidebars).
   It defines **panels**.
2. **Content layout**: The inner structure (columns, rows) that fills the main "content" panel of the site layout.
3. **Tiles**: The individual blocks of content (text, images, views) that are placed within the content layout.

## Panels

Panels are "slots" defined in the HTML structure using the `data-panel` attribute.

- A **site layout** defines where the header, content, and footer panels are.
- A **content layout** provides the content for one or more of these panels (most commonly just the `content` panel).

## Tiles

Tiles are the smallest units of content.
They are dynamic blocks that can be placed, moved, and configured through the Mosaic editor.

Unlike traditional Plone portlets, tiles are designed to be part of the main content flow.
They can be used both within predefined layouts and through-the-web customizations.
