*** Settings ***

Resource  keywords.robot

Test Setup  Setup Mosaic Example Page
Test Teardown  Plone test teardown


*** Test Cases ***

Show how Mosaic editor is opened
    Go to  ${PLONE_URL}/example-document
    Wait For Elements State  id=contentview-edit  visible
    Highlight  id=contentview-edit
    Take Screenshot  filename=mosaic-editor-open.png


Show the Mosaic editing capabilities
    Go to  ${PLONE_URL}/example-document/edit
    Wait For Elements State  css=.mosaic-select-layout  visible
    Take Screenshot  filename=mosaic-editor-layout-selector.png

    # Show how to select the initial layout
    Wait For Elements State  css=[data-value='default/basic.html']  visible
    Highlight  xpath=//a[@data-value='default/basic.html']/img
    Take Screenshot  filename=mosaic-editor-layout-selector-select.png

    # fire click event
    Evaluate JavaScript  css=[data-value='default/basic.html']  (elem) => elem.click()

    # Show the properties view in Mosaic editor
    Wait For Elements State  css=.mosaic-toolbar  visible
    Click  css=.mosaic-button-properties

    Wait For Elements State  css=.modal-body form .autotoc-nav  visible
    Highlight  css=.modal-body form .autotoc-nav

    Take Screenshot  filename=mosaic-editor-properties-modal.png

    Click  css=.pattern-modal-buttons #form-buttons-save

    Wait For Elements State  css=.pattern-modal-buttons #form-buttons-save  hidden

    # Show the Mosaic editor
    Wait For Elements State  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout  visible
    Wait For Elements State  css=.mosaic-toolbar-secondary-functions  hidden

    Highlight  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout
    Take Screenshot  filename=mosaic-editor-customize.png
    Clear highlight  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    Click  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    # Show how to select a new tile from menu
    Wait For Elements State  css=.select2-container.mosaic-menu-insert  visible
    Highlight  css=.select2-container.mosaic-menu-insert
    Click  css=.select2-container.mosaic-menu-insert a
    Wait For Elements State  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text  visible
    Hover  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text

    Take Screenshot  filename=mosaic-editor-select-field-text-tile.png

    Clear highlight  css=.select2-container.mosaic-menu-insert

    # Show how to drag a new tile into its initial position

    Click  css=.mosaic-menu-insert .select2-option-irichtextbehavior-text
    Wait For Elements State  css=.mosaic-helper-tile-new  attached
    Update element style
    ...  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    ...  display  block
    Hover  css=.mosaic-IDublinCore-description-tile .mosaic-divider-bottom
    Take Screenshot  filename=mosaic-editor-drag-field-text-tile.png

    # Show how to drop a new tile into its initial position

    Click  css=.mosaic-selected-divider
    Wait For Elements State  css=.mosaic-button-save  visible
    Highlight  css=.mosaic-button-save
    Take Screenshot  filename=mosaic-editor-drop-field-text-tile.png

    # Show how the custom layout looks after saving
    # register dialog handler before the click that might trigger a beforeunload dialog
    Handle Future Dialogs    action=accept
    Click  css=.mosaic-button-save
    Take Screenshot  filename=mosaic-page-saved.png

Show grid layout editor capabilities
    Go to  ${PLONE_URL}/example-document/edit
    Wait For Elements State  css=[data-value='default/basic.html']  visible
    Evaluate JavaScript  css=[data-value='default/basic.html']  (elem) => elem.click()
    Click  css=.mosaic-toolbar-primary-functions .mosaic-button-customizelayout

    # insert richtext tile
    Insert richtexttile

    # add below title
    ${empty_row_3}=  set variable  //div[contains(@class, 'mosaic-empty-row')][3]/div[contains(@class, 'mosaic-grid-cell')]
    Update element style  xpath=${empty_row_3}  display  block
    Hover  xpath=${empty_row_3}
    Click  xpath=${empty_row_3}

    # insert 2nd richtext tile
    Insert richtexttile

    # add next to first richtext
    ${tile_divider_right}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-grid-cell')][1]/div[contains(@class, 'plone\.app\.standardtiles\.html-tile')]/div[contains(@class, 'mosaic-divider-right')]
    Update element style  xpath=${tile_divider_right}  display  block
    Hover  xpath=${tile_divider_right}
    Click  xpath=${tile_divider_right}
    Update element style  xpath=${tile_divider_right}  display  none

    # insert 3rd richtext tile
    Insert richtexttile

    # add next to second richtext
    ${tile_divider_right}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-grid-cell')][2]/div[contains(@class, 'plone\.app\.standardtiles\.html-tile')]/div[contains(@class, 'mosaic-divider-right')]
    Update element style  xpath=${tile_divider_right}  display  block
    Hover  xpath=${tile_divider_right}
    Click  xpath=${tile_divider_right}
    Update element style  xpath=${tile_divider_right}  display  none

    # get resize handles
    ${resize_handle_1}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-1')]
    ${resize_handle_2}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-2')]
    ${resize_handle_3}=  set variable  //div[contains(@class, 'mosaic-grid-row')][6]/div[contains(@class, 'mosaic-resize-handle-3')]

    # resize first
    Drag And Drop By Offset  xpath=${resize_handle_1}  -50  0
    Take Screenshot  filename=mosaic-editor-resize-tile1-smaller.png

    Drag And Drop By Offset  xpath=${resize_handle_1}  150  0
    Take Screenshot  filename=mosaic-editor-resize-tile1-larger.png

    # resize second
    Drag And Drop By Offset  xpath=${resize_handle_2}  -50  0
    Take Screenshot  filename=mosaic-editor-resize-tile2-smaller.png

    Drag And Drop By Offset  xpath=${resize_handle_2}  150  0
    Take Screenshot  filename=mosaic-editor-resize-tile2-larger.png

    # resize third smaller
    Drag And Drop By Offset  xpath=${resize_handle_3}  -50  0
    Take Screenshot  filename=mosaic-editor-resize-tile3-smaller.png

    # then resize first smaller -> right border should stay sticky
    Drag And Drop By Offset  xpath=${resize_handle_1}  -100  0
    Take Screenshot  filename=mosaic-editor-resize-tile1-smaller-with-border-right.png

    # Reset (1) should be visible on last column
    Evaluate JavaScript    xpath=//a[contains(text(), 'Reset (1)')]    (elem) => elem.click()
    Take Screenshot  filename=mosaic-editor-reset-tile3.png

*** Keywords ***

Insert richtexttile
    Click    css=.select2-container.mosaic-menu-insert a
    Click    xpath=//li[contains(@class, 'select2-option-plone\.app\.standardtiles\.html')]
    Wait For Elements State    css=.mosaic-helper-tile-new    attached
