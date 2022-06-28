Development
-----------

Plone 6:

Clone and build::

    $ git clone https://github.com/plone/plone.app.mosaic.git
    $ cd plone.app.mosaic
    $ make run

the `make` command is based on `mxdev` setup and installs Plone as with pip.
For more information about `mxdev` please read the documentation here:
https://github.com/mxstack/mxdev/blob/main/README.rst

Get started:

 * open a browser at ``http://localhost:8080/``
 * create a Plone Site (user **admin**, pass **admin**)
 * on the ``Welcome to Plone`` select the new entry **Mosaic layout** from the **Display**-menu
 * click **Edit** to see the new **Mosaic Editor**


JS & CSS Development::

    $ yarn install
    $ yarn start

In the resource registry hange the resource path for `mosaic` and `layouts-editor` to
    - `http://localhost:8011/dist/plone-mosaic.js`
    - `http://localhost:8011/dist/layouts-editor.js`

This will use the resources from webpack server on port 8011 then.

The javascript and scss files to work on are in the package root under `resources` and
will be compiled into minified production bundles with `yarn build`.


Documentation screenshots [TODOO: UPDATE GENERATED DOCUMENTATION]
-----------------------------------------------------------------

To script screenshots into the Sphinx documentation, use the development buildout:

..  code:: bash

    $ git clone https://github.com/plone/plone.app.mosaic
    $ cd plone.app.mosaic
    $ make bin/buildout
    $ make bin/instance

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

Just add ``Debug`` keyword anywhere to pause the robot in the middle of the screenshot script and drop you into a Robot Framework REPL.
