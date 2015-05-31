# -*- coding: utf-8 -*-
from Acquisition import aq_base
from Acquisition import aq_parent
from plone.transformchain.interfaces import ITransform
from zope.component import getAdapters
from zope.component import queryMultiAdapter
from zope.interface import implementer
from zope.viewlet.interfaces import IViewletManager
from zope.viewlet.interfaces import IViewlet


@implementer(ITransform)
class HTTPHeaders(object):
    """Ensure that HTTP response headers normally set when main_template
    renders plone.httpheaders viewlet manager are also set when main_template
    is not called (e.g. with pure-HTML site layouts).
    """

    order = 8950

    def __init__(self, published, request):
        self.published = published
        self.request = request

    def _setHeaders(self):
        if not self.request.get('plone.app.blocks.enabled', False):
            return None

        context = aq_parent(aq_base(self.published))
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
