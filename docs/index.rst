===================
Plone Theme Preview
===================

.. include:: _robot.rst
.. figure:: _screenshots/front-page.png
.. code:: robotframework

   Capture Front Page Screenshot
       Go to  ${PLONE_URL}
       Capture page screenshot  _screenshots/front-page.png
