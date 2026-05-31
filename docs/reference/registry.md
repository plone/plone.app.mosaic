---
myst:
  html_meta:
    "description": "Reference for common configuration keys in the Plone Registry for Plone Mosaic."
    "property=og:description": "Reference for common configuration keys in the Plone Registry for Plone Mosaic."
    "property=og:title": "Registry reference"
    "keywords": "Plone, Mosaic, Registry, Configuration, Settings"
---

(registry-reference)=

# Registry reference

Plone Mosaic is heavily configured through the Plone Registry.
This guide provides a reference for the most common configuration keys.

## Global settings

`plone.app.mosaic.settings.disable_edit_bar`
: Boolean (default: `True`).
  Hides the standard Plone toolbar when the Mosaic editor is active, as it can be redundant.

## Actions and menus

Mosaic uses the registry to define the primary and secondary actions in its toolbar.

`plone.app.mosaic.default_available_actions`
: A list of actions available in the Mosaic toolbar.
  Common values: `save`, `cancel`, `properties`, `customizelayout`, `changelayout`, `format`, `insert`.

### Enabling the preview action

The preview action is hidden by default.
To enable it:

```xml
<record name="plone.app.mosaic.default_available_actions">
  <value purge="false">
    <element>preview</element>
  </value>
</record>
```

## Tile categories

Tiles in the {menuselection}`Insert` menu are grouped into categories.
Categories are defined with weights to control their order.

Example category registration:

```xml
<records interface="plone.app.mosaic.interfaces.IWeightedDict"
         prefix="plone.app.mosaic.tiles_categories.structure">
  <value key="name">structure</value>
  <value key="label">Structure</value>
  <value key="weight">10</value>
</records>
```

## Formats

The {menuselection}`Format` menu allows applying CSS classes to tiles or rows.

`plone.app.mosaic.formats.<name>`
: Defines a format action.

Example:

```xml
<records interface="plone.app.mosaic.interfaces.IFormat"
         prefix="plone.app.mosaic.formats.tile_align_center">
  <value key="name">tile-align-center</value>
  <value key="category">tile</value>
  <value key="label">Center content</value>
  <value key="action">tile-toggle-class</value>
  <value key="icon">true</value>
  <value key="weight">80</value>
</records>
```

(customize-rich-text-tinymce-buttons)=

## TinyMCE customization

You can customize the TinyMCE buttons shown when editing a rich text tile.

`plone.app.mosaic.app_tiles.plone_app_standardtiles_html.available_actions`
: List of toolbar buttons for the "Rich text" tile.

Example configuration to limit buttons:

```xml
<record name="plone.app.mosaic.app_tiles.plone_app_standardtiles_html.available_actions">
  <value>
    <element>toolbar-bold</element>
    <element>toolbar-italic</element>
    <element>toolbar-bullist</element>
    <element>toolbar-numlist</element>
  </value>
</record>
```

Available buttons include: `toolbar-styleselect`, `toolbar-bold`, `toolbar-italic`, `toolbar-alignleft`, `toolbar-aligncenter`, `toolbar-alignright`, `toolbar-alignjustify`, `toolbar-bullist`, `toolbar-numlist`, `toolbar-table`, `toolbar-ploneimage`, `toolbar-unlink`, `toolbar-plonelink`, `toolbar-code`.
