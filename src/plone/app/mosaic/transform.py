from Acquisition import aq_base
from Acquisition import aq_parent
from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.app.mosaic.interfaces import IMosaicLayer
from plone.transformchain.interfaces import ITransform
from repoze.xmliter.serializer import XMLSerializer
from zope.browser.interfaces import IBrowserView
from zope.component import getAdapters
from zope.component import queryMultiAdapter
from zope.component.hooks import getSite
from zope.interface import implementer
from zope.viewlet.interfaces import IViewlet
from zope.viewlet.interfaces import IViewletManager

import logging
import re


logger = logging.getLogger(__name__)

LAYOUT_NAME = re.compile(r"[a-zA-Z_\-]+/[a-zA-Z_\-]+")


def getContext(context):
    """Return a safe context.
    In case a IBrowserView was passed (e.g. due to a 404 page), return the
    portal object.
    """
    context = aq_parent(aq_base(context))
    if not context or IBrowserView.providedBy(context):
        return getSite()
    return context


@implementer(ITransform)
class TransformBase:
    """Transform base class"""

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def transform(self, result, encoding):
        raise NotImplementedError

    def transformBytes(self, result, encoding):
        return None

    def transformUnicode(self, result, encoding):
        return None

    def transformIterable(self, result, encoding):
        if (
            self.published is None
            or not isinstance(result, XMLSerializer)
            or not self.request.get("plone.app.blocks.enabled", False)
            or self.request.get("plone.app.blocks.disabled", False)
            or not IMosaicLayer.providedBy(self.request)
        ):
            return None
        return self.transform(result, encoding)


@implementer(ITransform)
class HTTPHeaders(TransformBase):
    """Ensure that HTTP response headers normally set when main_template
    renders plone.httpheaders viewlet manager are also set when main_template
    is not called (e.g. with pure-HTML site layouts).
    """

    order = 8800

    def transform(self, result, encoding):
        context = getContext(self.published)
        manager = queryMultiAdapter(
            (context, self.request, self.published),
            IViewletManager,
            name="plone.httpheaders",
        )
        if manager is not None:
            headers = list(map(str.lower, self.request.response.headers))
            for name, viewlet in getAdapters(
                (context, self.request, self.published, manager), IViewlet
            ):
                viewlet.update()
                for key, value in viewlet.getHeaders():
                    if key.lower() not in headers:
                        self.request.response.setHeader(key, value)
        return None


@implementer(ITransform)
class HTMLLanguage(TransformBase):
    """Set HTML tag language attributes"""

    order = 8800

    def transform(self, result, encoding):
        context = getContext(self.published)
        state = queryMultiAdapter((context, self.request), name="plone_portal_state")

        root = result.tree.getroot()
        if state and root is not None:
            root.attrib["lang"] = state.language()

        return result


@implementer(ITransform)
class BodyClass(TransformBase):
    """Set body tag class"""

    order = 8800

    def transform(self, result, encoding):
        context = getContext(self.published)
        layout = queryMultiAdapter((context, self.request), name="plone_layout")
        root = result.tree.getroot()
        body = root.body

        if layout is None or body is None:
            return result

        body_class = body.attrib.get("class", "")
        body_classes = body_class.split()

        # Get default body classes
        if "template-" not in body_class and "site-" not in body_class:
            body_classes.extend(
                [
                    n
                    for n in layout.bodyClass(None, self.published).split()
                    if n not in body_classes
                ]
            )

        # Get contentLayout body class
        if "template-layout" in body_classes or "template-layout_view" in body_classes:
            adapted = ILayoutAware(context, None)
            if adapted is not None:
                layout = None
                if getattr(adapted, "content_layout_path", False):
                    # plone.app.blocks > 4.0.0rc1
                    layout = adapted.content_layout_path()
                else:
                    layout = getattr(adapted, "contentLayout", None)
                if layout:
                    # Transform ++contentlayout++default/document.html
                    # into layout-default-document
                    names = LAYOUT_NAME.findall(layout)
                    if len(names) == 1:
                        body_classes.append("layout-" + names[0].replace("/", "-"))
                else:
                    body_classes.append("layout-custom")

        body_classes.append("mosaic-grid")

        # Set body class
        body.attrib["class"] = " ".join(body_classes)

        return result


@implementer(ITransform)
class PatternSettings(TransformBase):
    """Set body tag pattern settings data-pat-* attributes"""

    order = 8800

    def transform(self, result, encoding):
        context = getContext(self.published)
        layout = queryMultiAdapter((context, self.request), name="plone_layout")
        root = result.tree.getroot()
        body = root.body

        if layout is None or body is None:
            return result

        plone_patterns_settings = queryMultiAdapter(
            (context, self.request), name="plone_patterns_settings"
        )
        if plone_patterns_settings is None:
            logger.warn("Can not find plone_pattern_settings!")
            return result
        for key, value in plone_patterns_settings().items():
            body.attrib[key] = value
        return result
