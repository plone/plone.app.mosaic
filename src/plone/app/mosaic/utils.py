# -*- coding: utf-8 -*-
from AccessControl.security import checkPermission
from plone.app.blocks.interfaces import CONTENT_LAYOUT_MANIFEST_FORMAT
from plone.app.blocks.interfaces import CONTENT_LAYOUT_RESOURCE_NAME
from plone.app.blocks.interfaces import IOmittedField
from plone.app.blocks.resource import getLayoutsFromDirectory
from plone.app.blocks.resource import getLayoutsFromResources
from plone.app.blocks.utils import isVisible
from plone.app.blocks.utils import PermissionChecker
from plone.autoform.interfaces import MODES_KEY
from plone.autoform.interfaces import OMITTED_KEY
from plone.autoform.interfaces import READ_PERMISSIONS_KEY
from plone.autoform.interfaces import WIDGETS_KEY
from plone.autoform.interfaces import WRITE_PERMISSIONS_KEY
from plone.autoform.utils import mergedTaggedValuesForIRO
from plone.autoform.widgets import ParameterizedWidget
from plone.registry.interfaces import IRegistry
from plone.resource.interfaces import IResourceDirectory
from plone.resource.utils import queryResourceDirectory
from plone.supermodel.utils import mergedTaggedValueDict
from Products.CMFCore.utils import getToolByName
from z3c.form.interfaces import DISPLAY_MODE
from z3c.form.interfaces import HIDDEN_MODE
from z3c.form.interfaces import IEditForm
from z3c.form.interfaces import IFieldWidget
from zExceptions import NotFound
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.component.hooks import getSite
from zope.interface import Interface
from zope.schema.interfaces import IField

import os

WIDGET_NAMES_MAP = {
    'plone.app.z3cform.widget.RichTextWidget':
    'plone.app.z3cform.widget.RichTextFieldWidget'
}


def _getWidgetName(field, widgets, request):
    if field.__name__ in widgets:
        factory = widgets[field.__name__]
    else:
        factory = getMultiAdapter((field, request), IFieldWidget)
    if isinstance(factory, basestring):
        name = factory
    else:
        if isinstance(factory, ParameterizedWidget):
            factory = factory.widget_factory
        elif not isinstance(factory, type):
            factory = factory.__class__
        name = '{0:s}.{1:s}'.format(factory.__module__, factory.__name__)
    return WIDGET_NAMES_MAP.get(name, name)


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
                    'id': '{0:s}.{1:s}'.format(schema.__identifier__, name),
                    'name': prefix + name,
                    'title': schema[name].title,
                    'widget': _getWidgetName(schema[name], widgets, request),
                    'readonly': name in read_only,
                }


def getContentLayoutsForType(pt, context=None):
    result = []
    registry = getUtility(IRegistry)
    hidden = registry.get('plone.app.mosaic.hidden_content_layouts', [])[:]
    for item in hidden[:]:
        # undocumented feature right now.
        # need to figure out how to integrate into UI yet
        if '::' in item:
            # seperator to be able to specify hidden for a specific type
            key, _, hidden_type = item.partition('::')
            if hidden_type == pt:
                hidden.append(key)
    for key, value in getLayoutsFromResources(
            CONTENT_LAYOUT_MANIFEST_FORMAT).items():
        if key in hidden:
            continue
        _for = [v for v in (value.get('for') or '').split(',') if v]
        if _for and pt not in _for:
            continue
        preview = value.get('preview', value.get('screenshot'))
        if preview and not preview.startswith('++'):
            value['preview'] = '++contentlayout++' + '/'.join(
                [os.path.dirname(key), preview])
        value['path'] = key
        result.append(value)
    if context is not None:
        result = [value for value in result
                  if not value.get('permission') or
                  checkPermission(value.get('permission'), context)]
    result.sort(key=lambda l: l.get('sort_key', '') or l.get('title', ''))
    return result


def getUserContentLayoutsForType(pt):
    result = []
    layout_resources = queryResourceDirectory(
        CONTENT_LAYOUT_RESOURCE_NAME,
        'custom'
    )
    portal_membership = getToolByName(getSite(), 'portal_membership')
    user_id = portal_membership.getAuthenticatedMember().getId()
    try:
        users_directory = layout_resources['user-layouts']
        user_directory = users_directory[user_id]
    except (NotFound, TypeError):
        return []

    for key, value in getLayoutsFromDirectory(
            user_directory, CONTENT_LAYOUT_MANIFEST_FORMAT).items():
        value['path'] = 'custom/user-layouts/' + key
        _for = [v for v in (value.get('for') or '').split(',') if v]
        if _for and pt not in _for:
            continue
        preview = value.get('preview', value.get('screenshot'))
        if preview and not preview.startswith('++'):
            value['preview'] = (
                '++contentlayout++custom/user-layouts/{user_id}/{path}'.format(
                    user_id=user_id,
                    path='/'.join([os.path.dirname(key), preview])
                )
            )
        result.append(value)
    return result
