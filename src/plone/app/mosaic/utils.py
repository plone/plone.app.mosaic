# -*- coding: utf-8 -*-
from zope.component import queryUtility, getMultiAdapter
from zope.interface import Interface
from zope.schema.interfaces import IField

from zope.security.interfaces import IPermission
from AccessControl import getSecurityManager

from z3c.form.interfaces import IEditForm, IFieldWidget, DISPLAY_MODE, \
                                HIDDEN_MODE
from plone.supermodel.utils import mergedTaggedValueDict, mergedTaggedValueList
from plone.autoform.interfaces import IFormFieldProvider
from plone.autoform.interfaces import OMITTED_KEY, WIDGETS_KEY, MODES_KEY
from plone.autoform.interfaces import READ_PERMISSIONS_KEY, \
                                      WRITE_PERMISSIONS_KEY
from plone.autoform.utils import mergedTaggedValuesForIRO

from plone.dexterity.interfaces import IDexterityFTI
from plone.dexterity.utils import resolveDottedName

from plone.app.blocks.interfaces import IOmittedField


class PermissionChecker(object):

    def __init__(self, permissions, context):
        self.permissions = permissions
        self.context = context
        self.sm = getSecurityManager()
        self.cache = {}

    def allowed(self, field_name):
        permission_name = self.permissions.get(field_name, None)
        if permission_name is not None:
            if permission_name not in self.cache:
                permission = queryUtility(IPermission, name=permission_name)
                if permission is None:
                    self.cache[permission_name] = True
                else:
                    self.cache[permission_name] = bool(
                        self.sm.checkPermission(permission.title,
                                                self.context),
                    )
        return self.cache.get(permission_name, True)


def _getWidgetName(field, widgets, request):
    if field.__name__ in widgets:
        factory = widgets[field.__name__]
    else:
        factory = getMultiAdapter((field, request), IFieldWidget)
    if isinstance(factory, basestring):
        return factory
    if not isinstance(factory, type):
        factory = factory.__class__
    return '%s.%s' % (factory.__module__, factory.__name__)


def isVisible(name, omitted):
    value = omitted.get(name, False)
    if isinstance(value, basestring):
        return value == 'false'
    else:
        return not bool(value)


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
