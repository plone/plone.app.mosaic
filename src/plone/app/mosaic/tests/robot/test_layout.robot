*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Plone test teardown


*** Test Cases ***

Show how to select Mosaic layout option

    Go to  ${PLONE_URL}/example-document

    Wait For Elements State  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}  visible
    Click  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait For Elements State  id=plone-contentmenu-display-layout_view  visible

    Highlight  id=plone-contentmenu-display-layout_view
    Take Screenshot  filename=mosaic-custom-layout-enable.png

    Focus  id=plone-contentmenu-display-layout_view
    Click  id=plone-contentmenu-display-layout_view

    Set Viewport Size  1024  800
    Wait For Elements State  css=body.layout-default-document  attached


Show how to select custom layout view

    Go to  ${PLONE_URL}/example-document

    Wait For Elements State  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}  visible
    Click  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait For Elements State  id=plone-contentmenu-display-layout_view  visible

    Take Screenshot  filename=mosaic-custom-layout-enable-done.png


*** Keywords ***

