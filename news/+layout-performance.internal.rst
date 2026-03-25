Performance improvements for the layout editor:

- Cache the currently selected divider element instead of querying the
  entire document on every ``mousemove`` event during drag operations.
- Use ``element.closest()`` instead of jQuery ``parents()`` traversal in
  high-frequency mousemove handlers.
- Make ``mosaicAddEmptyRows()`` idempotent: reuse existing empty rows
  instead of destroying all and recreating them after every drag/drop.
- Fix double ``.width()`` read in ``addTile`` causing unnecessary layout
  recalculation.

@petschki
