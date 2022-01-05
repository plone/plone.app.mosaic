from copy import deepcopy
from plone.app.mosaic.interfaces import IMosaicRegistryAdapter
from plone.app.mosaic.utils import extractFieldInformation
from plone.dexterity.utils import iterSchemataForType
from plone.registry.interfaces import IRegistry
from Products.CMFCore.interfaces._content import IFolderish
from zope.component import adapter
from zope.i18n import translate
from zope.interface import implementer


class DottedDict(dict):
    """A dictionary where you can access nested dicts with dotted names"""

    def get(self, k, default=None):
        if "." not in k:
            return super().get(k, default)
        val = self
        for x in k.split("."):
            try:
                val = val[x]
            except KeyError:
                return default
        return val


def getBool(value):
    return value.lower() == "true"


def getCategoryIndex(tiles, category):
    index = 0
    for tile in tiles:
        if tile["name"] == category:
            return index
        index += 1
    return None


def weightedSort(x):
    return x[1]["weight"]


def safe_weight_sortkey(x):
    weight = x.get("weight", None)
    return weight if weight is not None else 9000


@implementer(IMosaicRegistryAdapter)
@adapter(IRegistry)
class MosaicRegistry:
    """Adapts a registry object to parse the mosaic settings data"""

    prefix = "plone.app.mosaic"

    def __init__(self, registry):
        self.registry = registry

    def parseRegistry(self):
        """Make a dictionary structure for the values in the registry"""

        result = DottedDict()
        for record in self.registry.records:
            if not record.startswith(self.prefix):
                continue

            splitted = record.split(".")
            current = result
            for x in splitted[:-1]:
                # create the key if it's not there
                if x not in current:
                    current[x] = {}

                current = current[x]

            # store actual key/value
            key = splitted[-1]
            current[key] = self.registry.records[record].value
        return result

    def mapActions(self, settings, config):

        for action_type in ["primary_actions", "secondary_actions"]:
            config[action_type] = []
            key = f"{self.prefix:s}.{action_type:s}"
            actions = list(settings.get(key, {}).items())
            actions.sort(key=weightedSort)
            for key, action in actions:
                # sort items
                items = action.get("items", {})
                if isinstance(items, dict):
                    items = list(items.values())
                if items:
                    action["items"] = items
                    action["items"].sort(key=safe_weight_sortkey)
                    for x in action["items"]:
                        x["value"] = x["name"]

                if not action["fieldset"]:
                    config[action_type].append(action)
                    continue

                index = getCategoryIndex(config[action_type], action["fieldset"])
                if not index:
                    config[action_type].append(
                        {
                            "name": action["fieldset"],
                            "label": action["fieldset"],
                            "actions": [],
                        }
                    )
                    index = getCategoryIndex(config[action_type], action["fieldset"])

                config[action_type][index]["actions"].append(action)

        # Default Available Actions
        key = f"{self.prefix:s}.default_available_actions"
        config["default_available_actions"] = settings.get(key, [])

        return config

    def mapTilesCategories(self, settings, config):
        config["tiles"] = config.get("tiles", [])
        categories = settings.get(f"{self.prefix:s}.tiles_categories", {})
        sorted_categories = list(categories.items())
        sorted_categories.sort(key=weightedSort)
        for key, category in sorted_categories:
            category["tiles"] = []
            config["tiles"].append(category)
        return config

    def mapFormatCategories(self, settings, config):
        config["formats"] = config.get("formats", [])
        categories = settings.get(f"{self.prefix:s}.format_categories", {})
        sorted_categories = list(categories.items())
        sorted_categories.sort(key=weightedSort)
        for key, category in sorted_categories:
            category["actions"] = []
            config["formats"].append(category)
        return config

    def mapFormats(self, settings, config):
        formats = settings.get(f"{self.prefix:s}.formats", {})
        for key, format in formats.items():
            index = getCategoryIndex(config["formats"], format["category"])
            if index is not None:
                config["formats"][index]["actions"].append(format)
        # sort the formats
        for format in config["formats"]:
            format["actions"].sort(key=safe_weight_sortkey)
        return config

    def mapTinyMCEActionCategories(self, settings, config):
        config["richtext_toolbar"] = config.get("richtext_toolbar", [])
        config["richtext_contextmenu"] = config.get("richtext_contextmenu", [])
        categories = settings.get(f"{self.prefix:s}.tinymce_categories", {})
        sorted_categories = list(categories.items())
        sorted_categories.sort(key=weightedSort)
        for key, category in sorted_categories:
            category["actions"] = []
            config["richtext_toolbar"].append(category)
        config["richtext_contextmenu"] = deepcopy(config["richtext_toolbar"])
        return config

    def mapTinyMCEToolbarFormats(self, settings, config):
        actions = settings.get(f"{self.prefix:s}.richtext_toolbar", {})
        for key, action in actions.items():
            index = getCategoryIndex(
                config["richtext_toolbar"], action["category"]
            )  # noqa
            if index is not None:
                config["richtext_toolbar"][index]["actions"].append(action)
        for group in config["richtext_toolbar"]:
            group["actions"].sort(key=safe_weight_sortkey)
        return config

    def mapTinyMCEContextMenuFormats(self, settings, config):
        actions = settings.get(f"{self.prefix:s}.richtext_contextmenu", {})
        for key, action in actions.items():
            index = getCategoryIndex(
                config["richtext_contextmenu"], action["category"]
            )  # noqa
            if index is not None:
                config["richtext_contextmenu"][index]["actions"].append(action)
        for group in config["richtext_contextmenu"]:
            group["actions"].sort(key=safe_weight_sortkey)
        return config

    def mapTiles(self, settings, config, tile_category):
        tiles = settings.get(f"{self.prefix:s}.{tile_category:s}", {})
        for key, tile in tiles.items():
            if "category" not in tile:
                continue
            index = getCategoryIndex(config["tiles"], tile["category"])
            if index is not None:
                config["tiles"][index]["tiles"].append(tile)
        for tile in config["tiles"]:
            tile["tiles"].sort(key=safe_weight_sortkey)
        return config

    # BBB: needs a bit of thought, I'm nowhere near satisfied with this
    # solution
    @classmethod
    def actionsForWidget(cls, settings, widget_name):
        """Looks up which (mosaic) actions are associated to a certain z3c
        widget.

        The lookup is made in 2 parts:

        - First the registry is looked for a key named
          plone.app.mosaic.widget_actions.<'full.widget.dotted.name'
          .replace('.','_')>

        - If it is not found, looks for
          plone.app.mosaic.default_widget_actions

        The rationale is that this way the three default actions are there by
        default, and only if you need special stuff (probably if you provide an
        inline widget) you can override the default, but for the simple use
        case no interaction is needed
        """
        actions = settings.get(
            "{:s}.widget_actions.{:s}.actions".format(
                cls.prefix, widget_name.replace(".", "_")
            ),
            default=None,
        )
        if actions is not None:
            return actions
        return settings.get(f"{cls.prefix:s}.default_widget_actions", default=list())

    def mapFieldTiles(self, settings, config, kwargs):
        args = {
            "type": None,
            "context": None,
            "request": None,
        }
        args.update(kwargs)
        if args["type"] is None:
            return config
        prefixes = []

        registry_omitted = settings.get(
            "{:s}.omitted_fields.{:s}".format(
                self.prefix, args["type"].replace(".", "_")
            ),
            default=None,
        )
        if registry_omitted is None:
            registry_omitted = settings.get(
                self.prefix + ".default_omitted_fields",
                default=[],
            )

        for index, schema in enumerate(iterSchemataForType(args["type"])):
            prefix = ""
            if index > 0:
                prefix = schema.__name__
                if prefix in prefixes:
                    prefix = schema.__identifier__
                prefixes.append(prefix)

            for fieldconfig in extractFieldInformation(
                schema, args["context"], args["request"], prefix
            ):
                if fieldconfig["id"] not in registry_omitted:
                    label = translate(fieldconfig["title"], context=args["request"])
                    tileconfig = {
                        "id": "formfield-form-widgets-{:s}".format(fieldconfig["name"]),
                        "name": fieldconfig["name"],
                        "label": label,
                        "category": "fields",
                        "tile_type": "field",
                        "read_only": fieldconfig["readonly"],
                        "favorite": False,
                        "widget": fieldconfig["widget"],
                        "available_actions": self.actionsForWidget(
                            settings, fieldconfig["widget"]
                        ),
                    }
                    index = getCategoryIndex(config["tiles"], "fields")
                    if index is not None:
                        config["tiles"][index]["tiles"].append(tileconfig)
        return config

    def __call__(self, **kwargs):
        settings = self.parseRegistry()
        config = {}
        config = self.mapFormatCategories(settings, config)
        config = self.mapFormats(settings, config)
        config = self.mapTinyMCEActionCategories(settings, config)
        config = self.mapTinyMCEToolbarFormats(settings, config)
        config = self.mapTinyMCEContextMenuFormats(settings, config)
        config = self.mapActions(settings, config)
        config = self.mapTilesCategories(settings, config)
        for tile_category in ["structure_tiles", "app_tiles"]:
            config = self.mapTiles(settings, config, tile_category)
        config = self.mapFieldTiles(settings, config, kwargs)

        args = {
            "type": None,
            "context": None,
            "request": None,
        }
        args.update(kwargs)
        if IFolderish.providedBy(args["context"]):
            config["parent"] = args["context"].absolute_url() + "/"
        elif args["context"]:
            config["parent"] = (
                getattr(args["context"].aq_inner, "aq_parent", None).absolute_url()
                + "/"
            )
        # context can be None, at least in tests.  Do nothing
        # then.  See test_config in test_mosaicregistry.py

        return config
