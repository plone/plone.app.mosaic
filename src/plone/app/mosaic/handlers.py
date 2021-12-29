from plone import api


def toggleLayoutViewOnFTI(object, event):
    fti = getattr(object, "fti", None)
    if fti is None:
        return

    portal = api.portal.get()

    if (
        "plone.app.blocks.layoutbehavior.ILayoutAware" in fti.behaviors
        or "plone.layoutaware" in fti.behaviors
    ):
        # Add Mosaic view into available view methods
        view_methods = [i for i in fti.getAvailableViewMethods(portal)]
        if "layout_view" not in view_methods:
            view_methods.append("layout_view")
            fti.view_methods = view_methods
    else:
        # Remove Mosaic view from available view methods
        view_methods = [
            i for i in fti.getAvailableViewMethods(portal) if i != "layout_view"
        ]
        fti.view_methods = view_methods
        if fti.default_view == "layout_view":
            if view_methods:
                fti.default_view = view_methods[0]
            else:
                fti.default_view = "view"
