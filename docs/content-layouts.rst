Content Layouts
===============


Restricting content layouts globally
------------------------------------

There is a Plone control panel to configure Mosaic called *Mosaic Layout Editor*.

..  image:: _screenshots/overview-controlpanel_mosaic-layout-editor.png

Just add **@@layouts-editor** to your sites URL. Choose the tab *Show/Hide Content Layouts*.

.. figure:: _screenshots/layouts-editor_show-hide-content-layouts.png

There you can toggle the visibility of your content layouts.


Restricting content layouts per content type
--------------------------------------------

You can restrict the choice of content layouts for each of the available
content types by adding a *manifest.cfg* to *your/product/layouts/*.

The following example was taken from *src/plone/app/mosaic/layouts/content/*
::

   [contentlayout]
   title = Basic
   description = Default content layout
   file = basic.html
   preview = basic.png

   [contentlayout]
   title = Document
   file = document.html
   for = Document
   preview = document.png

   [contentlayout]
   title = News item layout
   description = Default news item layout
   file = news_item.html
   for = News Item
   preview = news_item.png


There are three content layouts defined here.

**title**, **description**, **preview**
  The **title** and (optionally) **description** strings
  together with a prepared "thumbnail" **preview** of the respective layout
  will be shown to users when selecting one of the content layouts
  for some content item.

**for**
  The **for** setting limits for which Plone content types the content layouts
  may be selected. This may be a comma-separated list of content types.

**file**
  The **file** setting determines which html file is chosen.

So for each content layout you should provide

* a html file containing the actual layout
* a png file with a small preview
* a stanza in manifest.cfg


Restricting, who can create new content layouts
-----------------------------------------------

see issue 253

plone.resourceeditor.ManageSources protects layout editor in control panel

Restricting, who can *change* content layouts
---------------------------------------------

"change" botton hidden

plone.ManageContentLayouts will protect changing site layouts once they are enabled

see above, ask nathan

Adding unmovable tiles into content layouts
-------------------------------------------

If you want to have tiles in your layout that editors cannot move around
to other places in the current content layout through the Mosaic Editor,
you can remove *movable* from the classes definition in the Content Layouts Editor.

.. figure:: _screenshots/mosaic-layout-editor_remove-movable-class.png


Adding readonly tiles into content layouts
------------------------------------------



Restricting amount of columns available in layout
-------------------------------------------------

https://github.com/plone/plone.app.mosaic/pull/168


Adding editable HTML area (raw html tile) into content layout
-------------------------------------------------------------

ask nathan for an example, then doc it!



Editor
======

see plone.app.mosaic registry entry.xml.
this can go into your policy product.
tinyMCE features need to be added/activated for each tile


*    Hiding a tile from insert menu
*    Moving a tile in insert menu
*    Adding a new HTML template tile into insert menu
*    Adding a new custom (Python based) tile into insert menu
*    Adding a new action into TinyMCE editor #200
*    Hiding tile formats from format menu
*    Adding a new tile format into format menu
*    Hiding row formats from format menu
*    Adding a new row format into format menu
