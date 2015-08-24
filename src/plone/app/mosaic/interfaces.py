# -*- coding: utf-8 -*-
import pkg_resources

from zope.interface import Interface
from zope import schema

from plone.app.mosaic import _PMF as _


HAVE_PLONE_5 = \
    int(pkg_resources.get_distribution('Products.CMFPlone').version[0]) > 4


class IMosaicLayer(Interface):
    """Plone Mosaic browser layer
    """


class IMosaicRegistryAdapter(Interface):
    """Marker interface for the registry adapter"""

    def __call__(**kwargs):
        """Perform a query for the registry and return results"""


class IWeightedDict(Interface):
    name = schema.TextLine(title=_(u"Name"))
    label = schema.TextLine(title=_(u"Label"))
    weight = schema.Int(title=_(u"Weight"))


class IFormat(Interface):
    """Interface for the format configuration in the registry"""
    name = schema.TextLine(title=_(u"Name"))
    category = schema.TextLine(title=_(u"Category"))
    label = schema.TextLine(title=_(u"Label"))
    action = schema.TextLine(title=_(u"Action"))
    icon = schema.Bool(title=_(u"Icon"))
    favorite = schema.Bool(title=_(u"Favorite"))
    weight = schema.Int(title=_(u"Weight"))


class IAction(Interface):
    name = schema.TextLine(title=_(u"Name"))
    fieldset = schema.TextLine(title=_(u"Fieldset"))
    label = schema.TextLine(title=_(u"Label"))
    action = schema.TextLine(title=_(u"Action"))
    icon = schema.Bool(title=_(u"Icon"))
    menu = schema.Bool(title=_(u"Menu"))
    weight = schema.Int(title=_(u"Weight"))


class IFieldTile(Interface):
    """Interface for the field tile configuration in the registry
    """
    id = schema.TextLine(title=_(u"The widget id"))
    name = schema.TextLine(title=_(u"Name"))
    label = schema.TextLine(title=_(u"Label"))
    category = schema.TextLine(title=_(u"Category"))
    tile_type = schema.TextLine(title=_(u"Type"))
    read_only = schema.Bool(title=_(u"Read only"))
    favorite = schema.Bool(title=_(u"Favorite"))
    widget = schema.TextLine(title=_(u"Field widget"))
    available_actions = schema.List(title=_(u"Actions"),
                                    value_type=schema.TextLine())


class ITile(Interface):
    """Interface for the tile configuration in the registry"""
    name = schema.TextLine(title=_(u"Name"))
    label = schema.TextLine(title=_(u"Label"))
    category = schema.TextLine(title=_(u"Category"))
    tile_type = schema.TextLine(title=_(u"Type"))
    default_value = schema.TextLine(title=_(u"Default value"), required=False)
    read_only = schema.Bool(title=_(u"Read only"))
    settings = schema.Bool(title=_(u"Settings"))
    favorite = schema.Bool(title=_(u"Favorite"))
    rich_text = schema.Bool(title=_(u"Rich Text"))
    weight = schema.Int(title=_(u"Weight"))


class IWidgetAction(Interface):
    name = schema.TextLine(title=_(u"Name"))
    actions = schema.List(title=_(u"Actions"),
                          value_type=schema.TextLine())
