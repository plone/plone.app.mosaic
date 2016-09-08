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

        Page should contain link  Layout
        Click link  Layout

        Highlight  id=formfield-form-widgets-ILayoutAware-pageSiteLayout
        Execute javascript  $('#form-widgets-ILayoutAware-pageSiteLayout').attr('size', 6)

        Capture and crop page screenshot
        ...  _screenshots/mosaic-layout-page-site-layout.png
        ...  id=content-core

        Clear highlight  id=formfield-form-widgets-ILayoutAware-pageSiteLayout
        Execute javascript  $('#form-widgets-ILayoutAware-pageSiteLayout').attr('size', 1)


TODO: Screenshot: Show section site layout option
::

   #..  figure:: _screenshots/mosaic-layout-section-site-layout.png
   #..  code:: robotframework
   #
   #    Show section site layout option
   #
   #        # Set Selenium Speed  10
   #
   #        Highlight  id=formfield-form-widgets-ILayoutAware-sectionSiteLayout
   #        Execute javascript  $('#form-widgets-ILayoutAware-sectionSiteLayout').attr('size', 6)
   #        Capture and crop page screenshot
   #        ...  _screenshots/mosaic-layout-section-site-layout.png
   #        ...  id=content-core
   #
   #        # Debug
   #        
   #        Click button  Close
   #
   #        # Debug
   #
   #        # Choose ok on next confirmation
   #        # Click button  css=.mosaic-button-save

XXX TODO Fix this.

Maybe site layouts and this feature cannot work altogether in this version.

This is what I get:

::

   Site Error

   An error was encountered while publishing this resource.

   Resource not found
   Sorry, the requested resource does not exist.

   Check the URL and try again.

   Resource: http://localhost:55001/plone/portal_resources/sitelayout/custom

   Troubleshooting Suggestions

   The URL may be incorrect.
   The parameters passed to this resource may be incorrect.
   A resource that this resource relies on may be encountering an error.

   For more detailed information about the error, please refer to the error log.

   If the error persists please contact the site maintainer. Thank you for your patience. 




Creating a new site layout through the web
------------------------------------------

TODO Screenshot: Show example TTW site layout manifest

..
   ..  figure:: _screenshots/mosaic-ttw-sitelayout-manifest.png
   ..  code:: robotframework

       Show example TTW site layout manifest
           Go to  ${PLONE_URL}/portal_resources/sitelayout/custom/manifest.cfg/manage_main
           Page should contain  You can update the data for this file
           Capture page screenshot
           ...  _screenshots/mosaic-ttw-sitelayout-manifest.png

TODO: Screenshot: Show example TTW site layout html

.. temporarily disabled..
   ..  figure:: _screenshots/mosaic-ttw-sitelayout-html.png
   ..  code:: robotframework

       Show example TTW site layout html
           Go to  ${PLONE_URL}/portal_resources/sitelayout/custom/site.html/manage_main
           Page should contain  You can update the data for this file
           Capture page screenshot
           ...  _screenshots/mosaic-ttw-sitelayout-html.png
