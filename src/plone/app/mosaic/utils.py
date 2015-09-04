# -*- coding: utf-8 -*-
from plone.app.blocks.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
from plone.app.blocks.interfaces import IOmittedField
from plone.app.blocks.resource import getLayoutsFromResources
from plone.app.blocks.utils import PermissionChecker
from plone.app.blocks.utils import isVisible
from plone.autoform.interfaces import MODES_KEY
from plone.autoform.interfaces import OMITTED_KEY
from plone.autoform.interfaces import READ_PERMISSIONS_KEY
from plone.autoform.interfaces import WIDGETS_KEY
from plone.autoform.interfaces import WRITE_PERMISSIONS_KEY
from plone.autoform.utils import mergedTaggedValuesForIRO
from plone.autoform.widgets import ParameterizedWidget
from plone.resource.interfaces import IResourceDirectory
from plone.supermodel.utils import mergedTaggedValueDict
from z3c.form.interfaces import DISPLAY_MODE
from z3c.form.interfaces import HIDDEN_MODE
from z3c.form.interfaces import IEditForm
from z3c.form.interfaces import IFieldWidget
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.interface import Interface
from zope.schema.interfaces import IField
import os


def _getWidgetName(field, widgets, request):
    if field.__name__ in widgets:
        factory = widgets[field.__name__]
    else:
        factory = getMultiAdapter((field, request), IFieldWidget)
    if isinstance(factory, basestring):
        return factory
    elif isinstance(factory, ParameterizedWidget):
        factory = factory.widget_factory
    elif not isinstance(factory, type):
        factory = factory.__class__
    return '%s.%s' % (factory.__module__, factory.__name__)


def getPersistentResourceDirectory(id_, container=None):
    if container is None:
        container = getUtility(IResourceDirectory, name="persistent")
    if id_ not in container:
        container.makeDirectory(id_)
    return container[id_]


def extractFieldInformation(schema, context, request, prefix):
    iro = [IEditForm, Interface]
    if prefix != '':
        prefix += '-'
    omitted = mergedTaggedValuesForIRO(schema, OMITTED_KEY, iro)
    modes = mergedTaggedValuesForIRO(schema, MODES_KEY, iro)
    widgets = mergedTaggedValueDict(schema, WIDGETS_KEY)

    if context is not None:
        read_permissionchecker = PermissionChecker(
            mergedTaggedValueDict(schema, READ_PERMISSIONS_KEY),
            context,
        )
        write_permissionchecker = PermissionChecker(
            mergedTaggedValueDict(schema, WRITE_PERMISSIONS_KEY),
            context,
        )

    read_only = []
    for name, mode in modes.items():
        if mode == HIDDEN_MODE:
            omitted[name] = True
        elif mode == DISPLAY_MODE:
            read_only.append(name)
    for name in schema.names(True):
        if context is not None:
            if not read_permissionchecker.allowed(name):
                omitted[name] = True
            if not write_permissionchecker.allowed(name):
                read_only.append(name)
        if isVisible(name, omitted):
            field = schema[name]
            if not IField.providedBy(field):
                continue
            if not IOmittedField.providedBy(field):
                yield {
                    'id': "%s.%s" % (schema.__identifier__, name),
                    'name': prefix + name,
                    'title': schema[name].title,
                    'widget': _getWidgetName(schema[name], widgets, request),
                    'readonly': name in read_only,
                }


def getContentLayoutsForType(pt):
    result = []
    for key, value in getLayoutsFromResources(CONTENT_LAYOUT_MANIFEST_FORMAT).items():
        _for = [v for v in (value.get('for') or '').split(',') if v]
        if _for and pt not in _for:
            continue
        if value['screenshot'] and not value['screenshot'].startswith('++'):
            value['screenshot'] = '++contentlayout++' + '/'.join(
                [os.path.dirname(key), value['screenshot']])
        value['path'] = key
        result.append(value)
    result.sort(key=lambda l: l.get('title', ''))
    return result
