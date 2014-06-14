============
Plone Mosaic
============

**Plone Mosaic** provides modern WYSIWYG content layout editor with blocks_ and tiles_ based layouts for Dexterity content types on Plone 4.3 and newer.

Mosaic is a spiritual successor of the Plone Deco project, but is designed from ground to work side by side with the existing content.

.. _blocks: https://pypi.python.org/pypi/plone.app.blocks
.. _tiles: https://pypi.python.org/pypi/plone.app.tiles

.. include:: _robot.rst
.. figure:: _screenshots/front-page.png
.. code:: robotframework

   Capture Front Page Screenshot
       Go to  ${PLONE_URL}
       Capture page screenshot  _screenshots/front-page.png


Design concepts
===============

The current, pre-mosaics, layouts (also known as templates or views) in Plone are usually created using only one site wide *main template*.
The main template provides fillable content areas called *slots*, which are later filled with content from content type specific *view templates*.

Plone Mosaic replaces main template and view templates with the following concepts:

Site layouts
    Site layouts replace main template in providing the shared layout between content.
    In other words: everithing from <html> to </html>.
    There must always be at least one site layout, but there's no upper limit.
    Site layouts defines *panels* (similar to main template slots), which a filled with context specific content.

Content layouts
    ...


Custom layout behavior
======================

...

Custom layout view option
=========================

...


Binding layouts to contnet types
================================

...

