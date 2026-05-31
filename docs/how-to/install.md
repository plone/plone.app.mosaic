---
myst:
  html_meta:
    "description": "How to install and activate Plone Mosaic in your Plone site."
    "property=og:description": "How to install and activate Plone Mosaic in your Plone site."
    "property=og:title": "Installation"
    "keywords": "Plone, Mosaic, Installation, Activation"
---

(installation)=

# Installation

**Plone Mosaic** is a complex add-on with several dependencies.
For Plone 6.2 and later, we recommend installing it using `pip`.

## Using pip

To install `plone.app.mosaic` in your Plone environment, add it to your project's dependencies (e.g., in `requirements.txt` or `setup.py`):

```text
plone.app.mosaic
```

Then run your project's install command, typically:

```shell
pip install -r requirements.txt
```

## Activation

After the package is installed and your Plone instance is started, you must activate it through the web:

1. Navigate to {menuselection}`Site Setup` in your Plone site.
2. Click on {guilabel}`Add-ons`.
3. Find **Mosaic** in the list of available add-ons.
4. Click {guilabel}`Activate`.

```{note}
Activation will also install required dependencies like `plone.app.standardtiles`, `plone.app.blocks`, and `plone.tiles`.
```
