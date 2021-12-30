from plone.app.layout.globals.interfaces import IBodyClassAdapter
from plone.portlets.interfaces import IPortletManager
from plone.portlets.interfaces import IPortletRetriever
from zope.component import getMultiAdapter
from zope.component import getUtility
from zope.interface import implementer
from zope.interface import Interface


@implementer(IBodyClassAdapter)
class MosaicBodyClasses:
    def __init__(self, context, request):
        self.context = context
        self.request = request

    def get_classes(self):
        """Default body classes adapter."""
        for manager_name in ["plone.leftcolumn", "plone.rightcolumn"]:
            manager = getUtility(
                IPortletManager, name=manager_name, context=self.context
            )
            retriever = getMultiAdapter((self.context, manager), IPortletRetriever)
            if retriever.getPortlets():
                return
        return ["no-portlet-columns"]
