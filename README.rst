Plone Mosaic
============

**Plone Mosaic** is a site builder and layout solution for Plone.

Version Information
-------------------

- Version 2.2.x -> Plone 5.1 + 5.2
- Version 3.0.x -> Plone 6

Concepts
--------

Mosaic, Blocks_ and Tiles_ provide a simple, yet powerful way to manage the pages on your Plone website.
At their core, they rely on semantic HTML and resources with valid, publishable URLs.

**Mosaic Editor** editor is a visual editor for pages rendered using Blocks.
It relies on a grid system to place tiles onto a page in an intuitive, WYSIWYG, drag-and-drop manner.
Using Mosaic Editor, it is easy to compose pages with complex, balanced and visually appealing layouts.

Currently, the Mosaic Editor is activated, when any content with *Mosaic layout* view active is being edited.
(Mosaic layout is available for any content with *Layout support* behavior enabled.)

**Blocks** is a rendering algorithm based on HTML markup conventions.
A page managed by Mosaic Editor is stored as a simple HTML document.
It is representing the actual content of that page as a standalone, publishable resource devoid of any site layout content (e.g. global navigation elements).
This is referred to as *content layout*.

**Tiles** represent the dynamic portions of a page.
At its most basic level, a tile is simply an HTML document with a publishable URL.

In practice, tiles are usually implemented as browser views deriving from the ``Tile`` base class and registered with the ``<plone:tile />`` ZCML directive.
This allows tiles to have some basic metadata and automatically generated edit forms for any configurable aspects, which Mosaic will expose to users.
See `plone.tiles`_ for examples.

When work with tiles in Mosaic Editor, there are three types of tiles:

Text tiles
    Static HTML markup (WYSIWYG-edited text) placed into the content or site layout.
    Strictly speaking, text tiles are not tiles in that they do not involve any tile fetching or merging - instead they are stored as part of the page or site layout.
    To the user, however, a text tile can be moved around and managed like any other.

Field tiles
    Render the value of a metadata field such as the title or description.
    The values of field tiles may be edited in-place in the page,
    but the value is stored in the underlying field and can be indexed in the catalog, used for navigation and so on.
    In practice, a field tile is an instance of the special tile ``plone.app.standardtiles.fields`` with the field name passed as a parameter.

App tiles
    Any other type of dynamic tile. Examples may include a folder listing, a media player, a poll or pretty much anything else you can think of.

..  _Blocks: https://pypi.python.org/pypi/plone.app.blocks
..  _Tiles: https://pypi.python.org/pypi/plone.app.tiles
..  _plone.tiles: https://pypi.python.org/pypi/plone.tiles


Advanced Editor usage
---------------------

Advanced mode
    If you press the "alt" key you will be shown the layout structure, labels for your tiles and css classes for rows.

Custom classes on rows
    Also in the advanced mode, you're able to add custom classes on rows by double clicking the displayed row class.

Subcolumns
    In order to nest columns inside a cell, drag a tile, then press the "ctrl" key and drop the tile close to an
    existing one, either before or after it, in accordance to the shown insert marker.

Fluid rows
    For fluid (full width) rows select any tile in the row and choose "Fluid" from the "Format" menu.
    Fluid row styles only make sense on pages without portlets. In Plone 5.1.3 we can check that automatically
    (with plone.app.layout 2.8.0) and those styles are only active if no portlet columns are shown.
    Since version 3 and Bootstrap 5 there's a feature for `fluid-row-background` which streches the background of
    the row to 100% width but keeps the columns to the page container width.


Installation
------------

**Plone Mosaic** is installed by building a Plone site with package
`plone.app.mosaic`` and activating its **Plone Mosaic** add-on.

*The dependencies are already version pinned in Plones ecosystem.*

After the add-on activation, the new content layout and editor support can be
enabled for any content type by enabling behaviors **Layout support** and
**Drafting support**.


An example ``buildout.cfg`` for Plone ``6.x`` could look like this::

    [buildout]
    extends =
        https://dist.plone.org/release/6.0-latest/versions.cfg
        https://dist.plone.org/release/6.0-latest/versions-ecosystem.cfg

    parts =
        instance
        ...

    [instance]
    recipe = plone.recipe.zope2instance
    eggs =
        Plone
        plone.app.mosaic

    ...

