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
    Click element  jquery=a[data-value="default/basic.html"]
    # Double click element  jquery=a[data-value="default/basic.html"]

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

    # Show the Mosaic editor
    Wait Until Element Is Visible  css=.mosaic-toolbar
    Highlight  css=.mosaic-button-layout
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-layout.png
    ...  css=html

    Click element  css=.mosaic-button-layout

    Element should be visible  css=.mosaic-button-customizelayout

    Highlight  css=.mosaic-button-customizelayout
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-customize.png
    ...  css=html
    Clear highlight  css=.mosaic-button-layout
    Clear highlight  css=.mosaic-button-customizelayout

    Click element  css=.mosaic-button-customizelayout

    # Show how to select a new tile from menu
    Wait Until Element Is Visible  css=.mosaic-toolbar
    Highlight  css=.select2-container.mosaic-menu-insert
    Click element  css=.select2-container.mosaic-menu-insert a
    Wait until element is visible  css=.select2-result.mosaic-option-irichtextbehavior-text
    Mouse over  css=.mosaic-dropdown .select2-result.mosaic-option-irichtextbehavior-text

    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-select-field-text-tile.png
    ...  css=.mosaic-toolbar  css=.mosaic-dropdown-insert

    Clear highlight  css=.mosaic-menu-insert

    # Show how to drag a new tile into its initial position

    Click element  css=.mosaic-dropdown .mosaic-option-irichtextbehavior-text
    Wait until page contains element  css=.mosaic-helper-tile-new
    Wait until element is visible  css=.mosaic-helper-tile-new
    Update element style
    ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    ...  display  block
    Mouse over
    ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-drag-field-text-tile.png
    ...  css=html

    # Show how to drop a new tile into its initial position

    Click element  css=.mosaic-selected-divider
    Wait Until Element Is Visible  css=.mosaic-button-save
    Highlight  css=.mosaic-button-save
    Capture and crop page screenshot
    ...  _screenshots/mosaic-editor-drop-field-text-tile.png
    ...  css=html

    # Show how the custom layout looks after saving

    Click button  css=.mosaic-button-save
    # some people reported sporadic page unload alert ... if so, accept it
    Run keyword and ignore error  Handle Alert  action=ACCEPT  timeout=5
    Capture and crop page screenshot
    ...  _screenshots/mosaic-page-saved.png
    ...  css=html


*** Keywords ***

