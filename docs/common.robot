*** Settings ***

Resource  plone/app/robotframework/server.robot
Resource  plone/app/robotframework/keywords.robot
Resource  Selenium2Screenshots/keywords.robot

Variables  plone/app/testing/interfaces.py

*** Variables ***

${FIXTURE}  plone.app.mosaic.testing.PLONE_APP_MOSAIC_ROBOT
@{DIMENSIONS}  1280  1024

*** Keywords ***

Suite Setup
   Run keyword if  sys.argv[0] != 'bin/robot'  Pybot Suite Setup
   Run keyword if  sys.argv[0] == 'bin/robot'  Robot Suite Setup

   Run keyword and ignore error  Set window size  @{DIMENSIONS}

Test Setup
   Import library  Remote  ${PLONE_URL}/RobotRemote

   Run keyword if  sys.argv[0] != 'bin/robot'  Pybot Test Setup
   Run keyword if  sys.argv[0] == 'bin/robot'  Robot Test Setup

   Enable autologin as  Manager
   ${user_id} =  Translate  user_id
   ...  default=jane-doe
   ${user_fullname} =  Translate  user_fullname
   ...  default=Jane Doe
   Create user  ${user_id}  Manager  fullname=${user_fullname}
   Set suite variable  ${USER_ID}  ${user_id}
   Set autologin username  ${user_id}


Test Teardown
   Run keyword if  sys.argv[0] != 'bin/robot'  Pybot Test Teardown
   Run keyword if  sys.argv[0] == 'bin/robot'  Robot Test Teardown

Suite Teardown
   Run keyword if  sys.argv[0] != 'bin/robot'  Pybot Suite Teardown
   Run keyword if  sys.argv[0] == 'bin/robot'  Robot Suite Teardown


Pybot Suite Setup
   Setup Plone site  ${FIXTURE}

Pybot Test Setup
   Log  'Pybot Test Setup is included in Pybot Suite Setup'

Pybot Test Teardown
   Log  'Pybot Test Setup is not necessary because of Pybot Suite Teardown'

# Pybot Test Teardown
#    Set Zope layer  ${FIXTURE}
#    ZODB TearDown
#    ZODB SetUp

Pybot Suite Teardown
   Teardown Plone Site


Robot Suite Setup
   Open test browser

Robot Test Setup
   Remote ZODB SetUp  ${FIXTURE}

Robot Test Teardown
   Remote ZODB TearDown  ${FIXTURE}

Robot Suite Teardown
   Close all browsers
