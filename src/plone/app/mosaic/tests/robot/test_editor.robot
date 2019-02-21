*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Close all browsers


*** Test Cases ***

Show how Mosaic editor is opened
    Go to  ${PLONE_URL}/example-document
    Wait Until Element Is Visible  id=contentview-edit
    Highlight  id=contentview-edit
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-open.png
    ...  css=#portal-breadcrumbs
    ...  ${SELECTOR_TOOLBAR}  id=contentview-edit


Show the Mosaic editing capabilities
    Go to  ${PLONE_URL}/example-document/edit
    Wait Until Element Is Visible  css=.mosaic-select-layout
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-layout-selector.png
    ...  css=.plone-modal

    # Show how to select the initial layout
    Wait until Page contains element  jquery=a[data-value="default/basic.html"]
    Highlight  jquery=a[data-value="default/basic.html"] img
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-layout-selector-select.png
    ...  css=.plone-modal

    ## XXX: Only double click worked on Firefox 52
    # Click element  jquery=a[data-value="default/basic.html"]
    Double click element  jquery=a[data-value="default/basic.html"]

    # Show the properties view in Mosaic editor
    Run keyword and ignore error  Set window size  1024  1200
    Wait Until Element Is Visible  css=.mosaic-toolbar
    Click element  css=.mosaic-button-properties

    Highlight  css=.autotoc-nav

    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-properties-modal.png
    ...  css=.plone-modal-content

    #...  css=html
    #.plone-modal-content
    Run keyword and ignore error  Set window size  1024  800
    Click element  css=.mosaic-overlay-ok-button


*** Keywords ***

