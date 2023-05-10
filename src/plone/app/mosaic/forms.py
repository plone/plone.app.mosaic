from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.dexterity.browser import add
from Products.CMFCore.utils import getToolByName


class MosaicDefaultAddForm(add.DefaultAddForm):
    autoGroups = False

    hidden_fields = [
        "IRichText.text",
        "IRichTextBehavior.text",
        "IVersionable.changeNote",
    ]

    @property
    def mosaic_enabled(self):
        schemata = [s for s in self.additionalSchemata]

        if ILayoutAware not in schemata:
            # if it is not a mosaic add form, carry on...
            return False

        # so we have it in the schemata, but is the view the default view
        # for the content type?
        portal_types = getToolByName(self.context, "portal_types")
        ptype = portal_types[self.portal_type]
        if ptype.default_view != "layout_view":
            return False
        return True

    def updateFieldsFromSchemata(self):
        super().updateFieldsFromSchemata()
        if not self.mosaic_enabled:
            return

        # we do not want the extra groups...
        self.groups = ()

        # adjust fields as well now...
        for field_name in self.hidden_fields:
            if field_name in self.fields:
                self.fields = self.fields.omit(field_name)

    def nextURL(self):
        if not self.mosaic_enabled:
            return super().nextURL()
        # very hacky way to get url of object created.
        # only other way would be override a bunch of code I do not
        # feel very comfortable overriding
        if self.immediate_view is not None:
            return "{:s}/@@edit".format("/".join(self.immediate_view.split("/")[:-1]))
        else:
            return self.context.absolute_url()


class MosaicDefaultAddView(add.DefaultAddView):
    form = MosaicDefaultAddForm
