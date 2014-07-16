# -*- coding: utf-8 -*-
import os

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom ones.
extensions = [
    "sphinxcontrib_robotframework",
]

# Enable Robot Framework tests during Sphinx compilation.
sphinxcontrib_robotframework_enabled = True
sphinxcontrib_robotframework_quiet = True

# Configure Robot Frameowrk tests to use Firefox
sphinxcontrib_robotframework_variables = {
    "BROWSER": "Firefox"
}

# The suffix of source filenames.
source_suffix = '.rst'

# The encoding of source files.
source_encoding = 'utf-8'

# The master toctree document.
master_doc = 'index'

# General information about the project.
project = os.environ.get('SPHINX_PROJECT', u'Plone Mosaic')
copyright = os.environ.get('SPHINX_COPYRIGHT', u'Plone Foundation')

# coming with Sphinx (named 'sphinx.ext.*') or your custom ones.
extensions = ['sphinxcontrib_robotframework']

# General information about the project.

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
#
# The short X.Y version.
version = '1.0'
# The full version, including alpha/beta/rc tags.
release = '1.0.0'

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
exclude_patterns = ['_*.rst']

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = 'sphinx'

# -- Options for HTML output --------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
import sphinx_rtd_theme
html_theme = 'sphinx_rtd_theme'
html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]
html_static_path = ['_static']
templates_path = ['_templates']

# -- Options for LaTeX output -------------------------------------------------

latex_elements = {
    'papersize': 'a4paper',
}

latex_documents = [
    # (source target file, target latex name, document title,
    #  author, document clas [howto/manual]),
    ('index', 'plone-mosaic.tex', u'Plone Mosaic',
     u'Plone Foundation', 'manual'),
]
