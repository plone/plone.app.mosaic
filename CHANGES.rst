Changelog
=========

3.0.3 (2023-05-16)
------------------

- Remove obsolete row column presets from `Format` menu.
  [petschki]
  
- Cleanup and update `advanced view` styles.
  [petschki]

- Refactor `TinyMCE` implementation: reuse already registered pattern from
  the registry. This fixes initialization issues and duplicated chunk loading.
  [petschki]

- Fix toolbar buttons visibility based on current selected layout template
  or customized layout.
  [petschki]

- Fix App Tile addForm modal event handling.
  [petschki]

- Fix for `#547 <https://github.com/plone/plone.app.mosaic/issues/547>`_
  [frapell, petschki]

- Fix for `#541 <https://github.com/plone/plone.app.mosaic/issues/541>`_
  [petschki]


3.0.2 (2023-04-24)
------------------

- JavaScript: Upgrade dependencies.
  [thet]

- Correctly await the TinyMCE initialization and avoid TinyMCE double initialization.
  [thet]

- Fix CI: Let the GitHub Actions run on this 3.0.x branch.
  [thet]

- Fix CI builds which were failing with "pip: error: no such option: --install-option"
  [fredvd, thet]

- Re-activate Robottests.
  [petschki]


3.0.1 (2023-02-24)
------------------

- Set modal closeOnClick to false to prevent modal closing when selecting text.
  (#522)
  [lenadax]

- Disable ability to edit the Discussion, Document byline, Related Items and
  Keywords tiles. (#517)
  [frapell]

- Define some webpack optimizations for generated chunks
  [frapell]


3.0.0 (2022-12-12)
------------------

- Fix saving/editing custom layouts and remove TTW layouts editing in the controlpanel.
  [petschki]

- Refactor resource bundles: use only one mosaic bundle.
  [petschki]


3.0.0b1 (2022-11-25)
--------------------


- Add upgrade steps to cleanup resource registry.
  [petschki]

- Upgrade JS dependencies and GHA config.
  [petschki]


3.0.0a6 (2022-08-17)
--------------------

- Fix saving TinyMCE content when editing source code.
  [petschki]

- Fix saving data in properties modal which got lost after saving mosaic page.
  [petschki]

- generalization in modal positioning (top center)
  [petschki]


3.0.0a5 (2022-08-02)
--------------------

- Code cleanup in properties modal.
  [petschki]

- Fix moving Tiles when there are `max-columns` tiles within a row.
  [petschki]

- Layout column handle drag/drop fixes and cleanup.
  [petschki]


3.0.0a4 (2022-07-22)
--------------------

- Fixed properties modal.
  [petschki]

- Update to mockup 5.0.0-alpha.18
  [petschki]


3.0.0a3 (2022-07-20)
--------------------

- Update to mockup 5.0.0-alpha.17 -> This fixes file upload in modal forms.
  [petschki]

- Fixed old upgrade step that tried to set plone.lessvariables.
  Ignore this on Plone 6, because it fails.
  [maurits]


3.0.0a2 (2022-07-07)
--------------------

- Update to mockup 5.0.0-alpha.12
- Packaging fixes
  [petschki]


3.0.0a1 (2022-06-28)
--------------------

- Refactoring of mosaic editor:

  - ES6 class construction
  - use mockup `pat-tinymce`
  - use mockup `pat-plone-modal`
  - get rid of $.mosaic initialization
  - start getting rid of jQuery (uncompleted)

  [petschki]

- Do not load mosaic editor on babel add form (`++addtranslation++...`).
  [jensens]

- pyupgrade, black, isort
  [jensens]

- Remove buildout and use mxdev/Makefile based approach.
  Plone 6 only.
  [jensens]

- Remove obsolete BS3 demo.
  [jensens]

- Add row columns presets feature for the row stiles
  [balavec]

- Fix advanced mode tile insert
  [balavec]

- Update for Bootstrap 5
  [agitator]


2.2.5 (2022-06-28)
------------------

- Bugfix: Use TinyMCE `getContent()` to get editor contents on save
  [frapell]

- Add ``bootstrapPath`` less variable.
  Now the bundle can be built with ``plone-compile-resources``.
  Contains an upgrade step.
  [thet]

- Fix Flake8 errors
  [jugmac00]


2.2.4 (unreleased, no changes)
------------------------------


2.2.3 (2020-07-02)
------------------

- Remove obsolete ``mockup-patterns-base`` -> use ``pat-base``
  [petschki]

- fix TinyMCE drop-down menus in toolbar by implementing ``ui_container`` option
  [petschki]


2.2.2 (2020-04-07)
------------------

- Fix ``plone.app.contenttypes`` dependency for Plone 5.1
  [agitator]

- Improve TinyMCE toolbar sticky computation
  [frapell]

- fix .mosaic-width-quarter/.mosaic-width-three-quarters grid CSS to wrap correctly
  [petschki]

- refactor mosaic-grid.less imports to avoid duplicated CSS selectors. (#453)
  [petschki]

- be more specific when removing top-margin
  [petschki]

- safely read tile weight from registry
  [petschki]

- refactor test-suites and add robot-tests
  [petschki]

- Fix pip install command in ``.travis.yml``
  [staeff]

- Fix byte-string join in ``main_template.py``
  [1letter]

- Bug-fix in robot test
  [1letter]


2.2.1 (2019-02-21)
------------------

Bug fixes:

- add ``plone-container-xl`` width for mosaic-rows and fix layout when left toolbar is enabled/expanded
  [petschki]

- Fix action button sorting (see #439)
  [petschki]

- Fix issue with renamed IRichTextBehavior class
  [petschki]

- Plone 5.1 compatible versions
  [petschki]


2.2.0 (2019-02-20)
------------------

New features:

- add uninstall profile for Plone versions >= 5
  [petschki]

- add python 3 compatibility
  [petschki]

Bug fixes:

- when deleting custom layout within ``manage custom layouts`` do not show currently selected layout in ``replacement layout`` listing.
  [petschki]

- Add styles to remove top-margin on first elements in a grid-cell
  [MrTango]


2.1.1 (2018-05-17)
------------------

- Fluid row styles only make sense on pages without portlets.
  In Plone 5.1.3 we can check that automatically (with plone.app.layout 2.8.0) and those styles are only active if no portlet columns are shown.
  [agitator]


2.1.0 (2018-04-13)
------------------

New features:

- Add functionality for fluid (full width) rows.
  [agitator, davilima6]

- Add documentation for advanced editor features.
  [agitator, davilima6]

Bug fixes:

- Image in "Existing-Content" Tile scaled width only, height was kept and aspect-ratio broke.
  Fixes https://github.com/plone/plone.app.standardtiles/issues/83.
  [jensens]

- Hide dependencies - like blocks and tiles - of Mosaic from appearing at Plone site setup.
  This reduces confusion and removes clutter from the setup screen.
  [jensens]

- Transform: Acquire a safe context or the portal object.
  In cases of a 404 page, the context is a browser view.
  [thet]

- Imports are Python3 compatible
  [b4oshany]

- Cleanup old code that would initialize TinyMCE several times for richtext tiles
  Fixes `issue 407 <https://github.com/plone/plone.app.mosaic/issues/407>`_.
  [frapell]


2.0rc8 (2017-09-05)
-------------------

WARNING: Upgrading from plone.app.mosaic 1.x will make pages with mosaic layout
look empty until plone.app.blocks has been upgraded (upgrade steps been run).
After upgrade, you may need to manually tweak Plone registry to only display
the desired tiles.

Bug fixes:

- Fix regression in 2.0.rc7 where removal of dead code was not completed
  resulting in a runtime error
  [datakurre]


2.0rc7 (2017-08-21)
-------------------

New features:

- Add simple descriptions for all the tiles listed in the docs.
  [cguardia]

- Allow to nest columns inside a cell
  [frapell]

- Allow to include custom CSS on rows
  [frapell]

Bug fixes:

- Fix issue where default rich text tiles had context menu
  from legacy HTML table tile
  [datakurre]

- Fix issue where TinyMCE was broken in properties overlay
  [datakurre]

- Fix issue where title field value was not set on some IE version
  [datakurre]

- Fix issue where block elements with display 'flex' were not blurred
  [datakurre]


2.0rc5 (2017-04-06)
-------------------

New features:

- Add support for optiona ``permission``-key in content layout manifests
  [datakurre]

Bug fixes:

- Fix grid and row styles for anonymous
  [agitator]

- Fix issue where global TinyMCE setting for paste_as_text was not
  respected
  [datakurre]

- Fix issue where Mosaic Editor was activated on babel edit view
  [datakurre]

- Fix issue where Mosaic transforms did fire for ESI requests for ESI
  tile helper views
  [datakurre]

- Fix issue where multiple tile configurations from the same page were being
  autosaved at the same time causing write conflict errors
  [datakurre]

- Fix issue where configured text tile content was not removed from the server
  when tile was deleted
  [datakurre]

Other changes:

- Remove unneeded unittest2 imports
  [tomgross]


2.0.0rc4 (2016-12-13)
---------------------

New features:

- Show layouts description in Mosaic Select Layout overlay
  [annegilles]

Bug fixes:

- Disable non-functional table of contents tile by default
  [datakurre]

- Fix issue where toolbar menus were initially hidden on custom layout
  [datakurre]

- Fix issue where TinyMCE format menu was not visible
  [datakurre]

- Fix issue where default layouts did not work properly, because they were
  registered as unicode strings when encoded ASCII strings were required
  [datakurre]

- Fix to disable layout editor when edit form has a status message
  (which is usually a validation error message) as workaround for
  editor not being able to display validation errors
  [datakurre]


2.0.0rc3 (2016-11-27)
---------------------

WARNING: Migration from 1.0.0 to 2.0.0 may still have unsolved issues.

New features:

- In the ``BodyClass`` transform, retrieve the content layout path from
  ILayoutAware provided method which also considers default paths registered in
  the registry. Fixes no layout classes added to the body tag with default
  content layouts for types.
  [thet]

- Show layouts description in Mosaic Select Layout overlay
  [annegilles]

- Include source code button into TinyMCE toolbar by default
  [datakurre]

Bug fixes:

- ``plone_view/mark_view`` was deprecated and removed.
  Use ``plone_layout/mark_view`` instead.
  [thet]

- Fix issue where incomplete mosaic-grid bundle definition broke
  Plone bundle merge
  [datakurre]
- Enhance documentation
  [agitator, AnneGilles, krissik, staeff]

- Fixes problems introduces with grid responsive styles
  [agitator]


2.0.0rc2 (2016-09-15)
---------------------

Bug fixes:

- Fix issue where layout menu was misplaced in Mosaic toolbar
  [datakurre]


2.0.0rc1 (2016-09-15)
---------------------

WARNING: Migration from 1.0.0 to 2.0.0 may still unsolved have issues.

Breaking changes:

- Drop compatibility with Plone 4.3. For Plone 4.3 support, please use
  plone.app.mosaic < 2.0
  [datakurre, jensens]

- Depend on adapterized plone.app.blocks >= 4.0.0
  [jensens]

- Depend on plone.app.contenttypes (for GS install profile)
  [jensens]

- Move to using plone.app.standardtiles.html instead of
  the deprecated plone.app.standardtiles.rawhtml
  [vangheem]

- No longer use special HTML tiles that do not work in reusable layouts.
  These tiles are now all deprecated: table, numbers, bullets, text,
  subheading, heading
  [vangheem]

- Remove use image and attachment tiles as they are now deprecated
  [vangheem]

- Move custom layout from 'content' to 'customContentLayout' attribute
  [datakurre]

- Replace Deco-grid styles with Bootstrap mixins form mixins.grid.plone.less.
  Allows to use override grid system using standard mosaic class names.
  Main purpose is to unify the edit and view of your layout
  (fixes https://github.com/plone/plone.app.mosaic/issues/231).
  [agitator]

New features:

- Customize add form for types that have ILayoutAware enabled so that it just
  presents a title/description field
  [vangheem]

- Provide outline mode to be able to inspect rows and tiles
  [datakurre]

- Add preview button (disabled by default) for previewing currently edited
  layout
  [datakurre]

- Add a new raw embed tile
  [agitator]

- Saving a layout will now save default values for html tiles on the
  reusable layout.
  [vangheem]

- Provide better use of permissions in UI and enforcements on the server
  [vangheem]

- Enhance layout selector styles
  [vangheem]

- Hide plone toolbar when mosaic editor is active
  [vangheem]

- Move tile remove button onto tile instead of in toolbar
  [vangheem]

- Rename "Close" to "Done" on properties form.
  [vangheem]

- Add sitelayouts-meta.zcml, which allows enabling site layouts in
  buildout with ``zcml = plone.app.mosaic-meta:sitelayouts-meta.zcml``
  [datakurre]

Bug fixes:

- Handle missing tiles and tile configuration with layout editor where it
  doesn't destroy user's ability to still edit the layout/tiles.
  [vangheem]

- Fix bug when tinymce editor would no longer work when dragging one rich text
  tile around another rich text tile.
  [vangheem]

- Fixes TinyMCE focus issues, disables row merging
  [vangheem]

- Fix TinyMCE Insert Image search results to have fixed maximum height
  to prevent it from flowing over viewport
  [datakurre]

- Fix fieldset tabbing not working after user edits field tiles
  [vangheem]

- Fix pasting into title, description fields
  [vangheem]

- Use POST to render tiles through the editor so default query parameters
  provided in url can be utilized with latest plone.tiles
  [vangheem]

- Fix problem where layouts could be saved without a name
  [vangheem]

- Fix table context menu overlapping modals
  [vangheem]

- Fix default layout image not showing properly
  [vangheem]

- Fix modal to be structured like other plone modals
  [vangheem]

- Fix to not set own overhead space of edit modal, the default should apply
  [jensens]

- Fix reference to default layout preview image
  [vangheem]

- Fix issue where pattern settings are not applied to the body tag for mosaic
  layouts
  [jensens]

- Fix issue where plone_pattern_setting view lookup ran into empty
  (now renders all)
  [jensens]

Refactoring:

- Move list of valid layout view names for LayoutWidget in a module variable,
  so it can be extended on demand
  [jensens]

- Remove superfluous empty testing gs profile and its zcml
  [jensens]

- Log warning if plone_pattern_settings view was not found
  [jensens]

- Fix robot tests in docs to no run into timing traps
  [jensens, gforcada]

- Use buildout.coredev version pins
  [gforcada]

- Update testing infrastructure
  [gforcada]

- Make layouts HTML valid
  [gforcada]

- Add Webpack based frontend development flow
  [datakurre]


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

- Fix issue where check could not add tile with required selection field
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
- Add HTML tag language transform to set correct language for HTML site layouts
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
