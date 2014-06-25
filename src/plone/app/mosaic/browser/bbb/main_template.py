# -*- coding: utf-8 -*-
from plone.memoize import view

from plone.app.mosaic.browser.main_template import MainTemplate


class List(list):
    # Clean __repr__ to not publish main_template/macros/master and other
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
