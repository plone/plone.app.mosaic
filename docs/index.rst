============
Plone Mosaic
============

**Plone Mosaic** allows you to define global site layouts and override them on specific contents or sections. You can then compose the content of the page using the Mosaic editor.

The Mosaic editor lets you insert blocks (a.k.a. tiles) into the content of the page so that you can easily build custom composite pages for your contents on the fly.

**Plone Mosaic** works with Plone 4.3 and later.

.. toctree::
   :maxdepth: 2

   intro
   typeviews


About terminology
=================

**Plone Mosaic** changes how Plone page composition works, and the old way
is replaced with some new terms:

+---------------------------+------------------------+
| Plone                     | Mosaic                 |
+===========================+========================+
| main template             | site layout            |
+---------------------------+------------------------+
| view template             | content layout         |
|                           | / custom layout        |
+---------------------------+------------------------+
| metal slots               | layout panels          |
+---------------------------+------------------------+
| metal macros, portlets,   | tiles                  |
| viewlets, providers,      |                        |
| etc...                    |                        |
+---------------------------+------------------------+
