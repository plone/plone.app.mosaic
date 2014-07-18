Site layouts
============

..  include:: _robot.rst

..  figure:: _screenshots/mosaic-layout-page-site-layout.png
..  code:: robotframework

    Show page site layout option
        Create content  type=Document
        ...  id=example-document
        ...  title=Example Document
        ...  description=This is an example document
        ...  text=<p>This document will soon have a custom layout.</p>
        Go to  ${PLONE_URL}/example-document/edit

        Page should contain  Layout
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
        Capture and crop page screenshot
                ...  _screenshots/mosaic-layout-section-site-layout.png
                ...  id=content-core
