*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Plone test teardown


*** Test Cases ***

Show how to select Mosaic layout option

    Go to  ${PLONE_URL}/example-document

    Wait Until Element Is Visible  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait Until Element Is Visible  id=plone-contentmenu-display-layout_view

    Highlight  id=plone-contentmenu-display-layout_view
    Capture Page Screenshot  mosaic-custom-layout-enable.png

    Set focus to element  id=plone-contentmenu-display-layout_view
    Click element  id=plone-contentmenu-display-layout_view

    Run keyword and ignore error  Set window size  1024  800
    Wait until page contains element
    ...  css=body.layout-default-document


Show how to select custom layout view

    Go to  ${PLONE_URL}/example-document

    Wait Until Element Is Visible  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait Until Element Is Visible  id=plone-contentmenu-display-layout_view

    Capture Page Screenshot  mosaic-custom-layout-enable-done.png


*** Keywords ***

