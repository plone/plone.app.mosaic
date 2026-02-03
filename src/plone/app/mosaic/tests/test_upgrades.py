"""Tests for the upgrade step that cleans up mosaic-grid-cell classes."""

from plone.app.mosaic.upgrades import _cleanup_mosaic_grid_cell_classes
from plone.app.mosaic.upgrades import MOSAIC_WIDTH_TO_BOOTSTRAP

import unittest


class TestCleanupMosaicGridCellClasses(unittest.TestCase):
    """Unit tests for _cleanup_mosaic_grid_cell_classes function."""

    def test_keeps_mosaic_grid_cell(self):
        """Test that mosaic-grid-cell class is preserved."""
        old = "mosaic-grid-cell col"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("mosaic-grid-cell", new)
        self.assertFalse(changed)

    def test_adds_mosaic_grid_cell_if_missing(self):
        """Test that mosaic-grid-cell is added if missing."""
        old = "col"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertTrue(new.startswith("mosaic-grid-cell"))
        self.assertTrue(changed)

    def test_keeps_mosaic_position_0(self):
        """Test that mosaic-position-0 is preserved."""
        old = "mosaic-grid-cell col mosaic-position-0"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("mosaic-position-0", new)
        self.assertFalse(changed)

    def test_removes_obsolete_position_classes(self):
        """Test that obsolete position classes are removed."""
        old = "mosaic-grid-cell mosaic-position-leftmost mosaic-position-half col"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertNotIn("mosaic-position-leftmost", new)
        self.assertNotIn("mosaic-position-half", new)
        self.assertIn("col", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_full(self):
        """Test conversion of mosaic-width-full to col-12."""
        old = "mosaic-grid-cell mosaic-width-full"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-12", new)
        self.assertNotIn("mosaic-width-full", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_half(self):
        """Test conversion of mosaic-width-half to col-sm-6."""
        old = "mosaic-grid-cell mosaic-width-half"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-sm-6", new)
        self.assertNotIn("mosaic-width-half", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_quarter(self):
        """Test conversion of mosaic-width-quarter to col-sm-6 col-lg-3."""
        old = "mosaic-grid-cell mosaic-width-quarter"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-sm-6", new)
        self.assertIn("col-lg-3", new)
        self.assertNotIn("mosaic-width-quarter", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_three_quarters(self):
        """Test conversion of mosaic-width-three-quarters."""
        old = "mosaic-grid-cell mosaic-width-three-quarters"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-sm-6", new)
        self.assertIn("col-lg-9", new)
        self.assertNotIn("mosaic-width-three-quarters", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_third(self):
        """Test conversion of mosaic-width-third."""
        old = "mosaic-grid-cell mosaic-width-third"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-sm-6", new)
        self.assertIn("col-lg-4", new)
        self.assertNotIn("mosaic-width-third", new)
        self.assertTrue(changed)

    def test_converts_mosaic_width_two_thirds(self):
        """Test conversion of mosaic-width-two-thirds."""
        old = "mosaic-grid-cell mosaic-width-two-thirds"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col-sm-6", new)
        self.assertIn("col-lg-8", new)
        self.assertNotIn("mosaic-width-two-thirds", new)
        self.assertTrue(changed)

    def test_removes_unknown_mosaic_width_classes(self):
        """Test that unknown mosaic-width-* classes are removed."""
        old = "mosaic-grid-cell mosaic-width-unknown col"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertNotIn("mosaic-width-unknown", new)
        self.assertTrue(changed)

    def test_keeps_col_classes(self):
        """Test that col and col-* classes are preserved."""
        old = "mosaic-grid-cell col col-md-6 col-lg-4"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col", new)
        self.assertIn("col-md-6", new)
        self.assertIn("col-lg-4", new)
        self.assertFalse(changed)

    def test_keeps_custom_classes(self):
        """Test that custom classes are preserved."""
        old = "mosaic-grid-cell col my-custom-class another-class"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("my-custom-class", new)
        self.assertIn("another-class", new)
        self.assertFalse(changed)

    def test_adds_col_if_no_col_class_present(self):
        """Test that col is added if no col-* variant exists."""
        old = "mosaic-grid-cell mosaic-position-0"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("col", new)
        self.assertTrue(changed)

    def test_does_not_add_col_if_col_variant_present(self):
        """Test that col is not added if col-* variant exists."""
        old = "mosaic-grid-cell col-12"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        # Should not add extra 'col' if col-12 is present
        classes = new.split()
        col_count = sum(1 for c in classes if c == "col")
        self.assertEqual(col_count, 0)  # col-12 is enough, no 'col' added

    def test_complex_cleanup(self):
        """Test a complex real-world scenario."""
        old = "mosaic-grid-cell mosaic-width-half mosaic-position-leftmost custom-style"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertIn("mosaic-grid-cell", new)
        self.assertIn("col-sm-6", new)
        self.assertIn("custom-style", new)
        self.assertNotIn("mosaic-width-half", new)
        self.assertNotIn("mosaic-position-leftmost", new)
        self.assertTrue(changed)

    def test_no_change_for_clean_classes(self):
        """Test that already clean classes don't trigger changes."""
        old = "mosaic-grid-cell col-12 mosaic-position-0"
        new, changed = _cleanup_mosaic_grid_cell_classes(old)
        self.assertEqual(old, new)
        self.assertFalse(changed)

    def test_mapping_completeness(self):
        """Test that all expected width classes are in the mapping."""
        expected_classes = [
            "mosaic-width-full",
            "mosaic-width-half",
            "mosaic-width-quarter",
            "mosaic-width-three-quarters",
            "mosaic-width-third",
            "mosaic-width-two-thirds",
        ]
        for cls in expected_classes:
            self.assertIn(cls, MOSAIC_WIDTH_TO_BOOTSTRAP)
