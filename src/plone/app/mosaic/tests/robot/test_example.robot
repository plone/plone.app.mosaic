# bin/robot-server plone.app.mosaic.testing.PLONE_APP_MOSAIC_ROBOT
# bin/robot src/plone/app/mosaic/tests/robot/test_hello.robot

*** Settings ***

Resource  plone/app/robotframework/keywords.robot

Library  Remote  ${PLONE_URL}/RobotRemote

Test Setup  Open test browser
Test Teardown  Close all browsers

*** Test Cases ***

Plone is installed
    Go to  ${PLONE_URL}
    Page should contain  Powered by Plone