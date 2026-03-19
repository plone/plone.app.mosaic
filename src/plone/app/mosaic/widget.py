from AccessControl import getSecurityManager
from plone import api
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.layoutbehavior import ILayoutBehaviorAdaptable
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.interfaces import IMosaicRegistryAdapter
from plone.app.mosaic.utils import getContentLayoutsForType
from plone.app.mosaic.utils import getUserContentLayoutsForType
from plone.app.z3cform.interfaces import ITextAreaWidget
from plone.app.z3cform.widgets.richtext import get_tinymce_options
from plone.app.z3cform.widgets.text import TextAreaWidget
from plone.dexterity.browser.base import DexterityExtensibleForm
from plone.memoize.view import memoize
from plone.registry.interfaces import IRegistry
from plone.z3cform.fieldsets.extensible import FormExtender
from plone.z3cform.fieldsets.interfaces import IFormExtender
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from z3c.form.interfaces import HIDDEN_MODE
from z3c.form.interfaces import IAddForm
from z3c.form.interfaces import IFieldWidget
from z3c.form.util import getSpecification
from z3c.form.widget import FieldWidget
from zope.component import adapter
from zope.component import queryUtility
from zope.interface import implementer
from zope.interface import implementer_only

LAYOUT_VIEWS = {"layout_view", "@@layout_view"}

LAYOUT_BEHAVIORS = {
    "plone.app.blocks.layoutbehavior.ILayoutAware",
    "plone.layoutaware",
}

FORM_DENYS = {"babel_edit"}


class ILayoutWidget(ITextAreaWidget):
    """Marker interface for the LayoutWidget."""


@implementer_only(ILayoutWidget)
class LayoutWidget(TextAreaWidget):
    """Layout widget for z3c.form."""

    @property
    def pattern(self):
        """add check for disabled layout attribute"""
        name = "layout"

        if not self.enabled:
            name = name + "-disabled"

        return name

    @property
    @memoize
    def enabled(self):
        # Disable Mosaic editor on unexpected view names
        if self._form_name() in FORM_DENYS:
            return False
        if "++addtranslation++" in self.request.URL:
            return False
        # Disable Mosaic editor when the form has a status message,
        # because the Mosaic editor is currently unable to properly show
        # validation errors
        if self._form_status():
            return False
        # Disable Mosaic editor when the selected layout for the current
        # ILayoutAware or DX add form context is not custom layout
        current_browser_layout = (
            self._add_form_portal_type_default_view() or self._context_selected_layout()
        )
        return current_browser_layout in LAYOUT_VIEWS

    def obtainType(self):  # noqa
        """
        Obtains the type of the context object or of the object we are adding
        """
        if "type" in self.request.form:
            return self.request.form["type"]
        if IAddForm.providedBy(getattr(self.form, "__parent__", None)):
            return getattr(
                getattr(self.form, "__parent__", self.form), "portal_type", None
            )
        try:
            return self.context.portal_type
        except AttributeError:
            pass

    def get_pattern_options(self):
        # skip options if widget is disabled
        if not self.enabled:
            return {}
        registry = queryUtility(IRegistry)
        adapted = IMosaicRegistryAdapter(registry)
        pt = self.obtainType()
        kwargs = {
            "type": pt,
            "context": self.context,
            "request": self.request,
        }
        result = adapted(**kwargs)

        sm = getSecurityManager()

        result["canChangeLayout"] = sm.checkPermission(
            "Plone: Customize Content Layouts", self.context
        )
        # This is a site permission...
        # you can either manage layouts globally or not
        result["canManageLayouts"] = sm.checkPermission(
            "Plone: Manage Content Layouts", api.portal.get()
        )
        result["context_url"] = self.context.absolute_url()
        result["tinymce"] = get_tinymce_options(self.context, self.field, self.request)

        # implement customized toolbar configuration for mosaic tinymce
        html_tiles = [
            t
            for tg in result["tiles"]
            for t in tg["tiles"]
            if t["name"] == "plone.app.standardtiles.html"
        ]

        if html_tiles:
            toolbar_actions = [
                a[8:]
                for a in html_tiles[0]["available_actions"]
                if a.startswith("toolbar-")
            ]
            if toolbar_actions:
                result["tinymce"]["tiny"]["toolbar"] = " ".join(toolbar_actions)

        result["customContentLayout_selector"] = "#formfield-{:s}".format(
            self.name.replace(".", "-")
        )
        result["contentLayout_selector"] = "#formfield-{:s}".format(
            self.name.replace(".", "-").replace(
                "-customContentLayout", "-contentLayout"
            )
        )
        result["customContentLayout_field_selector"] = f'[name="{self.name:s}"]'
        result["contentLayout_field_selector"] = '[name="{:s}"]'.format(
            self.name.replace(".customContentLayout", ".contentLayout")
        )

        result["available_layouts"] = getContentLayoutsForType(pt, self.context)
        result["user_layouts"] = getUserContentLayoutsForType(pt)

        return result

    def _add_form_portal_type_default_view(self):
        """Return the default view of the portal type of this add form
        if we are on a add form
        """
        if not IAddForm.providedBy(getattr(self.form, "__parent__", None)):
            return ""

        portal_type = getattr(
            getattr(self.form, "__parent__", self.form), "portal_type", None
        )
        if portal_type is None:
            return ""

        types_tool = api.portal.get_tool("portal_types")
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            return ""

        behaviors = set(getattr(fti, "behaviors", None) or [])

        if not (LAYOUT_BEHAVIORS & behaviors):
            return ""

        return fti.default_view

    def _context_selected_layout(self):
        """Return the current layout for the layout aware context if we
        are on the layout aware context
        """
        if not ILayoutAware(self.context, None):
            return ""
        selectable_layout = ISelectableBrowserDefault(self.context, None)
        if not selectable_layout:
            return ""
        return selectable_layout.getLayout()

    def _form_name(self):
        """Return the view name of the underlying form"""
        try:
            return self.form._parent.__name__
        except AttributeError:
            pass
        try:
            return self.form.__name__
        except AttributeError:
            pass
        return ""

    def _form_status(self):
        """Return the current status message of the underlying form"""
        try:
            return self.form._parent.status
        except AttributeError:
            pass
        try:
            return self.form.status
        except AttributeError:
            pass
        return ""


@adapter(getSpecification(ILayoutAware["customContentLayout"]), IMosaicLayer)
@implementer(IFieldWidget)
def LayoutFieldWidget(field, request):  # noqa
    return FieldWidget(field, LayoutWidget(request))


@implementer(IFormExtender)
@adapter(ILayoutBehaviorAdaptable, IMosaicLayer, DexterityExtensibleForm)
class HideSiteLayoutFields(FormExtender):
    def update(self):
        for group in self.form.groups:
            if "ILayoutAware.pageSiteLayout" not in group.fields:
                continue
            group.fields["ILayoutAware.pageSiteLayout"].mode = HIDDEN_MODE
            group.fields["ILayoutAware.sectionSiteLayout"].mode = HIDDEN_MODE
            break
