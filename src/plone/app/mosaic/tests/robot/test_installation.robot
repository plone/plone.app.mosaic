*** Settings ***

Resource  keywords.robot

Test Setup  Open test browser
Test Teardown  Close all browsers


*** Test Cases ***

Show Plone Mosaic activation
    Given a logged-in manager
    and the addons controlpanel

    Wait Until Element Contains  ${SELECTOR_ADDONS_MOSAIC}  Mosaic
    Highlight  ${SELECTOR_ADDONS_MOSAIC}
    Capture Page Screenshot  mosaic-product-activated.png


*** Keywords ***

the addons control panel
  Go to  ${PLONE_URL}/prefs_install_products_form
