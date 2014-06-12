plone.app.mosaic
================

Plone Mosaic main repository


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


