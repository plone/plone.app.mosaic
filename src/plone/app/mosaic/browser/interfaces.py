# -*- coding: utf-8 -*-
from zope.interface import Interface

try:
    from Products.CMFPlone.browser.interfaces import IMainTemplate

except ImportError:

    class IMainTemplate(Interface):
        """Interface to the view that generated the main_template"""

