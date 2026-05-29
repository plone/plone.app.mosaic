# Cleanup Robot Framework Documentation Rot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all dead Robot Framework code blocks, includes, and broken figure references to achieve a clean, modern documentation state.

**Architecture:** Systematic removal of code blocks and orphaned files. Commenting out missing figure references to eliminate build warnings and broken UI.

## Tasks

### Task 1: Remove Robot code blocks and includes

**Files:**
- Modify: `docs/getting-started.rst`
- Modify: `docs/site-layouts.rst`
- Modify: `docs/content-layouts.rst`
- Modify: `docs/_typeviews.rst`

**Step 1: Remove code blocks**
Delete all blocks starting with `..  code:: robotframework` and their indented content.

**Step 2: Remove includes**
Delete `..  include:: _robot.rst`.

**Step 3: Comment out missing screenshots**
Find `..  figure:: _screenshots/` or `..  image:: _screenshots/` and comment them out.

**Step 4: Commit**
```bash
git add docs/*.rst
git commit -m "docs: remove dead robotframework code blocks and broken figures"
```

### Task 2: Delete orphaned files and directories

**Files:**
- Delete: `docs/_robot.rst`
- Delete: `docs/_selectors.robot`
- Delete: `docs/_screenshots/`

**Step 1: Delete files**
```bash
rm docs/_robot.rst docs/_selectors.robot
rm -rf docs/_screenshots
```

**Step 2: Commit**
```bash
git commit -a -m "docs: delete orphaned robot framework support files"
```

### Task 3: Verify build

**Step 1: Run build**
```bash
cd docs
make html
```
**Step 2: Verify zero warnings**
Check that there are no "image file not readable" warnings.
