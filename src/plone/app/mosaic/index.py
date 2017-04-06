# -*- coding: utf-8 -*-
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.indexer.decorator import indexer


@indexer(ILayoutAware)
def get_layout(obj):
    layout_data = ILayoutAware(obj, None)
    if layout_data is not None and layout_data.contentLayout is not None:
        return layout_data.contentLayout
    raise AttributeError('No contentLayout found')
