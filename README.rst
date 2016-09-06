Plone Mosaic
============

**Plone Mosaic** is a new layout solution for Plone.
It's built for Plone 5,
but should also work on Plone 4.3 with plone.app.widgets.
Read this introduction and `the package documentation`__ for more details how to use this package.

__  http://plone-app-mosaic.s3-website-us-east-1.amazonaws.com/latest/

.. image:: https://secure.travis-ci.org/plone/plone.app.mosaic.png?branch=master
    :alt: Travis CI badge
    :target: http://travis-ci.org/plone/plone.app.mosaic

.. image:: https://coveralls.io/repos/plone/plone.app.mosaic/badge.png?branch=master
    :alt: Coveralls badge
    :target: https://coveralls.io/r/plone/plone.app.mosaic

..  image:: https://www.herokucdn.com/deploy/button.png
    :target: https://heroku.com/deploy?template=https://github.com/plone/plone.app.mosaic

Concepts
--------

Mosaic, Blocks_ and Tiles_ provide a simple, yet powerful way to manage the pages
on your Plone website. At their core, they rely on semantic HTML and resources
with valid, publishable URLs.

**Mosaic Editor** editor is a visual editor for pages rendered using Blocks. It
relies on a grid system to place tiles onto a page in an intuitive, WYSIWYG,
drag-and-drop manner. Using Mosaic Editor, it is easy to compose pages with
complex, balanced and visually appealing layouts.

Currently, the Mosaic Editor is activated, when any content with *Mosaic
layout* view active is being edited. (Mosaic layout is available for any
content with *Layout support* behavior enabled.)

**Blocks** is a rendering algorithm based on HTML markup conventions. A page
managed by Mosaic Editor is stored as a simple HTML document representing the
actual content of that page as a standalone, publishable resource devoid of any
site layout content (e.g. global navigation elements). This is referred to as
*content layout*.

**Tiles** represent the dynamic portions of a page. At its most basic level, a
tile is simply an HTML document with a publishable URL.

In practice, tiles are usually implemented as browser views deriving from the
``Tile`` base class and registered with the ``<plone:tile />`` ZCML directive.
This allows tiles to have some basic metadata and automatically generated edit
forms for any configurable aspects, which Mosaic will expose to users. See
`plone.tiles`_ for examples.

When work with tiles in Mosaic Editor, there are three types of tiles:

Text tiles
    Static HTML markup (WYSIWYG-edited text) placed into the content or site
    layout. Strictly speaking, text tiles are not tiles in that they do not
    involve any tile fetching or merging - instead they are stored as part of
    the page or site layout. To the user, however, a text tile can be moved
    around and managed like any other.

Field tiles
    Render the value of a metadata field such as the title or description. The
    values of field tiles may be edited in-place in the page, but the value is
    stored in the underlying field and can be indexed in the catalog, used for
    navigation and so on. In practice, a field tile is an instance of the
    special tile ``plone.app.standardtiles.fields`` with the field name passed
    as a parameter.

App tiles
    Any other type of dynamic tile. Examples may include a folder listing,
    a media player, a poll or pretty much anything else you can think of.

..  _Blocks: https://pypi.python.org/pypi/plone.app.blocks
..  _Tiles: https://pypi.python.org/pypi/plone.app.tiles
..  _plone.tiles: https://pypi.python.org/pypi/plone.tiles


Installation
------------

**Plone Mosaic** is installed by building a Plone site with package
**plone.app.mosaic** and activating its **Plone Mosaic** add-on. The
package has following dependencies::

    plone.tiles >= 1.5.2
    plone.app.tiles >= 2.2.1
    plone.app.standardtiles = 1.0
    plone.app.blocks >= 3.1.0
    plone.app.drafts >= 1.0
    plone.app.widgets >= 1.8.0

A example set of version pins for Plone 5 that works with the latest
plone.app.mosaic is::

    plone.app.drafts=1.0
    plone.app.tiles=2.2.1
    plone.app.blocks=3.1.0
    plone.app.standardtiles=1.0
    plone.tiles=1.6.0
    plone.app.tiles=2.2.1

After the add-on activation, the new content layout and editor support can be
enabled for any content type by enabling behaviors **Layout support** and
**Drafting support**.


Status
------

**Plone Mosaic** is considered to be in beta phase. Most features for
the first final release are done, but
`there may still be bugs, which should be reported.`__
Not all the features of Plone Mosaic have yet easily accessible UI (e.g.
layouts can be created into *portal_resources* and bound to content types as
named views only through Zope Management Interface, ZMI).

__ https://github.com/plone/plone.app.mosaic/milestones/1.0.0


Backend development
-------------------

Plone 5 version of Plone Mosaic is available for development using
``plips/plip-mosaic.cfg`` at Plone 5 coredev-buildout.

Plone 4 version of Plone Mosaic can be developed by cloning the product
directly.

Clone and build:

..  code:: bash

    $ git clone https://github.com/plone/plone.app.mosaic
    $ cd plone.app.mosaic
    $ python bootstrap.py  # clean python 2.7 virtualenv recommended
    $ bin/buildout

Startup:

..  code:: bash

    $ bin/demo

Get started:

* open a browser at ``http://localhost:55001/plone/++add++Document``
* login as ``admin`` with password ``secret``
* save the new page
* from the *Display*-menu, select the new entry *Mosaic layout*
* click *Edit* to see the new *Mosaic Editor*

Alternatively you can also use ``bin/instance fg``.

.. For impatient types, there is also an online demo installation available:
   http://plone-app-mosaic.herokuapp.com. It needs about 60 seconds to spin up and
   it will purge all changes after about an hour of non-usage.


Frontend development
--------------------

Plone Mosaic requires javascript and css bundles, which must be manually
updated for Plone 4.3.x with:

.. code:: bash

   $ make install
   $ make clean all mode=release

The bundle can also be built with source maps and watched for changes with:

.. code:: bash

   $ npm install
   $ make clean all watch


Webpack based frontent development
----------------------------------

Plone Mosaic can be developed with Webpack running:

.. code:: bash

   $ make watch_theme

or starting the instances either manually or with ``make watch_instance``
and starting the Webpack development server with:

.. code:: bash

   $ make watch_webpack

Once you have activated theme called **Plone Mosaic**, the editor will be
reloaded and rebuilt by Webpack development server after each filesystem
change.


Documentation screenshots
-------------------------

To script screenshots into the Sphinx documentation, use the development buildout:

..  code:: bash

    $ git clone https://github.com/plone/plone.app.mosaic
    $ cd plone.app.mosaic
    $ python bootstrap.py  # clean python 2.7 virtualenv recommended
    $ bin/buildout -c develop.cfg

To speed up your iterations, before compiling the docs, start the robot server with:

..  code:: bash

    $ bin/robot-server plone.app.mosaic.testing.PLONE_APP_MOSAIC_ROBOT -v

With robot-server running, you can re-build the docs' screenshots relatively fast with:

..  code:: bash

    $ bin/robot-sphinx docs html

Or simply run the embedded screenshots as robot tests from a single document with:

..  code:: bash

    $ bin/robot docs/getting-started.rst

or with phantomjs:

..  code:: bash

    $ bin/robot -v BROWSER:phantomjs docs/getting-started.rst

and open ``./report.html`` to view the test report.

Just add ``Debug`` keyword anywhere to pause the robot in the middle of the
screenshot script and drop you into a Robot Framework REPL.
