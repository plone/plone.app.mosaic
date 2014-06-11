# -*- coding: utf-8 -*-
from plone.memoize import view

from plone.app.mosaic.browser.main_template import MainTemplate


class List(list):
    # Used to hide output for main_template/macros/master
    def __repr__(self):
        return ''


class MainTemplateBBB(MainTemplate):

    @property
    @view.memoize
    def macros(self):
        macros = super(MainTemplateBBB, self).macros
        for name in macros:
            macros[name] = List(macros[name])
        return macros
