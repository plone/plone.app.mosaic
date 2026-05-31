---
myst:
  html_meta:
    "description": "Plone Mosaic allows you to define global site layouts and override them on specific contents or sections."
    "property=og:description": "Plone Mosaic allows you to define global site layouts and override them on specific contents or sections."
    "property=og:title": "Plone Mosaic"
    "keywords": "Plone, Mosaic, Layout, Site Builder"
---

# Plone Mosaic

**Plone Mosaic** allows you to define global site layouts and override them on specific contents or sections.
You can then compose the content of the page using the Mosaic editor.

The Mosaic editor lets you insert blocks (a.k.a. tiles) into the content of the page so that you can easily build custom composite pages for your contents on the fly.

**Plone Mosaic** works with Plone 6.2 and later.

```{grid} 1 1 2 2
:gutter: 3

:grid-item-card: Tutorials
:link: tutorials/getting-started
:link-type: doc

Step-by-step guides for beginners to get started with Plone Mosaic.

:grid-item-card: How-to guides
:link: how-to/index
:link-type: doc

Practical task-oriented guides for common Mosaic operations.

:grid-item-card: Reference
:link: reference/index
:link-type: doc

Technical details, configuration options, and default tiles list.

:grid-item-card: Explanation
:link: explanation/index
:link-type: doc

Conceptual overviews and architectural design of Plone Mosaic.
```

```{toctree}
:maxdepth: 2
:caption: Tutorials
:hidden:

tutorials/getting-started
```

```{toctree}
:maxdepth: 2
:caption: How-to guides
:hidden:

how-to/install
how-to/manage-content-layouts
how-to/save-custom-layout
how-to/manage-site-layouts
how-to/create-custom-tile
how-to/use-custom-grid
```

```{toctree}
:maxdepth: 2
:caption: Reference
:hidden:

reference/tiles
reference/layouts
reference/registry
```

```{toctree}
:maxdepth: 2
:caption: Explanation
:hidden:

explanation/architecture
explanation/data-storage
```

## Automated screenshots

The documentation uses screenshots that are automatically generated during the acceptance test execution.

To regenerate the screenshots locally, you can run:

```shell
tox -e docs-screenshots
```

This will run the subset of Robot Framework tests tagged with `robot:docs` and place the resulting images in `docs/_static/generated-screenshots/`.

## Terminology changes in Plone Mosaic

**Plone Mosaic** changes how Plone page composition works, and the new way comes with some new terms:

| Plone | Mosaic |
| :--- | :--- |
| main template | site layout |
| view template | content layout / custom layout |
| metal slots | layout panels |
| metal macros, portlets, viewlets, providers, etc... | tiles |

In short:

- For each page, a configured site layout is looked up (falling back to the old main template).
- A site layout may contain one or more panels, which are later filled from the configured content layout (or custom content layout saved into the current content item).
- Both site layout and content layout may contain one or more tiles to provide the actual context dependent content.
