from io import StringIO
from lxml import etree
from plone import api
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.layoutbehavior import ILayoutBehaviorAdaptable
from plone.app.mosaic.interfaces import IAction
from plone.app.mosaic.setuphandlers import create_ttw_layout_examples
from plone.app.mosaic.widget import LAYOUT_BEHAVIORS
from plone.registry.field import ASCIILine
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

import logging

logger = logging.getLogger(__name__)


PROFILE_ID = "profile-plone.app.mosaic:default"


def upgrade_1_to_2(context):
    qi = api.portal.get_tool("portal_quickinstaller")
    qi.reinstallProducts(["plone.app.standardtiles"])

    create_ttw_layout_examples(api.portal.get())


def upgrade_2_to_3(context):
    create_ttw_layout_examples(api.portal.get())


def upgrade_3_to_4(context):
    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")
    setup.runImportStepFromProfile(PROFILE_ID, "controlpanel")


def upgrade_4_to_5(context):
    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")


def upgrade_5_to_6(context):
    registry = getUtility(IRegistry)
    for key in tuple(registry.records):
        if key.startswith("plone.app.mosaic.format"):
            del registry.records[key]
        elif key.startswith("plone.app.mosaic.tinymce"):
            del registry.records[key]

    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")


def upgrade_6_to_7(context):
    qi = api.portal.get_tool("portal_quickinstaller")
    qi.reinstallProducts(["plone.app.standardtiles"])

    create_ttw_layout_examples(api.portal.get())


def upgrade_7_to_8(context):
    registry = getUtility(IRegistry)
    for key in tuple(registry.records):
        if key.startswith("plone.app.mosaic.tinymce"):
            del registry.records[key]

    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")

    qi = api.portal.get_tool("portal_quickinstaller")
    qi.reinstallProducts(["plone.app.standardtiles"])

    create_ttw_layout_examples(api.portal.get())


def upgrade_8_to_9(context):
    portal = api.portal.get()
    types_tool = api.portal.get_tool("portal_types")

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, "behaviors", False)]
    for fti in dx_ftis:
        if not (LAYOUT_BEHAVIORS & set(fti.behaviors)):
            continue

        # Add Mosaic view into available view methods
        view_methods = [i for i in fti.getAvailableViewMethods(portal)]
        view_methods.append("layout_view")
        if "view" in view_methods:
            view_methods.remove("view")
        fti.view_methods = list(set(view_methods))

        if fti.default_view == "view":
            fti.default_view = "layout_view"

    # Re-import registry configuration
    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")


def upgrade_9_to_10(context):
    from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault

    types_tool = api.portal.get_tool("portal_types")
    pc = api.portal.get_tool("portal_catalog")

    # Iterate through all Dexterity content type
    all_ftis = types_tool.listTypeInfo()
    dx_ftis = [x for x in all_ftis if getattr(x, "behaviors", False)]
    for fti in dx_ftis:
        if not (LAYOUT_BEHAVIORS & set(fti.behaviors)):
            continue

        results = pc.unrestrictedSearchResults(portal_type=fti.id)
        for brain in results:
            ob = brain._unrestrictedGetObject()
            ob_default = ISelectableBrowserDefault(ob, None)
            if ob_default is None:
                continue
            if ob_default.getLayout() in ["view", "@@view"]:
                ob_default.setLayout("layout_view")


def upgrade_registry(context):
    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")


def upgrade_to_1_0_0(context):
    setup = api.portal.get_tool("portal_setup")
    setup.runImportStepFromProfile(PROFILE_ID, "plone.app.registry")
    catalog = api.portal.get_tool("portal_catalog")
    if "layout" not in catalog.indexes():
        catalog.addIndex("layout", "FieldIndex")

    # go through and index layout aware docs
    catalog = api.portal.get_tool("portal_catalog")
    for brain in catalog(object_provides=ILayoutAware.__identifier__):
        obj = brain.getObject()
        obj.reindexObject(idxs=["layout"])


def upgrade_to_1_0rc3(context):
    registry = getUtility(IRegistry)
    actions = registry.get("plone.app.mosaic.default_available_actions", None)
    if actions and "remove" in actions:
        actions.remove("remove")
        key = "plone.app.mosaic.default_available_actions"
        registry.records[key] = actions

    entry = registry.forInterface(
        IAction, prefix="plone.app.mosaic.secondary_actions.remove", check=False
    )

    for name in entry.__schema__.names():
        key = entry.__prefix__ + name
        if key in registry.records:
            del registry.records[key]


def upgrade_to_1_1(context):
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5016"), "plone.app.registry"
    )


def upgrade_to_2_0rc1(context):
    catalog = api.portal.get_tool("portal_catalog")
    for brain in catalog(object_provides=ILayoutAware.__identifier__):
        obj = brain.getObject()
        obj.reindexObject(idxs=["object_provides", "layout"])

    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5017"), "plone.app.registry"
    )


def upgrade_to_2_0rc3(context):
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5018"), "plone.app.registry"
    )


def upgrade_to_2_0rc4(context):
    # Ensure that all default layout definitions are encoded ascii strings
    registry = getUtility(IRegistry)
    for key in tuple(registry.records):
        if key.startswith("plone.app.blocks.default_layout"):
            if isinstance(registry.records[key].field, ASCIILine):
                continue

            record = registry.records[key]
            record.field = ASCIILine(
                title=record.field.title, description=record.field.description
            )
            record.value = str(record.value)
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5019"), "plone.app.registry"
    )


def upgrade_to_2_0rc5(context):
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5020"), "plone.app.registry"
    )


def upgrade_to_2_0rc6(context):
    # Remove table contextmenu actions from default rich text tiles
    # (they were originally assigned only for special table tile and
    # were accidentally assigned to the default tiles when the default
    # table tile was removed).
    registry = getUtility(IRegistry)
    keys = [
        "plone.app.mosaic.widget_actions.plone_app_z3cform_widget_RichTextFieldWidget.actions",  # noqa
        "plone.app.mosaic.app_tiles.plone_app_standardtiles_html.available_actions",  # noqa
    ]
    values = [
        "contextmenu-tableprops",
        "contextmenu-cell",
        "contextmenu-row",
        "contextmenu-column",
    ]
    for key in keys:
        try:
            value = [v for v in registry[key] if v not in values]
            registry[key] = type(registry[key])(value)
        except KeyError:
            pass


def add_fluid_row_styles(context):
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_5022"), "plone.app.registry"
    )


def upgrade_to_6000(context):
    context.runImportStepFromProfile(
        PROFILE_ID.replace("default", "to_6000"), "plone.app.registry"
    )


# Mapping of old mosaic-width-* classes to Bootstrap 5 equivalents
# See: https://github.com/plone/plone.app.mosaic/issues/593
MOSAIC_WIDTH_TO_BOOTSTRAP = {
    "mosaic-width-full": ["col-12"],
    "mosaic-width-half": ["col-sm-6"],
    "mosaic-width-quarter": ["col-sm-6", "col-lg-3"],
    "mosaic-width-three-quarters": ["col-sm-6", "col-lg-9"],
    "mosaic-width-third": ["col-sm-6", "col-lg-4"],
    "mosaic-width-two-thirds": ["col-sm-6", "col-lg-8"],
}


def _cleanup_mosaic_grid_cell_classes(old_classes):
    """
    Clean up obsolete mosaic-grid-cell classes and convert to Bootstrap 5.

    - Removes obsolete mosaic-position-* classes (except mosaic-position-0)
    - Converts mosaic-width-* classes to Bootstrap equivalents
    - Ensures 'col' class is present when no col-* variant exists

    Returns tuple of (new_classes_string, was_changed)
    """
    new_classes = []
    has_col_class = False

    for klass in old_classes.split():
        # Keep essential mosaic classes
        if klass == "mosaic-grid-cell":
            new_classes.append(klass)
            continue

        # Keep mosaic-position-0 (still used), remove other position classes
        if klass == "mosaic-position-0":
            new_classes.append(klass)
            continue
        if klass.startswith("mosaic-position"):
            # Remove obsolete position classes like mosaic-position-leftmost
            continue

        # Convert mosaic-width-* to Bootstrap equivalents
        if klass in MOSAIC_WIDTH_TO_BOOTSTRAP:
            bootstrap_classes = MOSAIC_WIDTH_TO_BOOTSTRAP[klass]
            new_classes.extend(bootstrap_classes)
            has_col_class = True
            continue

        # Remove any other mosaic-width-* classes not in mapping
        if klass.startswith("mosaic-width"):
            continue

        # Keep col and col-* classes
        if klass == "col" or klass.startswith("col-"):
            new_classes.append(klass)
            has_col_class = True
            continue

        # Keep any other classes (custom classes)
        new_classes.append(klass)

    # Ensure mosaic-grid-cell is first
    if "mosaic-grid-cell" not in new_classes:
        new_classes.insert(0, "mosaic-grid-cell")

    # Ensure we have at least a col class for Bootstrap grid
    if not has_col_class:
        new_classes.append("col")

    new_classes_str = " ".join(new_classes)
    was_changed = old_classes != new_classes_str
    return new_classes_str, was_changed


def upgrade_cleanup_grid_cell_classes(context):
    """
    Upgrade step to clean up obsolete mosaic-grid-cell CSS classes.

    This upgrade step:
    - Removes obsolete mosaic-position-* classes (like mosaic-position-leftmost)
    - Converts mosaic-width-* classes to Bootstrap 5 equivalents
    - Ensures 'col' class is present when no col-* variant exists

    See: https://github.com/plone/plone.app.mosaic/issues/593
    """
    catalog = api.portal.get_tool("portal_catalog")
    parser = etree.HTMLParser()
    cell_xpath = etree.XPath('.//div[contains(@class, "mosaic-grid-cell")]')

    total_objects = 0
    changed_objects = 0

    for brain in catalog.unrestrictedSearchResults(
        object_provides=ILayoutBehaviorAdaptable.__identifier__
    ):
        obj = brain.getObject()
        layout = ILayoutAware(obj)
        custom = layout.customContentLayout

        if not custom:
            continue

        total_objects += 1
        changed = False
        input_file = StringIO(custom)
        tree = etree.parse(input_file, parser=parser)

        for div in cell_xpath(tree):
            old_classes = div.attrib.get("class", "")
            new_classes, was_changed = _cleanup_mosaic_grid_cell_classes(old_classes)

            if was_changed:
                changed = True
                div.attrib["class"] = new_classes

        if changed:
            changed_objects += 1
            new_custom = etree.tounicode(tree, method="html")
            layout.customContentLayout = new_custom
            logger.info(
                "Cleaned up mosaic-grid-cell classes for %s", obj.absolute_url()
            )

    logger.info(
        "Upgrade complete: processed %d objects, updated %d objects",
        total_objects,
        changed_objects,
    )
