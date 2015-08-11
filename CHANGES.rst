Changelog
=========

1.0a4 (unreleased)
------------------

- Change text formatting actions from top toolbar to inline TinyMCE toolbars
  [datakurre]

- Change remove tile icon from inline close icons to top toolbar button
  [datakurre]

- Change BS3 as default grid system on Plone 5
  [vangheem]

- Add layout editor control panel for Plone 5
  [vangheem]

- Add link and unlink actions
  [datakurre]

- Add table tile
  [datakurre]

- Remove grid system from example layouts (to use configured default grid)
  [vangheem]

- Fix issue where title field tile and content tile being use on same page
  would cause weird issues with saving title values
  [vangheem]

- Fix situation where layout editor broke with broken or missing tiles
  [vangheem]

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
