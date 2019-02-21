*** Settings ***

Resource  plone/app/robotframework/keywords.robot
Resource  plone/app/robotframework/selenium.robot
Resource  Selenium2Screenshots/keywords.robot

Library  Remote  ${PLONE_URL}/RobotRemote


*** Variables ***

${FIXTURE}  plone.app.mosaic.testing.PLONE_APP_MOSAIC_ACCEPTANCE
@{DIMENSIONS}  1024  800
${RESOURCE_DIR}  ${CURDIR}

${BROWSER}  chrome

${SELECTOR_ADDONS_ENABLED}  jquery=#activated-products
${SELECTOR_ADDONS_MOSAIC}  ${SELECTOR_ADDONS_ENABLED} ul li h3:contains('Mosaic')

${SELECTOR_CONTENTMENU_DISPLAY_LINK}  css=#plone-contentmenu-display a
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

Setup Mosaic Example Page
    Open test browser

    Given a logged-in site administrator
      and an example document

    Run keyword and ignore error  Set window size  1024  1500
