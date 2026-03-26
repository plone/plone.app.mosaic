*** Settings ***

Resource  plone/app/robotframework/browser.robot

Library  Remote  ${PLONE_URL}/RobotRemote


*** Variables ***

${RESOURCE_DIR}  ${CURDIR}

${SELECTOR_ADDONS_ENABLED}  css=#activated-products
${SELECTOR_ADDONS_MOSAIC}  xpath=(//*[@id='activated-products']//*[contains(text(), 'Mosaic')])[1]

${SELECTOR_CONTENTMENU_DISPLAY_LINK}  css=#plone-contentmenu-display a.dropdown-toggle
${SELECTOR_CONTENTMENU_DISPLAY_ITEMS}  css=#plone-contentmenu-display ul

${SELECTOR_TOOLBAR}  css=#edit-zone

*** Keywords ***

a logged-in manager
  Enable autologin as  Manager

a logged-in site administrator
  Enable autologin as  Site Administrator  Contributor  Reviewer

an example document
  Create content  type=Document
  ...  id=example-document
  ...  title=Example Document
  ...  description=This is an example document
  ...  text=<p>This document will soon have a custom layout.</p>

select mosaic layout view
  Go to  ${PLONE_URL}/example-document

  Wait For Elements State  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}  visible
  Click  ${SELECTOR_CONTENTMENU_DISPLAY_LINK}
  Wait For Elements State  id=plone-contentmenu-display-layout_view  visible
  Click  id=plone-contentmenu-display-layout_view

Setup Mosaic Example Page
    Open test browser

    Given a logged-in site administrator
      and an example document
     then select mosaic layout view

    Set Viewport Size  1024  1500


# ----------------------------------------------------------------------------
# Backport and simplified from outdated Selenium2Screenshots
# ----------------------------------------------------------------------------

Update element style
    [Arguments]  ${locator}  ${name}  ${value}
    Evaluate JavaScript    ${locator}    (elem) => { elem.style['${name}'] = '${value}'; }


Highlight
    [Documentation]  Add highlighting around given locator
    [Arguments]  ${locator}
    ...          ${width}=3px
    ...          ${style}=dotted
    ...          ${color}=red
    Update element style  ${locator}  border  ${style} ${color} ${width}


Clear Highlight
    [Arguments]  ${locator}
    Update element style  ${locator}  border  none


Drag And Drop By Offset
    [Arguments]    ${locator}    ${x_offset}    ${y_offset}
    ${bbox}=    Get BoundingBox    ${locator}
    ${from_x}=    Evaluate    int(${bbox}[x] + ${bbox}[width] / 2)
    ${from_y}=    Evaluate    int(${bbox}[y] + ${bbox}[height] / 2)
    ${to_x}=    Evaluate    ${from_x} + int(${x_offset})
    ${to_y}=    Evaluate    ${from_y} + int(${y_offset})
    Drag And Drop By Coordinates    ${from_x}    ${from_y}    ${to_x}    ${to_y}
