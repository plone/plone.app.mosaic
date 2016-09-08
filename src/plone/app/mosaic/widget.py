# -*- coding: utf-8 -*-
from AccessControl import getSecurityManager
from plone import api
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.layoutbehavior import ILayoutBehaviorAdaptable
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.app.mosaic.interfaces import IMosaicRegistryAdapter
from plone.app.mosaic.utils import getContentLayoutsForType
from plone.app.mosaic.utils import getUserContentLayoutsForType
from plone.app.widgets.base import dict_merge
from plone.app.widgets.base import TextareaWidget
from plone.app.widgets.utils import get_tinymce_options
from plone.app.z3cform.widget import BaseWidget
from plone.dexterity.browser.base import DexterityExtensibleForm
from plone.memoize.view import memoize
from plone.registry.interfaces import IRegistry
from plone.z3cform.fieldsets.extensible import FormExtender
from plone.z3cform.fieldsets.interfaces import IFormExtender
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from z3c.form.browser.textarea import TextAreaWidget
from z3c.form.interfaces import HIDDEN_MODE
from z3c.form.interfaces import IAddForm
from z3c.form.interfaces import IFieldWidget
from z3c.form.interfaces import ITextAreaWidget
from z3c.form.util import getSpecification
from z3c.form.widget import FieldWidget
from zope.component import adapter
from zope.component import queryUtility
from zope.interface import implementer
from zope.interface import implementer_only


LAYOUT_VIEWS = ['layout_view', '@@layout_view']

LAYOUT_BEHAVIORS = {
    'plone.app.blocks.layoutbehavior.ILayoutAware',
    'plone.layoutaware',
}


class ILayoutWidget(ITextAreaWidget):
    """Marker interface for the LayoutWidget."""


@implementer_only(ILayoutWidget)
class LayoutWidget(BaseWidget, TextAreaWidget):
    """Layout widget for z3c.form."""

    _base = TextareaWidget

    pattern = 'layout'
    pattern_options = BaseWidget.pattern_options.copy()

    @property
    @memoize
    def enabled(self):
        # Disable Mosaic editor when the selected layout for the current
        # ILayoutAware or DX add form context is not custom layout
        current_browser_layout = (
            self._add_form_portal_type_default_view() or
            self._context_selected_layout()
        )
        return current_browser_layout in LAYOUT_VIEWS

    def obtainType(self):  # noqa
        """
        Obtains the type of the context object or of the object we are adding
        """
        if 'type' in self.request.form:
            return self.request.form['type']
        elif IAddForm.providedBy(getattr(self.form, '__parent__', None)):
            return getattr(getattr(
                self.form, '__parent__', self.form), 'portal_type', None)
        else:
            if hasattr(self.context, 'portal_type'):
                return self.context.portal_type
        return None

    def get_options(self):
        registry = queryUtility(IRegistry)
        adapted = IMosaicRegistryAdapter(registry)
        pt = self.obtainType()
        kwargs = {
            'type': pt,
            'context': self.context,
            'request': self.request,
        }
        result = adapted(**kwargs)

        sm = getSecurityManager()

        result['canChangeLayout'] = sm.checkPermission(
            'Plone: Customize Content Layouts', self.context)
        # This is a site permission...
        # you can either manage layouts globally or not
        result['canManageLayouts'] = sm.checkPermission(
            'Plone: Manage Content Layouts', api.portal.get())
        result['context_url'] = self.context.absolute_url()
        result['tinymce'] = get_tinymce_options(
            self.context,
            self.field,
            self.request
        )
        if 'pattern_options' in result['tinymce']:
            # BBB Plone 4.3.x
            result['tinymce'] = result['tinymce']['pattern_options']

        result['customContentLayout_selector'] = '#formfield-{0:s}'.format(
            self.name.replace('.', '-')
        )
        result['contentLayout_selector'] = '#formfield-{0:s}'.format(
            self.name.replace(
                '.', '-'
            ).replace(
                '-customContentLayout', '-contentLayout'
            )
        )
        result['customContentLayout_field_selector'] = '[name="{0:s}"]'.format(
            self.name
        )
        result['contentLayout_field_selector'] = '[name="{0:s}"]'.format(
            self.name.replace('.customContentLayout', '.contentLayout')
        )

        result['available_layouts'] = getContentLayoutsForType(pt)
        result['user_layouts'] = getUserContentLayoutsForType(pt)

        return {'data': result}

    def _base_args(self):
        """Method which will calculate _base class arguments.

        Returns (as python dictionary):
            - `pattern`: pattern name
            - `pattern_options`: pattern options
            - `name`: field name
            - `value`: field value

        :returns: Arguments which will be passed to _base
        :rtype: dict
        """
        args = super(LayoutWidget, self)._base_args()
        args['name'] = self.name
        args['value'] = self.value

        args.setdefault('pattern_options', {})
        args['pattern_options'] = dict_merge(
            self.get_options(),
            args['pattern_options'])

        if not self.enabled:
            args['pattern'] = self.pattern + '-disabled'

        return args

    def _add_form_portal_type_default_view(self):
        """Return the default view of the portal type of this add form
        if we are on a add form
        """
        if not IAddForm.providedBy(getattr(self.form, '__parent__', None)):
            return ''

        portal_type = getattr(getattr(
            self.form, '__parent__', self.form), 'portal_type', None)
        if portal_type is None:
            return ''

        types_tool = api.portal.get_tool('portal_types')
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            return ''

        behaviors = getattr(fti, 'behaviors', None) or []

        if not (LAYOUT_BEHAVIORS & set(behaviors)):
            return ''

        return fti.default_view

    def _context_selected_layout(self):
        """Return the current layout for the layout aware context if we
        are on the layout aware context
        """
        if not ILayoutAware(self.context, None):
            return ''
        selectable_layout = ISelectableBrowserDefault(self.context, None)
        if not selectable_layout:
            return ''
        return selectable_layout.getLayout()


@adapter(getSpecification(ILayoutAware['customContentLayout']), IMosaicLayer)
@implementer(IFieldWidget)
def LayoutFieldWidget(field, request):  # noqa
    return FieldWidget(field, LayoutWidget(request))


@implementer(IFormExtender)
@adapter(ILayoutBehaviorAdaptable, IMosaicLayer, DexterityExtensibleForm)
class HideSiteLayoutFields(FormExtender):

    def update(self):
        for group in self.form.groups:
            if 'ILayoutAware.pageSiteLayout' not in group.fields:
                continue
            group.fields['ILayoutAware.pageSiteLayout'].mode = HIDDEN_MODE
            group.fields['ILayoutAware.sectionSiteLayout'].mode = HIDDEN_MODE
            break
