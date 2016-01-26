Changelog
=========

1.0b4 (unreleased)
------------------

New:

- do not remove data-pat-tinymce body attribute as this is not
  necessary with how tinymce is initialized anymore
  [vangheem]

- align rich text editor right if the tile is more on the right side
  of the page
  [vangheem]

- If only one layout is available, auto-select it.
  [vangheem]

- Be able to show/hide content layouts.
  [vangheem]


Fixes:

- Fix tinymce toolbar scrolling out of view with large rich text tiles.
  TinyMCE toolbar will now being sticky as the user scrolls down.
  [vangheem]

- Fix tiles not rendering correctly if they contain JavaScript patterns
  when adding and moving them around.
  [vangheem]

- fix do not add _layout multiple times to tile data
  [vangheem]

- fix issue where spurious &nbsp; was getting saved to description
  [vangheem]

- issue when registry configuration parsing would throw an error
  [vangheem]

- fix issue where you would end up saving non-resolveuid urls to rawhtml
  tiles and also prevent write conflicts when the editor sends out multiple
  edits at the same time
  [vangheem]

- only show drag handlers if customizing layout
  [vangheem]

- fix issue where you would no longer be able to edit a rich text area
  after you clear the whole area out
  [vangheem]

- Fixed weird Firefox bug with TinyMCE that prevented data from being saved.
  [vangheem]

- Fixed properties overlay to be scrollable.
  [vangheem]

- Fixed issue where tile field wouldn't get saved back to form with
  some refactoring.
  [vangheem]

- Fixed issue where first fieldset would not show on properties modal.
  [vangheem]


1.0b3 (2015-09-29)
------------------

- Add ploneimage action for richtext tiles' toolbar
  [datakurre]

- Add transforms to set 'layout-' with active content layout name or
  'layout-custom' into body class
  [datakurre]


1.0b2 (2015-09-16)
------------------

- Fix issue where mosaic-grid was enabled even a default grid system was set
  [datakurre]

- Fix issue where Plone body class was added twice
  [datakurre]

- Fix issue where contentLayout field was shown in tile menu
  [datakurre]

- Pin plone.app.standardtiles >= 1.0b3
  [datakurre]


1.0b1 (2015-09-16)
------------------

- Change layout behavior default view from ``view`` to ``layout_view``
  [datakurre]

- Change to enable *Mosaic layout* noly for Document, Event, Folder and News
  Item by default
  [datakurre]

- Change text formatting actions from top toolbar to inline TinyMCE toolbars
  [datakurre]

- Change remove tile icon from inline close icons to top toolbar button
  [datakurre]

- Change BS3 as default grid system on Plone 5
  [vangheem]

- Change site layouts be disabled unless ``mosaic-sitelayouts`` feature is set
  [datakurre]

- Change displayemenu support be disabled unless ``mosaic-layoutmenu`` feature
  is set
  [datakurre]

- Change *Custom layout* menu item to be called *Mosaic layout*
  [datakurre]

- Change install to no longer to make *Mosaic layout* the default by default
  [datakurre]

- Add layout editor control panel for Plone 5
  [vangheem]

- Add link and unlink actions
  [datakurre]

- Add table tile
  [datakurre]

- Remove grid system from example layouts (to use configured default grid)
  [vangheem]

- Remove previously provided TTW content layout examples
  [datakurre]

- Fixed to work with (and require) plone.app.blocks >= 3.0.0
  [vangheem]

- Fix GenericSetup profile registration (removed "for")
  [agitator]

- Fix issue where title field tile and content tile being use on same page
  would cause weird issues with saving title values
  [vangheem]

- Fix situation where layout editor broke with broken or missing tiles
  [vangheem]

- Fix issue where check could not add tile with requried selection field
  [datakurre]

1.0a3 (2015-06-10)
------------------

- Add "Bootstrap 3 Demo" example site layouts for Plone 5
  [datakurre]
- Add support for plone.app.blocks' generic data grid transform
  [datakurre]
- Change the default site layouts in Plone 5 to use 12 column deco grids
  [datakurre]
- Fix various site layout support related issues
  [datakurre]
- Upgrade to plone.app.drafts >= 1.0b3 and plone.app.blocks >= 2.1.2
  [datakurre]

1.0a2 (2015-06-08)
------------------

- Add 'Center tile content' tile style to allow e.g. centering of image tiles
  [datakurre]
- Add site and page layout fields to be available on properties overlay
  [datakurre]
- Add HTML tag language transform to set correct langauge for HTML site layouts
  [datakurHTML re]
- Add HTML body tag class transform to set body class for HTML site layouts
  [datakurre]
- Add HTTP headers transform to ensure that the response headers normally set by
  plone.httpheaders viewlet manager are also set for HTML site layouts
  [datakurre]
- Update example site and content layouts
  [datakurre]
- Fix to only cache site layout when it's not the default main_template
  [datakurre]
- Upgrade to plone.app.drafts >= 1.0b2 and plone.app.standardtiles >= 1.0b1
  [datakurre]

1.0a1 (2015-05-27)
------------------

- First technology preview release.
