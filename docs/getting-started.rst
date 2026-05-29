.. _section_getting_started:

Getting started
===============

First steps with Mosaic
-----------------------

This documentation will present you details how to work with **Plone Mosaic**
through the web and within a package.
If you haven't done it yet,
please read the `README.rst`_ to learn about the concepts in **Plone Mosaic**,
the requirements for the installation,
the projects status and how the development process of the product works.

.. _README.rst: https://github.com/plone/plone.app.mosaic/blob/master/README.rst


.. index:: Installation

Installation and activation
---------------------------

**Plone Mosaic** is installed like any other Plone add-on with buildout.
It has several dependencies that need to be installed in specific versions.
Please check `installation notes`_.

.. _installation notes: https://github.com/plone/plone.app.mosaic/blob/master/README.rst#installation

.. note::
          Check :ref:`enable_site_layouts` if you want to use Mosaic Site Layouts
          on top of Content Layouts.


After the installation it needs to be activated in the Add-on control panel.

Even with **Plone Mosaic** installed and activated the Plone site should look and behave normal.
But now it is possible to add tiles to each page and get them rendered through the Plone Mosaic composition chain.

.. note::

  If something breaks just by installing **Plone Mosaic**,
  it's probably a bug and it should be reported_ as such.

.. _reported: https://github.com/plone/plone.app.mosaic/issues


Mosaic Layout
-------------

In this section we will look at the **Layout-behavior** of **Plone Mosaic**.
It needs to be enabled in the display menu of a content item.
To follow along create a document and after saving it,
set the **Display** option to **Mosaic layout**.

How the current content looks after the first time the **Mosaic layout** is enabled
depends on the configured defaults for its portal type.
Still,
at least the title and the description should always be displayed.


Mosaic editor
-------------

When the **Mosaic layout** has been enabled,
the **Mosaic editor** is opened by clicking the **Edit** tab.

When the editor is opened for the first time,
it asks to the select the initial layout for the content.

The selected layout can then be used as it is,
or it can be customized by adding, removing and formatting tiles.
How to achieve this will be described later on.

Let's select the basic layout.

Now the toolbar of the **Mosaic Editor** will appear on top.
The buttons *Save* and *Cancel* belong to the current *Edit* action of the content.
With them you can either save or discard the changes that were made to the current content element.

The button **Properties** opens a form where you can edit several properties of the content element,
like the publishing date or the short name.


The dropdown *Layout* has the two options *Change* and *Customize*.
*Change* opens the form where you can choose another layout from all available layouts.

With the option *Customize* you enable the current layout for customization,
i.e. two new dropdowns *Insert* and *Format* appear and allow to add new tiles and format existing ones.

To add a new tile in the **Mosaic editor**, select the "Text" tile from the *Insert* menu.
An overview about all available standard tiles refer to the :ref:`mosaic_tiles` part of this documentation,
and drag the appearing tile into the desired position.

Finally, a mouse click drops the tile into selected position and the page can be saved.

That's how we can build custom content layouts using Plone Mosaic.

Note that this custom layout is saved for the current content element.
The *Layout* dropdown now has the button *Save* instead of *Customize*.
With this you could save the layout for the whole site and make it available for other content elements.
You can find more information about this in the sectionXXX.

**ToDo Screenshot with Layout dropdown showing Change/Save focus on Save**

The button *Change* will open up the *Select Layout* form again and all the
customizations you made on the page will be discarded.

**ToDo Screenshot discard current custom layout on form**
