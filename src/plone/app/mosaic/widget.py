# -*- coding: utf-8 -*-
from Products.CMFDynamicViewFTI.interfaces import ISelectableBrowserDefault
from Products.CMFCore.utils import getToolByName
from plone.app.widgets.base import InputWidget
from plone.app.widgets.base import dict_merge
from plone.app.widgets.dx import BaseWidget
from plone.registry.interfaces import IRegistry
from z3c.form.browser.text import TextWidget as z3cform_TextWidget
from z3c.form.interfaces import IFieldWidget
from z3c.form.interfaces import IAddForm
from z3c.form.interfaces import IFormLayer
from z3c.form.interfaces import ITextWidget
from z3c.form.util import getSpecification
from z3c.form.widget import FieldWidget
from zope.component import adapter
from zope.component import queryUtility
from zope.interface import implementer
from zope.interface import implementsOnly

from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.mosaic.interfaces import IMosaicRegistryAdapter


try:
    import json
except:
    import simplejson as json


class ILayoutWidget(ITextWidget):
    """Marker interface for the LayoutWidget."""


class LayoutWidget(BaseWidget, z3cform_TextWidget):
    """Layout widget for z3c.form."""

    _base = InputWidget

    implementsOnly(ILayoutWidget)

    pattern = 'layout'
    pattern_options = BaseWidget.pattern_options.copy()

    def obtainType(self):
        """
        Obtains the type of the context object or of the object we are adding
        """
        if 'type' in self.request.form:
            return self.request.form['type']
        else:
            if hasattr(self.context, 'portal_type'):
                return self.context.portal_type
        return None

    def get_options(self):
        registry = queryUtility(IRegistry)
        adapted = IMosaicRegistryAdapter(registry)
        kwargs = {
            'type': self.obtainType(),
            'context': self.context,
            'request': self.request,
        }
        result = adapted(**kwargs)
        result['can_change_layout'] = True
        result['context_url'] = self.context.absolute_url()
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

        # Disable Mosaic editor when the selected layout for the current
        # context is not custom layout
        current_browser_layout = (
            self._add_form_portal_type_default_view()
            or self._context_selected_layout()
        )
        if current_browser_layout not in ['view', '@@view']:
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

        types_tool = getToolByName(self.context, 'portal_types')
        fti = getattr(types_tool, portal_type, None)
        if fti is None:
            return ''

        behaviors = getattr(fti, 'behaviors', None) or []
        if not 'plone.app.blocks.layoutbehavior.ILayoutAware' in behaviors:
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


@adapter(getSpecification(ILayoutAware['content']), IFormLayer)
@implementer(IFieldWidget)
def LayoutFieldWidget(field, request):
    return FieldWidget(field, LayoutWidget(request))
