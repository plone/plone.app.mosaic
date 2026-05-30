# Diátaxis Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the `plone.app.mosaic` documentation using the Diátaxis framework to improve usability and maintainability.

**Architecture:** Moving from a flat structure to a four-quadrant structure:
- **Tutorials**: `docs/tutorials/`
- **How-to Guides**: `docs/how-to/`
- **Reference**: `docs/reference/`
- **Explanation**: `docs/explanation/`

**Tech Stack:** Sphinx, sphinx-book-theme, MyST (for new files).

## Tasks

### Task 1: Initialize Structure

**Files:**
- Create directories: `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/`

**Step 1: Create directories**
```bash
mkdir -p docs/tutorials docs/how-to docs/reference docs/explanation
```

### Task 2: Migrate Reference Section (Information-oriented)

**Files:**
- `docs/tiles.rst` -> `docs/reference/tiles.rst`
- `docs/registry-reference.rst` -> `docs/reference/registry.rst`
- `docs/content-layouts.rst` (split) -> `docs/reference/content-layouts.rst`

**Step 1: Move and refactor `tiles.rst`**
Move to `docs/reference/tiles.rst`.

**Step 2: Move and refactor `registry-reference.rst`**
Move to `docs/reference/registry.rst`.

**Step 3: Extract reference bits from `content-layouts.rst`**
Move the CSS classes (`movable`, `removable`) and grid structure info to `docs/reference/layouts.rst`.

**Step 4: Commit**
```bash
git add docs/reference/
git commit -m "docs: move reference content to Diátaxis reference section"
```

### Task 3: Migrate How-to Guides (Task-oriented)

**Files:**
- `docs/installation.rst` -> `docs/how-to/install.rst`
- `docs/custom-tiles.rst` -> `docs/how-to/custom-tiles.rst`
- `docs/custom-grid.rst` -> `docs/how-to/custom-grid.rst`
- `docs/site-layouts.rst` -> `docs/how-to/site-layouts.rst`
- `docs/content-layouts.rst` (remaining) -> `docs/how-to/manage-layouts.rst`

**Step 1: Move and refactor guides**
Move existing action-oriented files to `docs/how-to/`.

**Step 2: Split `getting-started.rst`**
Extract the "Saving a custom layout" part to `docs/how-to/save-custom-layout.rst`.

**Step 3: Commit**
```bash
git add docs/how-to/
git commit -m "docs: move task-oriented content to Diátaxis how-to section"
```

### Task 4: Migrate/Create Tutorials (Learning-oriented)

**Files:**
- `docs/getting-started.rst` -> `docs/tutorials/getting-started.rst`

**Step 1: Refactor `getting-started.rst`**
Ensure it follows a "lesson" format: "We will build a simple page...". Remove task-level alternatives.

**Step 2: Commit**
```bash
git add docs/tutorials/
git commit -m "docs: refactor getting started into a true Diátaxis tutorial"
```

### Task 5: Create Explanation Section (Understanding-oriented)

**Files:**
- Create: `docs/explanation/architecture.rst`
- Create: `docs/explanation/data-storage.rst`

**Step 1: Write Architecture Explanation**
Explain Panels, Layouts, and Tiles.

**Step 2: Write Data Storage Explanation**
Explain the Rich Text vs HTML tile storage (cognitive knowledge).

**Step 3: Commit**
```bash
git add docs/explanation/
git commit -m "docs: add Diátaxis explanation section for architecture and concepts"
```

### Task 6: Finalize and Verify

**Files:**
- Modify: `docs/index.rst`
- Modify: `docs/conf.py` (if paths changed)

**Step 1: Update `index.rst`**
Update toctree to point to new Diátaxis paths.

**Step 2: Verify build**
Run: `tox -e docs`
Check for broken links.

**Step 3: Commit**
```bash
git add docs/index.rst
git commit -m "docs: final Diátaxis reorganization of the documentation"
```
