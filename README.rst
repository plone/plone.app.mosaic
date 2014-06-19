Plone Mosaic
============

TL;DR; Plone Mosaic provides modern TTW content views for Dexterity content types and pluggable framework for smart layouts.

This package provides modern layout editor with blocks_ and tiles_ based layouts for Dexterity content types for Plone 4.3 and newer.

The notable features (with the help of blocks_) include:

- custom layout behavior for Dexterity content types
- WYSIWYG inline layout editor for custom content layouts
- separation of layouts into site layouts and content layout
- site layouts can be assigned per content and per site section
- global content layouts can be bound as named views for Dexterity content types

Please, wait for the documentation for more details about this package its usage.

.. _blocks: https://pypi.python.org/pypi/plone.app.blocks
.. _tiles: https://pypi.python.org/pypi/plone.app.tiles


Try it out
----------

.. code:: bash

   $ git clone https://github.com/plone/plone.app.mosaic
   $ cd plone.app.mosaic
   $ python bootstrap.py  # clean python 2.7 virtualenv recommended
   $ bin/buildout
   $ bin/demo

And open the browser at http://localhost:55001/plone/

Admin username is ``admin`` and password ``admin``.


Javascript development
----------------------

The plone package uses a bundle.

In order to update it while working on JS you need to install `bower` and `grunt` system wide:

    sudo npm install -g bower grunt-cli

Then you need to setup bower into `src/plone.app.mosaic`:

    cd src/plone.app.mosaic
    npm install
    bower install

When developing just run `grunt` in the root of the package.
This starts a watcher that compiles the bundle whenever you change
any of the javascript file of this package.

When you run it you get:

    # grunt
    Running "watch" task
    Waiting...
