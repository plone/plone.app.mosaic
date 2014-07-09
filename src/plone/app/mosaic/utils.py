# -*- coding: utf-8 -*-
from plone.resource.interfaces import IResourceDirectory
from zope.component import getUtility


def getPersistentResourceDirectory(id_, container=None):
    if container is None:
        container = getUtility(IResourceDirectory, name="persistent")
    if id_ not in container:
        container.makeDirectory(id_)
    return container[id_]
