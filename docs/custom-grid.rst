.. _section_custom_grid:
.. index:: Custom Grid

Using a Custom Grid
===================

Mosaic uses specific classnames which define the basic structure using rows and columns.
The default grid system is based on Bootstrap, the default grid system from Plone 5.

Integration of styles on to those classes is done by mixins in less, as you can see defined in mosaic.grid.less.
Mixins that we use are the ones that come from mixin.grid.plone.less within the Barceloneta theme.

Mosaic for now only supports full, half, thirds and quarters for the definiton, that you find in mixin.grid.plone.less.
If you want to use your own grid system, just override the mixin classes with mixins of your choice.

Pro Tip
-------
You problably won't want responsive styles for your edit view, because then you don't see to which position you're moving your tiles otherwise when editing on a smaller device.
