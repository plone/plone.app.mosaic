---
myst:
  html_meta:
    "description": "How to create custom tile and row formats in Plone Mosaic."
    "property=og:description": "How to create custom tile and row formats in Plone Mosaic."
    "property=og:title": "Creating custom tile and row formats"
    "keywords": "Plone, Mosaic, Format, Tile, Row, CSS, Registry"
---

(creating-custom-formats)=

# Creating custom tile and row formats

The {menuselection}`Format` menu in the Mosaic editor allows editors to apply CSS classes to individual **tiles** or entire **rows**.
You can extend this menu with your own formats by registering them in the Plone registry.

Formats are registered using the `plone.app.mosaic.interfaces.IFormat` interface.
When a format is applied, Mosaic adds or removes the corresponding CSS class on the tile or row element.
It is your responsibility to provide the matching CSS rules in your theme.

```{important}
Registering a format record alone is **not sufficient**.
You must also add the format's `name` value to the `plone.app.mosaic.default_available_actions` registry record, otherwise the format will not appear in the editor.
```

## Tile formats

A tile format applies a CSS class to a single tile element.

### Registry configuration

Add a registry XML file to your GenericSetup profile (e.g., `profiles/default/registry/formats.xml`).
You need **two** entries: the format definition itself, and the format name added to the allowed actions list.

```xml
<!-- 1. Define the format -->
<records interface="plone.app.mosaic.interfaces.IFormat"
         prefix="plone.app.mosaic.formats.my_tile_highlight">
  <value key="name">my-tile-highlight</value>
  <value key="category">tile</value>
  <value key="label">Highlight</value>
  <value key="action">tile-toggle-class</value>
  <value key="icon">false</value>
  <value key="favorite">false</value>
  <value key="weight">150</value>
</records>

<!-- 2. Add the format name to the allowed actions list -->
<record name="plone.app.mosaic.default_available_actions">
  <value purge="false">
    <element>my-tile-highlight</element>
  </value>
</record>
```

### Key fields

| Field | Description |
| :--- | :--- |
| `name` | The CSS class that will be toggled on the tile element. Use hyphens, no spaces. |
| `category` | Must be `tile` for tile formats. |
| `label` | The human-readable label shown in the {menuselection}`Format` menu. |
| `action` | Use `tile-toggle-class` to toggle the CSS class. Use `tile-remove-format` for a "remove all formats" entry. |
| `icon` | Whether to show an icon in the menu. |
| `favorite` | Whether to show this format prominently (pinned to toolbar). |
| `weight` | Controls the sort order within the menu. Lower values appear first. |

### Providing the CSS

In your theme, add a rule for the class defined in `name`:

```css
.mosaic-tile.my-tile-highlight {
  background-color: #fffbe6;
  border-left: 4px solid #f0c000;
  padding: 1rem;
}
```

## Row formats

A row format applies a CSS class to an entire row (all columns within it).

### Registry configuration

```xml
<!-- 1. Define the format -->
<records interface="plone.app.mosaic.interfaces.IFormat"
         prefix="plone.app.mosaic.formats.my_row_dark">
  <value key="name">my-row-dark</value>
  <value key="category">row</value>
  <value key="label">Dark background</value>
  <value key="action">row-toggle-class</value>
  <value key="icon">false</value>
  <value key="favorite">false</value>
  <value key="weight">150</value>
</records>

<!-- 2. Add the format name to the allowed actions list -->
<record name="plone.app.mosaic.default_available_actions">
  <value purge="false">
    <element>my-row-dark</element>
  </value>
</record>
```

### Key fields

| Field | Description |
| :--- | :--- |
| `name` | The CSS class that will be toggled on the row element. |
| `category` | Must be `row` for row formats. |
| `label` | The human-readable label shown in the {menuselection}`Format` menu. |
| `action` | Use `row-toggle-class` to toggle the CSS class. Use `row-remove-format` for a "remove all formats" entry. |
| `icon` | Whether to show an icon in the menu. |
| `favorite` | Whether to show this format prominently. |
| `weight` | Controls the sort order within the menu. |

### Providing the CSS

```css
.mosaic-grid-row.my-row-dark {
  background-color: #1a1a2e;
  color: #ffffff;
  padding: 2rem 0;
}
```

## Available actions

| Action | Category | Description |
| :--- | :--- | :--- |
| `tile-toggle-class` | tile | Toggles the `name` value as a CSS class on the tile |
| `tile-align-left` | tile | Floats the tile to the left |
| `tile-align-right` | tile | Floats the tile to the right |
| `tile-remove-format` | tile | Removes all applied tile formats |
| `row-toggle-class` | row | Toggles the `name` value as a CSS class on the row |
| `row-remove-format` | row | Removes all applied row formats |

```{tip}
Always include a `(Remove format)` entry (using `tile-remove-format` or `row-remove-format`) so editors can revert to the default appearance.
See the built-in examples in `plone.app.mosaic.formats.tile_remove_format` and `plone.app.mosaic.formats.grid_row_remove_format`.
```

## Complete example

The following shows a complete `registry/formats.xml` for a package that adds one tile format and one row format, each with a corresponding "remove" entry:

```xml
<?xml version="1.0"?>
<registry>

  <!-- Tile format: highlight box -->
  <records interface="plone.app.mosaic.interfaces.IFormat"
           prefix="plone.app.mosaic.formats.my_tile_highlight">
    <value key="name">my-tile-highlight</value>
    <value key="category">tile</value>
    <value key="label">Highlight</value>
    <value key="action">tile-toggle-class</value>
    <value key="icon">false</value>
    <value key="favorite">false</value>
    <value key="weight">150</value>
  </records>

  <!-- Row format: dark background -->
  <records interface="plone.app.mosaic.interfaces.IFormat"
           prefix="plone.app.mosaic.formats.my_row_dark">
    <value key="name">my-row-dark</value>
    <value key="category">row</value>
    <value key="label">Dark background</value>
    <value key="action">row-toggle-class</value>
    <value key="icon">false</value>
    <value key="favorite">false</value>
    <value key="weight">150</value>
  </records>

  <!-- Register all format names in the allowed actions list -->
  <record name="plone.app.mosaic.default_available_actions">
    <value purge="false">
      <element>my-tile-highlight</element>
      <element>my-row-dark</element>
    </value>
  </record>

</registry>
```

Make sure this file is referenced from your `profiles/default/registry.xml`:

```xml
<import-step name="plone.app.mosaic" handler="Products.GenericSetup.registry.importRegistry">
  <depends name="plone.app.mosaic"/>
</import-step>
```

Or, if you import sub-files automatically via the standard `registry.xml` pattern, simply place the file in `profiles/default/registry/formats.xml` and it will be picked up.
