*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Plone test teardown


*** Test Cases ***

Show page site layout option
    [Tags]  robot:docs
    Given a logged-in site administrator
      and an example document

    Go to  ${PLONE_URL}/example-document/edit

    Wait For Elements State  xpath=//a[contains(@class,'autotoc-level')][normalize-space(.)='Layout']  visible
    Click  xpath=//a[contains(@class,'autotoc-level')][normalize-space(.)='Layout']

    Wait For Elements State  id=formfield-form-widgets-ILayoutAware-pageSiteLayout  attached

    Take Screenshot  filename=p6-mosaic-site-layout-selector.png


Show layouts editor
    [Tags]  robot:docs
    Given a logged-in manager
    Go to  ${PLONE_URL}/@@layouts-editor
    Wait For Elements State  css=#mosaic-show-hide-layouts  visible
    Take Screenshot  filename=p6-mosaic-layout-editor.png


*** Keywords ***
