Content layouts as type views
=============================

..  include:: _robot.rst


Binding content layout to content type
--------------------------------------

..  figure:: _screenshots/mosaic-layouts-as-aliases.png
..  code:: robotframework

    Show how layout option is defined as type view alias
        Go to  ${PLONE_URL}/portal_types/Document/manage_aliases
        Page should contain  Method Aliases
        Bootstrap jQuery
        Highlight  jquery=form tr:eq(2)
        Update element style  jquery=form td:eq(3) input  width  25em
        Capture page screenshot
        ...  _screenshots/mosaic-layouts-as-aliases.png

..  figure:: _screenshots/mosaic-layouts-as-aliases-add-method.png
..  code:: robotframework

    Show how to configure the new TTW layout as alias
        Go to  ${PLONE_URL}/portal_types/Document/manage_propertiesForm
        Page should contain  Available view methods
        Focus  name=manage_editProperties:method

        Bootstrap jQuery
        Highlight  jquery=form tr:eq(14)
        Capture page screenshot
        ...  _screenshots/mosaic-layouts-as-aliases-add-method.png


Selecting bound layout for each content item
--------------------------------------------

..  figure:: _screenshots/mosaic-layout-menu-default.png
..  code:: robotframework

    Show how to select the custom layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document

        Element should be visible  id=plone-contentmenu-layout
        Click element  ${SELECTOR_CONTENTMENU_LAYOUT_LINK}
        Element should be visible  id=plone-contentmenu-layout-default

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-layout-default
        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-menu-default.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-layout
        ...  ${SELECTOR_CONTENTMENU_LAYOUT_ITEMS}


Creating a new content layout through the web
---------------------------------------------

..  figure:: _screenshots/mosaic-ttw-contentlayout-manifest.png
..  code:: robotframework

    Show example TTW content layout manifest
        Go to  ${PLONE_URL}/portal_resources/contentlayout/custom/manifest.cfg/manage_main
        Page should contain  You can update the data for this file
        Capture page screenshot
        ...  _screenshots/mosaic-ttw-contentlayout-manifest.png


..  figure:: _screenshots/mosaic-ttw-contentlayout-html.png
..  code:: robotframework

    Show example TTW content layout html
        Go to  ${PLONE_URL}/portal_resources/contentlayout/custom/basic.html/manage_main
        Page should contain  You can update the data for this file
        Capture page screenshot
        ...  _screenshots/mosaic-ttw-contentlayout-html.png


..  figure:: _screenshots/mosaic-layouts-as-aliases-new-new.png
..  code:: robotframework

    Show how to configure the other new TTW layout as alias
        Go to  ${PLONE_URL}/portal_types/Document/manage_aliases
        Page should contain  Method Aliases
        Input text  name=aliases.new:record  ++layout++custom
        Input text  name=methods.new:record  ++contentlayout++custom/basic.html
        Focus  name=submit

        Bootstrap jQuery
        Highlight  jquery=form tr:eq(7)
        Update element style  jquery=form td:eq(13) input  width  25em
        Capture page screenshot
        ...  _screenshots/mosaic-layouts-as-aliases-new-new.png

        Click button  name=submit
        Element text should be  name=aliases.new:record  ${EMPTY}

..  figure:: _screenshots/mosaic-layouts-as-aliases-new-add-method.png
..  code:: robotframework

    Show how to condigure the new TTW layout as alias
        Go to  ${PLONE_URL}/portal_types/Document/manage_propertiesForm
        Page should contain  Available view methods
        ${value} =  Get value  name=view_methods:lines
        ${value} =  Catenate  SEPARATOR=\n  ++layout++custom  ${value}
        Input text  name=view_methods:lines  ${value}
        Focus  name=manage_editProperties:method

        Bootstrap jQuery
        Highlight  jquery=form tr:eq(14)
        Capture page screenshot
        ...  _screenshots/mosaic-layouts-as-aliases-new-add-method.png

        Click button  Save Changes
        Page should contain  Saved changes.

..  figure:: _screenshots/mosaic-layout-menu-custom.png
..  code:: robotframework

    Show how to select the new TTW layout option
        Go to  ${PLONE_URL}/example-document

        Element should be visible  id=plone-contentmenu-layout
        Click element  ${SELECTOR_CONTENTMENU_LAYOUT_LINK}
        Element should be visible  id=plone-contentmenu-layout-custom

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-layout-custom
        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-menu-custom.png
        ...  css=#portal-breadcrumbs
        ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-layout
        ...  ${SELECTOR_CONTENTMENU_LAYOUT_ITEMS}
