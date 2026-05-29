.. _section_site_layouts:
.. index:: Site Layout


Site layout management
======================


.. As opposed to :ref:`section_content_layouts` ... TODO: prose

.. _enable_site_layouts:

Enable Mosaic Site Layouts
--------------------------

To enable site layout functionality in Mosaic you need to run buildout
with special options, see **develop.cfg**


Changing the current site layout
--------------------------------

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

TODO: Screenshot: Show example TTW site layout html
