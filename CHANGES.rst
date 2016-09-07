Changelog
=========

2.0.0 (unreleased)
------------------

- Move to using plone.app.standardtiles.html instead of
  the deprecated plone.app.standardtiles.rawhtml
  [vangheem]

- Add sitelayouts-meta.zcml, which allows enabling site layouts in
  buildout with ``zcml = plone.app.mosaic-meta:sitelayouts-meta.zcml``
  [datakurre]

- Replaced Deco-Grid styles with Bootstrap mixins form mixins.grid.plone.less
  Allows to use override grid system using standard mosaic class names.
  Main purpose is to unify the edit and view of your layout. Fixes #231
  [agitator]

- Depend on adapterized plone.app.blocks >= 4.0.0 and adopt mosaic to use it.
  [jensens]

- Fix: default layout image not showing properly
  [vangheem]

- Fix: plone_pattern_setting view lookup ran into empty, now renders all.
  [jensens]

- Log warning if plone_pattern_settings view was not found.
  [jensens]

- Depend on plone.app.contenttypes gs-profile.
  [jensens]

- Remove superfluos empty testing gs profile and its zcml.
  [jensens]

- Fixes: TinyMCE focus issues, disables row merging
  [vangheem]

- UX: Renames "Close" to "Done" on properties form.
  [vangheem]

- Fixes #2313: Pattern settings are not applied to the body tag for mosaic layouts.
  [jensens]

- Drop more Plone 4 compatibility code, registrations and imports.
  Simplify test setup.
  Minor code cleanup.
  [jensens]

- Move list of valid layout view names for LayoutWidget in a module variable, so it can be extended on demand.
  [jensens]

- Fix robot tests in docs to no run into timing traps.
  [jensens]

- Fix reference to default layout preview image
  [vangheem]

- Fix bug when tinymce editor would no longer work when dragging one rich text tile
  around another rich text tile.
  [vangheem]

- Do not set own overhead space of edit modal, the default should apply.
  [jensens]

- Remove testing for Plone 4.3. For Plone 4.3 support, please use
  plone.app.mosaic < 2.0.
  [datakurre]

- Move tile remove button onto tile instead of in toolbar
  [vangheem]

- Fix TinyMCE Insert Image search results to have fixed maximum height
  to prevent it from flowing over viewport
  [datakurre]

- Fix modal to be structured like other plone modals
  [vangheem]

- Fix robot test.
  [gforcada]

- Use buildout.coredev version pins.
  [gforcada]

- Update testing infrastructure.
  [gforcada]

- Make layouts HTML valid.
  [gforcada]

- Add Webpack based frontend development flow.
  [datakurre]

- Small fix in README
  [staeff]

1.0 (2016-04-11)
----------------

- Nothing changed.


1.0rc2 (2016-04-08)
-------------------

- Fixed TypeError during editing when no layout resource directory was
  found.  [maurits]


1.0rc1 (2016-04-07)
-------------------

New:

- Allow users to save layouts they are creating
  [vangheem]

- If only one layout is available, auto-select it.
  [vangheem]

- Be able to show/hide content layouts.
  [vangheem]

- Add *Mosaic layout* into available views views when layout behavior
  is enabled and remove the view when layout behavior is disabled from
  a portal ype
  [datakurre]

- Ability to limit maximum amount of Mosaic columns by setting
  ``data-max-columns`` attribute on ``data-panel`` -element (default: 4).
  [neilferreira]

- Align rich text editor right if the tile is more on the right side
  of the page
  [vangheem]

Fixes:

- Do not remove data-pat-tinymce body attribute as this is not
  necessary with how tinymce is initialized anymore
  [vangheem]

- Fix use of rawhtml text tile
  [vangheem]

- Fix case where you could get an error on save because mosaic could not figure out
  the tile type correctly
  [vangheem]

- Do not allow hitting enter for editing non-rich text fields
  [vangheem]

- Disable clicking links of content inside tiles while in edit mode
  [vangheem]

- Fix TinyMCE widget in add-form which was broken due to a change how the
  settings are stored in Plone 5 vs 4. BBB compatible.
  [jensens]

- Fix tinymce toolbar scrolling out of view with large rich text tiles.
  TinyMCE toolbar will now being sticky as the user scrolls down.
  [vangheem]

- Fix tiles not rendering correctly if they contain JavaScript patterns
  when adding and moving them around.
  [vangheem]

- Fix do not add _layout multiple times to tile data
  [vangheem]

- Fix issue where spurious &nbsp; was getting saved to description
  [vangheem]

- Issue when registry configuration parsing would throw an error
  [vangheem]

- Fix issue where you would end up saving non-resolveuid urls to rawhtml
  tiles and also prevent write conflicts when the editor sends out multiple
  edits at the same time
  [vangheem]

- Fix to only show drag handlers if customizing layout
  [vangheem]

- fix issue where you would no longer be able to edit a rich text area
  after you clear the whole area out
  [vangheem]

- Fix weird Firefox bug with TinyMCE that prevented data from being saved.
  [vangheem]

- Fix properties overlay to be scrollable.
  [vangheem]

- Fix issue where tile field wouldn't get saved back to form with
  some refactoring.
  [vangheem]

- Fix issue where first fieldset would not show on properties modal.
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
  [datakurre]
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
