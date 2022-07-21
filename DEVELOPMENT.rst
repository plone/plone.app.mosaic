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

Prerequiries: Make sure you have installed node version >= 16. We recommend using `nvm install --lts && nvm use --lts`.

    $ yarn install
    $ yarn start

In the resource registry hange the resource path for `mosaic` to

    `http://localhost:8011/plone-mosaic-remote.js`

This will use the resources from webpack server on port 8011 then.

The javascript and scss files to work on are in the package root under `resources` and
will be compiled into minified production bundles with `yarn build`.


Documentation
-------------

To script screenshots into the Sphinx documentation, use:

..  code:: bash

    $ git clone https://github.com/plone/plone.app.mosaic.git
    $ cd plone.app.mosaic
    $ make install

To speed up your iterations, before compiling the docs, start the robot server with:

..  code:: bash

    $ ZSERVER_PORT=50000 ZSERVER_HOST=localhost no_proxy=* ./venv/bin/robot-server plone.app.mosaic.testing.PLONE_APP_MOSAIC_ROBOT -v

Note: the `no_proxy=*` is only needed if you get the following error without it:

..  code:: bash

    objc[99748]: +[__NSCFConstantString initialize] may have been in progress in another thread when fork() was called.

With robot-server running, you can re-build the docs' screenshots relatively fast with:

..  code:: bash

    $ ./venv/bin/robot-sphinx docs html

Or simply run the embedded screenshots as robot tests from a single document with:

..  code:: bash

    $ ./venv/bin/robot docs/getting-started.rst

or with phantomjs:

..  code:: bash

    $ ./venv/bin/robot -v BROWSER:phantomjs docs/getting-started.rst

and open ``./report.html`` to view the test report.

Just add ``Debug`` keyword anywhere to pause the robot in the middle of the screenshot script and drop you into a Robot Framework REPL.
