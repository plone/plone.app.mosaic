# -*- coding: utf-8 -*-
from Acquisition import aq_base
from Acquisition import aq_parent
from plone import api
from plone.app.blocks.interfaces import IBlocksSettings
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.blocks.utils import gridXPath
from plone.app.blocks.utils import xpath1
from plone.registry.interfaces import IRegistry
from plone.transformchain.interfaces import ITransform
from repoze.xmliter.serializer import XMLSerializer
from zope.component import getAdapters
from zope.component import queryMultiAdapter
from zope.component import queryUtility
from zope.interface import implementer
from zope.viewlet.interfaces import IViewlet
from zope.viewlet.interfaces import IViewletManager
import re

LAYOUT_NAME = re.compile(r'[a-zA-Z_\-]+/[a-zA-Z_\-]+')


@implementer(ITransform)
class HTTPHeaders(object):
    """Ensure that HTTP response headers normally set when main_template
    renders plone.httpheaders viewlet manager are also set when main_template
    is not called (e.g. with pure-HTML site layouts).
    """

    order = 8800

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def _setHeaders(self):
        if self.published is None or \
                not self.request.get('plone.app.blocks.enabled', False):
            return None

        context = aq_parent(aq_base(self.published)) or api.portal.get()
        manager = queryMultiAdapter(
            (context, self.request, self.published),
            IViewletManager, name='plone.httpheaders'
        )
        if manager is not None:
            headers = map(str.lower, self.request.response.headers)
            for name, viewlet in getAdapters(
                (context, self.request, self.published, manager),
                IViewlet
            ):
                viewlet.update()
                for key, value in viewlet.getHeaders():
                    if key.lower() not in headers:
                        self.request.response.setHeader(key, value)

    def transformString(self, result, encoding):
        self._setHeaders()
        return None

    def transformUnicode(self, result, encoding):
        self._setHeaders()
        return None

    def transformIterable(self, result, encoding):
        self._setHeaders()
        return None


@implementer(ITransform)
class HTMLLanguage(object):
    """Set HTML tag language attributes"""

    order = 8800

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def transformString(self, result, encoding):
        return None

    def transformUnicode(self, result, encoding):
        return None

    def transformIterable(self, result, encoding):
        if self.published is None or \
                not self.request.get('plone.app.blocks.enabled', False) or \
                not isinstance(result, XMLSerializer):
            return None

        context = aq_parent(aq_base(self.published)) or api.portal.get()
        state = queryMultiAdapter((context, self.request),
                                  name='plone_portal_state')

        root = result.tree.getroot()
        if state and root is not None:
            root.attrib['lang'] = state.language()

        return result


@implementer(ITransform)
class BodyClass(object):
    """Set body tag class"""

    order = 8800

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def transformString(self, result, encoding):
        return None

    def transformUnicode(self, result, encoding):
        return None

    def transformIterable(self, result, encoding):
        if self.published is None or \
                not self.request.get('plone.app.blocks.enabled', False) or \
                not isinstance(result, XMLSerializer):
            return None

        context = aq_parent(aq_base(self.published)) or api.portal.get()
        layout = queryMultiAdapter((context, self.request),
                                   name='plone_layout')
        root = result.tree.getroot()
        body = root.find('body')

        if layout is None or body is None:
            return result

        body_class = body.attrib.get('class', '')
        body_classes = body_class.split()

        # Get default body classes
        if 'template-' not in body_class and 'site-' not in body_class:
            body_classes.extend([name for name
                                 in layout.bodyClass(None, self.published)
                                 if name not in body_classes])

        # Get contentLayout body class
        if 'template-layout' in body_classes:
            adapted = ILayoutAware(context, None)
            if adapted is not None:
                layout = getattr(adapted, 'contentLayout', None)
                if layout:
                    # Transform ++contentlayout++default/document.html
                    # into layout-default-document
                    names = LAYOUT_NAME.findall(layout)
                    if len(names) == 1:
                        body_classes.append('layout-' +
                                            names[0].replace('/', '-'))
                else:
                    body_classes.append('layout-custom')

        # Enable mosaic-grid when no grid system is defined
        gridSystem = xpath1(gridXPath, result.tree)
        if gridSystem is None:
            registry = queryUtility(IRegistry)
            if registry:
                settings = registry.forInterface(IBlocksSettings, check=False)
                gridSystem = getattr(
                    settings, 'default_grid_system', None) or None
        if gridSystem is None:
            body_classes.append('mosaic-grid')

        # Set body class
        body.attrib['class'] = ' '.join(body_classes)

        return result
