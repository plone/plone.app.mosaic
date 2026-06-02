*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Plone Test Teardown


*** Test Cases ***

Show Plone Mosaic activation
    [Tags]  robot:docs
    Given a logged-in manager
    and the addons controlpanel

    Wait For Elements State  ${SELECTOR_ADDONS_MOSAIC}  visible
    Highlight  ${SELECTOR_ADDONS_MOSAIC}
    Take Documentation Screenshot  filename=mosaic-product-activated.png  width=1024  height=1500


*** Keywords ***

the addons control panel
  Go to  ${PLONE_URL}/prefs_install_products_form
