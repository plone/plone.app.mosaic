Dexterity type views
====================

..  include:: _robot.rst

..  figure:: _screenshots/mosaic-layouts-as-aliases.png
..  code:: robotframework

    Show how layout option is defind as type view alias
        Go to  ${PLONE_URL}/portal_types/Document/manage_aliases
        Page should contain  Method Aliases
        Bootstrap jQuery
        Highlight  jquery=form tr:eq(2)
        Update element style  jquery=form td:eq(3) input  width  250px
        Capture page screenshot
        ...  _screenshots/mosaic-layouts-as-aliases.png

..  figure:: _screenshots/mosaic-layout-default-enable.png
..  code:: robotframework

    Show how to select the custom layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document

        Element should be visible  id=plone-contentmenu-layout
        Click element  css=#plone-contentmenu-layout dt a
        Element should be visible  id=plone-contentmenu-layout-default

        Update element style  css=.managePortletsFallback  display  none
        Highlight  id=plone-contentmenu-layout-default
        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-default-enable.png
        ...  id=edit-bar  id=plone-contentmenu-layout
        ...  css=#plone-contentmenu-layout dd
