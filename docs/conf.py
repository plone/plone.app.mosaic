import os
import sphinx.directives
import sphinx.directives.code
sphinx.directives.CodeBlock = sphinx.directives.code.CodeBlock

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom ones.
extensions = [
    "sphinxcontrib_robotframework",
    "sphinx_copybutton",
]

# Enable Robot Framework tests during Sphinx compilation.
sphinxcontrib_robotframework_enabled = os.environ.get("ROBOT_ENABLED", "True") == "True"
sphinxcontrib_robotframework_quiet = True

# Configure Robot Frameowrk tests to use Chrome
sphinxcontrib_robotframework_variables = {"BROWSER": "headlesschrome"}

# The suffix of source filenames.
source_suffix = ".rst"

# The encoding of source files.
source_encoding = "utf-8"

# The master toctree document.
master_doc = "index"

# General information about the project.
project = os.environ.get("SPHINX_PROJECT", "Plone Mosaic")
copyright = os.environ.get("SPHINX_COPYRIGHT", "Plone Foundation")


# General information about the project.

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
#
# The short X.Y version.
version = "1.0"
# The full version, including alpha/beta/rc tags.
release = "1.0.0"

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
exclude_patterns = ["_*.rst"]

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = "sphinx"

# -- Options for HTML output --------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.

html_theme = "sphinx_book_theme"
html_static_path = ["_static"]
templates_path = ["_templates"]
html_theme_options = {
    "repository_url": "https://github.com/plone/plone.app.mosaic",
    "use_repository_button": True,
    "use_issues_button": True,
    "use_edit_page_button": True,
    "path_to_docs": "docs",
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
