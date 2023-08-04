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

Show grid layout editor capabilities
    Go to  ${PLONE_URL}/example-document/edit
    Wait for element  xpath=//a[@data-value='default/basic.html']
    Execute javascript  $("[data-value='default/basic.html']").trigger("click")
    Wait for then click element  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    # insert richtext tile
    Insert richtexttile

    # add below title
    ${empty_row_3}=  set variable  //div[contains(@class, 'mosaic-empty-row')][3]/div[contains(@class, 'mosaic-grid-cell')]
    Update element style  xpath=${empty_row_3}  display  block
    Mouse over  xpath=${empty_row_3}
    Click element  xpath=${empty_row_3}

    # insert 2nd richtext tile
    Insert richtexttile

    # add next to first richtext
    ${tile_divider_right}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-grid-cell')][1]/div[contains(@class, 'plone\.app\.standardtiles\.html-tile')]/div[contains(@class, 'mosaic-divider-right')]
    Update element style  xpath=${tile_divider_right}  display  block
    Mouse over  xpath=${tile_divider_right}
    Click element  xpath=${tile_divider_right}
    Update element style  xpath=${tile_divider_right}  display  none

    # insert 3rd richtext tile
    Insert richtexttile

    # add next to second richtext
    ${tile_divider_right}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-grid-cell')][2]/div[contains(@class, 'plone\.app\.standardtiles\.html-tile')]/div[contains(@class, 'mosaic-divider-right')]
    Update element style  xpath=${tile_divider_right}  display  block
    Mouse over  xpath=${tile_divider_right}
    Click element  xpath=${tile_divider_right}
    Update element style  xpath=${tile_divider_right}  display  none

    # get resize handles
    ${resize_handle_1}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-1')]
    ${resize_handle_2}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-2')]
    ${resize_handle_3}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-3')]

    # resize first
    Drag and drop by offset  xpath=${resize_handle_1}  -50  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile1-smaller.png

    Drag and drop by offset  xpath=${resize_handle_1}  150  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile1-larger.png

    # resize second
    Drag and drop by offset  xpath=${resize_handle_2}  -50  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile2-smaller.png

    Drag and drop by offset  xpath=${resize_handle_2}  150  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile2-larger.png

    # resize third smaller
    Drag and drop by offset  xpath=${resize_handle_3}  -50  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile3-smaller.png

    # then resize first smaller -> right border should stay sticky
    Drag and drop by offset  xpath=${resize_handle_1}  -100  0
    Capture Page Screenshot
    ...  mosaic-editor-resize-tile1-smaller-with-border-right.png

    # Reset (1) should be visible on last column
    Wait for then click element  xpath=//a[contains(text(), 'Reset (1)')]
    Capture Page Screenshot
    ...  mosaic-editor-reset-tile3.png

*** Keywords ***

Insert richtexttile
    Wait for then click element  css=.select2-container.mosaic-menu-insert a
    Wait for then click element  xpath=//li[contains(@class, 'select2-option-plone\.app\.standardtiles\.html')]
    Wait until page contains element  css=.mosaic-helper-tile-new
