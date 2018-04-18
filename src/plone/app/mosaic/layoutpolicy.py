from plone.app.layout.globals.interfaces import IBodyClassAdapter
from zope.interface import implementer
from plone.portlets.interfaces import IPortletManager
from plone.portlets.interfaces import IPortletAssignmentMapping
from zope.component import getUtility
from zope.component import getMultiAdapter


@implementer(IBodyClassAdapter)
class MosaicBodyClasses(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def get_classes(self):
        """Default body classes adapter.
        """
        for manager_name in ["plone.leftcolumn", "plone.rightcolumn"]:
            manager = getUtility(IPortletManager,
                                 name=manager_name,
                                 context=self.context
                                 )
            mapping = getMultiAdapter((self.context, manager),
                                      IPortletAssignmentMapping)
            if mapping.items():
                return
        return ['no-portlet-columns']
