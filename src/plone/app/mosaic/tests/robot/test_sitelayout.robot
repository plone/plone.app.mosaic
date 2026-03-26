*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Plone test teardown


*** Test Cases ***

Show page site layout option
    Given a logged-in site administrator
      and an example document

    Go to  ${PLONE_URL}/example-document/edit

    Wait For Elements State  xpath=//a[contains(@class,'autotoc-level')][normalize-space(.)='Layout']  visible
    Click  xpath=//a[contains(@class,'autotoc-level')][normalize-space(.)='Layout']

    Wait For Elements State  id=formfield-form-widgets-ILayoutAware-pageSiteLayout  attached

    Take Screenshot  filename=mosaic-layout-page-site-layout.png


*** Keywords ***
