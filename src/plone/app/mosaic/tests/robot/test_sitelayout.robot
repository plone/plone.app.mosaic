*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Close all browsers


*** Test Cases ***

Show page site layout option
    Given a logged-in site administrator
      and an example document

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


*** Keywords ***
