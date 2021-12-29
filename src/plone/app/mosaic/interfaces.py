from plone.app.mosaic import _
from zope import schema
from zope.interface import Interface


class IMosaicLayer(Interface):
    """Plone Mosaic browser layer"""


class IMosaicRegistryAdapter(Interface):
    """Marker interface for the registry adapter"""

    def __call__(**kwargs):
        """Perform a query for the registry and return results"""


class IWeightedDict(Interface):
    name = schema.TextLine(title=_("Name"))
    label = schema.TextLine(title=_("Label"))
    weight = schema.Int(title=_("Weight"))


class IFormat(Interface):
    """Interface for the format configuration in the registry"""

    name = schema.TextLine(title=_("Name"))
    category = schema.TextLine(title=_("Category"))
    label = schema.TextLine(title=_("Label"))
    action = schema.TextLine(title=_("Action"))
    icon = schema.Bool(title=_("Icon"))
    favorite = schema.Bool(title=_("Favorite"))
    weight = schema.Int(title=_("Weight"))


class IAction(Interface):
    name = schema.TextLine(title=_("Name"))
    fieldset = schema.TextLine(title=_("Fieldset"))
    label = schema.TextLine(title=_("Label"))
    action = schema.TextLine(title=_("Action"))
    icon = schema.Bool(title=_("Icon"))
    menu = schema.Bool(title=_("Menu"))
    weight = schema.Int(title=_("Weight"))


class IFieldTile(Interface):
    """Interface for the field tile configuration in the registry"""

    id = schema.TextLine(title=_("The widget id"))
    name = schema.TextLine(title=_("Name"))
    label = schema.TextLine(title=_("Label"))
    category = schema.TextLine(title=_("Category"))
    tile_type = schema.TextLine(title=_("Type"))
    read_only = schema.Bool(title=_("Read only"))
    favorite = schema.Bool(title=_("Favorite"))
    widget = schema.TextLine(title=_("Field widget"))
    available_actions = schema.List(title=_("Actions"), value_type=schema.TextLine())


class ITile(Interface):
    """Interface for the tile configuration in the registry"""

    name = schema.TextLine(title=_("Name"))
    label = schema.TextLine(title=_("Label"))
    category = schema.TextLine(title=_("Category"))
    tile_type = schema.TextLine(title=_("Type"))
    default_value = schema.TextLine(title=_("Default value"), required=False)
    read_only = schema.Bool(title=_("Read only"))
    settings = schema.Bool(title=_("Settings"))
    favorite = schema.Bool(title=_("Favorite"))
    rich_text = schema.Bool(title=_("Rich Text"))
    weight = schema.Int(title=_("Weight"))


class IWidgetAction(Interface):
    name = schema.TextLine(title=_("Name"))
    actions = schema.List(title=_("Actions"), value_type=schema.TextLine())
