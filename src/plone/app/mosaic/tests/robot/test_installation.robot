*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Plone Test Teardown


*** Test Cases ***

Show Plone Mosaic activation
    Given a logged-in manager
    and the addons controlpanel

    Wait For Elements State  ${SELECTOR_ADDONS_MOSAIC}  visible
    Highlight  ${SELECTOR_ADDONS_MOSAIC}
    Take Screenshot  filename=mosaic-product-activated.png


*** Keywords ***

the addons control panel
  Go to  ${PLONE_URL}/prefs_install_products_form
