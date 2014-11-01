Plone Mosaic
============

..  image:: https://www.herokucdn.com/deploy/button.png
    :target: https://heroku.com/deploy?template=https://github.com/plone/plone.app.mosaic

**Plone Mosaic** allows you to define global site layouts and override them on specific contents or sections. You can then compose the content of the page using the Mosaic editor.

The Mosaic editor lets you insert blocks (a.k.a. tiles) into the content of the page so that you can easily build custom composite pages for your contents on the fly.

**Plone Mosaic** works with Plone 4.3 and later.

The notable features (with the help of tiles_ and blocks_) include:

- custom layout behavior for Dexterity content types
- WYSIWYG inline layout editor for custom content layouts
- separation of layouts into site layouts and content layout
- site layouts can be assigned per content and per site section
- global content layouts can be bound as named views for Dexterity content types

..  _blocks: https://pypi.python.org/pypi/plone.app.blocks
..  _tiles: https://pypi.python.org/pypi/plone.app.tiles

Read `the Mosaic Sprint report`__ for more goals for **Plone Mosaic** and `the package documentation`__ for more details how to use this package.

__  http://abstract-technology.com/lab/articles/plone-mosaic-sprint-final-report
__  http://plone-app-mosaic.s3-website-us-east-1.amazonaws.com/latest/

..  image:: https://secure.travis-ci.org/plone/plone.app.mosaic.png
    :target: http://travis-ci.org/plone/plone.app.mosaic

Screencasts
-----------

- Desiging `custom content layouts <http://youtu.be/43e18Az93ug>`_
- `View prototyping <http://youtu.be/QFQON-YOO9Q>`_ layouts as Dexterity type views
- `Multilingual view prototyping <http://youtu.be/eqsJ9pc_n4Y>`_ with p.a.multilingual
- Theming with `themed site layouts <http://youtu.be/b9Okt01BGeI>`_

Try a demo
----------

Installation:

..  code:: bash

    $ git clone https://github.com/plone/plone.app.mosaic
    $ cd plone.app.mosaic
    $ python bootstrap.py  # clean python 2.7 virtualenv recommended
    $ bin/buildout

Startup:

..  code:: bash

    $ bin/demo

To get started:

* open a browser at ``http://localhost:55001/plone/++add++Document``
* login as ``admin`` with password ``secret``
* save the new page
* from the **Display**-menu, select the new entry **Custom layout**
* click **Edit** to see the new *Mosaic Editor*

Alternatively you can also use ``bin/instance fg``.

.. For impatient types, there is also an online demo installation available:
   http://plone-app-mosaic.herokuapp.com. It needs about 60 seconds to spin up and
   it will purge all changes after about an hour of non-usage.


Javascript development
----------------------

The plone package uses a bundle, which can be compiled with Plone 5.
In order to update it while working on JS you need to work on Plone 5 branch of
`buildout.coredev`_ and the Mosaic PLIP:

.. _buildout.coredev: https://github.com/plone/buildout.coredev

.. code:: bash

   $ git clone https://github.com/plone/buildout.coredev
   $ cd buildout.coredev
   $ python bootstrap.py
   $ bin/buildout -c plips/plip-mosaic.cfg

Once you have created a Plone 5 site with plone.app.mosaic, you can build
a static bundle with:

.. code:: bash

   $ bin/instance run generate_gruntfile.py
   $ npm install
   $ grunt compile


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

Just add ``Debug`` keyword anywhere to pause the robot in the middle of the screenshot script and drop you into a Robot Framework REPL.
