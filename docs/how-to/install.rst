.. _installation:

Installation
============

**Plone Mosaic** is a complex add-on with several dependencies.
For Plone 6.2 and later, it is recommended to install it using ``pip``.

Using pip
---------

To install ``plone.app.mosaic`` in your Plone environment, add it to your project's dependencies (e.g., in ``requirements.txt`` or ``setup.py``):

.. code-block:: text

   plone.app.mosaic

Then run your project's install command, typically:

.. code-block:: bash

   pip install -r requirements.txt

Activation
----------

After the package is installed and your Plone instance is started, you must activate it through the web:

1.  Navigate to **Site Setup** in your Plone site.
2.  Click on **Add-ons**.
3.  Find **Mosaic** in the list of available add-ons.
4.  Click **Activate**.

.. note::
   Activation will also install required dependencies like ``plone.app.standardtiles``, ``plone.app.blocks``, and ``plone.tiles``.
