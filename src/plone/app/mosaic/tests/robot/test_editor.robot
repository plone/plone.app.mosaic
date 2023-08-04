*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Plone test teardown


*** Test Cases ***

Show how Mosaic editor is opened
    Go to  ${PLONE_URL}/example-document
    Wait for Element  id=contentview-edit
    Highlight  id=contentview-edit
    Capture Page Screenshot
    ...  mosaic-editor-open.png


Show the Mosaic editing capabilities
    Go to  ${PLONE_URL}/example-document/edit
    Wait for Element  css=.mosaic-select-layout
    Capture Page Screenshot
    ...  mosaic-editor-layout-selector.png

    # Show how to select the initial layout
    Wait for element  xpath=//a[@data-value='default/basic.html']
    Highlight  xpath=//a[@data-value='default/basic.html']/img
    Capture Page Screenshot
    ...  mosaic-editor-layout-selector-select.png

    ## fire click event with javascript
    Execute javascript  $("[data-value='default/basic.html']").trigger("click")

    # Show the properties view in Mosaic editor
    Wait for Element  css=.mosaic-toolbar
    Click element  css=.mosaic-button-properties

    Wait for Element  css=.modal-body form .autotoc-nav
    Highlight  css=.modal-body form .autotoc-nav

    Capture Page Screenshot
    ...  mosaic-editor-properties-modal.png

    Click element  css=.pattern-modal-buttons #form-buttons-save

    Wait Until Element is not visible  css=.pattern-modal-buttons #form-buttons-save

    # Show the Mosaic editor
    Element should be visible  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout
    Element should not be visible  css=.mosaic-toolbar-secondary-functions

    Highlight  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout
    Capture Page Screenshot
    ...  mosaic-editor-customize.png
    Clear highlight  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    Wait for then click element  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    # Show how to select a new tile from menu
    Wait for Element  css=.select2-container.mosaic-menu-insert
    Highlight  css=.select2-container.mosaic-menu-insert
    Click element  css=.select2-container.mosaic-menu-insert a
    Wait for element  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text
    Mouse over  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text

    Capture Page Screenshot
    ...  mosaic-editor-select-field-text-tile.png

    Clear highlight  css=.mosaic-menu-insert

    # Show how to drag a new tile into its initial position

    Click element  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text
    Wait until page contains element  css=.mosaic-helper-tile-new
    Wait for element  css=.mosaic-helper-tile-new
    Update element style
    ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    ...  display  block
    Mouse over
    ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    Capture Page Screenshot
    ...  mosaic-editor-drag-field-text-tile.png

    # Show how to drop a new tile into its initial position

    Click element  css=.mosaic-selected-divider
    Wait for Element  css=.mosaic-button-save
    Highlight  css=.mosaic-button-save
    Capture Page Screenshot
    ...  mosaic-editor-drop-field-text-tile.png

    # Show how the custom layout looks after saving

    Click button  css=.mosaic-button-save
    # some people reported sporadic page unload alert ... if so, accept it
    Run keyword and ignore error  Handle Alert  action=ACCEPT  timeout=5
    Capture Page Screenshot
    ...  mosaic-page-saved.png


*** Keywords ***

