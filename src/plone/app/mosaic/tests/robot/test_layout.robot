*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Close all browsers


*** Test Cases ***

Show how to select Mosaic layout option

    Go to  ${PLONE_URL}/example-document

    Wait Until Element Is Visible  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait Until Element Is Visible  id=plone-contentmenu-display-layout_view

    Update element style  css=.managePortletsFallback  display  none
    Highlight  id=plone-contentmenu-display-layout_view
    Capture and crop page screenshot
    ...  _screenshots/mosaic-custom-layout-enable.png
    ...  css=#portal-breadcrumbs
    ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-display
    ...  ${SELECTOR_CONTENTMENU_DISPLAY_ITEMS}

    Mouse over  id=plone-contentmenu-display-layout_view
    Click element  id=plone-contentmenu-display-layout_view

    ## XXX: Mouse over got stuck on Firefox 52
    # Mouse over  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Run keyword and ignore error  Set window size  1024  800
    Wait until page contains element
    ...  css=#plone-contentmenu-display-layout_view.actionMenuSelected


Show how to select custom layout view

    Go to  ${PLONE_URL}/example-document

    Wait Until Element Is Visible  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Click element  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
    Wait Until Element Is Visible  id=plone-contentmenu-display-layout_view

    Update element style  css=.managePortletsFallback  display  none
    Capture and crop page screenshot
    ...  _screenshots/mosaic-custom-layout-enable-done.png
    ...  css=#portal-breadcrumbs
    ...  ${SELECTOR_TOOLBAR}  id=plone-contentmenu-display  id=content
    ...  jquery=#content > div:last


*** Keywords ***

