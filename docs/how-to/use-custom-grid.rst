.. _section_custom_grid:

Using a Custom Grid
===================

Mosaic uses specific class names to define the layout structure using rows and columns.
In Plone 6, the default grid system is based on **Bootstrap 5**.

Standard Grid Structure
-----------------------

Mosaic generates rows and columns that typically look like this in the HTML:

.. code-block:: html

   <div class="row">
     <div class="col-md-6 mosaic-column">
       <!-- tiles -->
     </div>
     <div class="col-md-6 mosaic-column">
       <!-- tiles -->
     </div>
   </div>

Customizing via SCSS
--------------------

In Plone 6, you should customize the grid styles using **SCSS**.
The layout engine relies on classes like ``mosaic-grid-row`` and ``mosaic-column``.

If you want to use a different grid system (like CSS Grid or a different framework), you will need to:

1.  Override the default Mosaic CSS/SCSS.
2.  Ensure your theme provides the necessary styling for the column classes Mosaic generates.

Supported Column Spans
----------------------

By default, Mosaic supports:

*   Full width (100%)
*   Halves (50%)
*   Thirds (33.3%)
*   Quarters (25%)

These are mapped to the appropriate Bootstrap ``col-md-*`` classes.

Responsive Considerations
-------------------------

.. tip::
   While your theme should be responsive, you might want to maintain a fixed-width grid in the **Mosaic Editor** itself. This ensures that the drop zones and tile positions remain predictable for the editor while they are composing the page.
