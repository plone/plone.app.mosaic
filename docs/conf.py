import os

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom ones.
extensions = [
    "myst_parser",
    "sphinx_copybutton",
    "sphinx_design",
]

# The master toctree document.
master_doc = "index"

# General information about the project.
project = os.environ.get("SPHINX_PROJECT", "Plone Mosaic")
copyright = os.environ.get("SPHINX_COPYRIGHT", "Plone Foundation")

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
#
# The short X.Y version.
version = "1.0"
# The full version, including alpha/beta/rc tags.
release = "4.0.0"

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
exclude_patterns = ["_*.md", "_*.rst"]

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = "monokai"

# -- Options for HTML output --------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.

html_theme = "plone_sphinx_theme"
html_static_path = ["_static"]

html_theme_options = {
    "repository_url": "https://github.com/plone/plone.app.mosaic",
    "use_repository_button": True,
    "use_issues_button": True,
    "use_edit_page_button": True,
    "path_to_docs": "docs",
    "repository_branch": "main",
    "logo": {"text": "Plone Mosaic"},
}

# For "Edit this page" links
html_context = {
    "edit_page_url_template": "https://github.com/plone/plone.app.mosaic/edit/main/docs/{{ file_name }}",
}

# -- Options for LaTeX output -------------------------------------------------

latex_elements = {
    "papersize": "a4paper",
}

latex_documents = [
    # (source target file, target latex name, document title,
    #  author, document clas [howto/manual]),
    ("index", "plone-mosaic.tex", "Plone Mosaic", "Plone Foundation", "manual"),
]
