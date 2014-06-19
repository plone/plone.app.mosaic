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

Please, `wait for the documentation`__ for more details about this package its usage.

.. _blocks: https://pypi.python.org/pypi/plone.app.blocks
.. _tiles: https://pypi.python.org/pypi/plone.app.tiles

.. image:: https://secure.travis-ci.org/plone/plone.app.mosaic.png
   :target: http://travis-ci.org/plone/plone.app.mosaic

__ http://plone-app-mosaic.s3-website-us-east-1.amazonaws.com/latest/


Try a demo
----------

Installation:

.. code:: bash

   $ git clone https://github.com/plone/plone.app.mosaic
   $ cd plone.app.mosaic
   $ python bootstrap.py  # clean python 2.7 virtualenv recommended
   $ bin/buildout

Startup:

.. code:: bash

   $ bin/demo

To get started:

* open a browser at ``http://localhost:55001/plone/++add++Document``
* login as ``admin`` with password ``secret``
* save the new page
* from the **Display**-menu, select the new entry **Custom layout**
* click **Edit** to see the new *Mosaic Editor*


Known issues when Mosaic is installed
-------------------------------------

* Going directly to login form does not report successful login
  immediately: https://github.com/plone/plone.app.mosaic/issues/9


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
