Site layout management
======================

..  include:: _robot.rst
..  code:: robotframework

    Set layout management window size
        Set window size  900  800



Changing the current site layout
--------------------------------

..  figure:: _screenshots/mosaic-layout-page-site-layout.png
..  code:: robotframework

    Show page site layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document/edit

        Page should contain  Properties
        Click button  Properties

        Page should contain link  Layout
        Click link  Layout

        Highlight  id=formfield-form-widgets-ILayoutAware-pageSiteLayout
        Execute javascript  $('#form-widgets-ILayoutAware-pageSiteLayout').attr('size', 6)

        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-page-site-layout.png
        ...  id=content-core

        Clear highlight  id=formfield-form-widgets-ILayoutAware-pageSiteLayout
        Execute javascript  $('#form-widgets-ILayoutAware-pageSiteLayout').attr('size', 1)

..  figure:: _screenshots/mosaic-layout-section-site-layout.png
..  code:: robotframework

    Show section site layout option
        Highlight  id=formfield-form-widgets-ILayoutAware-sectionSiteLayout
        Execute javascript  $('#form-widgets-ILayoutAware-sectionSiteLayout').attr('size', 6)
        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-section-site-layout.png
        ...  id=content-core
        Click button  Close

        Choose ok on next confirmation
        Click button  css=.mosaic-button-save


Creating a new site layout through the web
------------------------------------------

..  figure:: _screenshots/mosaic-ttw-sitelayout-manifest.png
..  code:: robotframework

    Show example TTW site layout manifest
        Go to  ${PLONE_URL}/portal_resources/sitelayout/custom/manifest.cfg/manage_main
        Page should contain  You can update the data for this file
        Capture page screenshot
        ...  _screenshots/mosaic-ttw-sitelayout-manifest.png


..  figure:: _screenshots/mosaic-ttw-sitelayout-html.png
..  code:: robotframework

    Show example TTW site layout html
        Go to  ${PLONE_URL}/portal_resources/sitelayout/custom/site.html/manage_main
        Page should contain  You can update the data for this file
        Capture page screenshot
        ...  _screenshots/mosaic-ttw-sitelayout-html.png
