from plone.app.blocks.layoutbehavior import ILayoutAware
from plone.dexterity.browser import add


class MosaicDefaultAddForm(add.DefaultAddForm):

    autoGroups = False

    hidden_fields = [
        'IRichText.text',
        'IVersionable.changeNote'
    ]

    def updateFieldsFromSchemata(self):
        super(MosaicDefaultAddForm, self).updateFieldsFromSchemata()
        schemata = [s for s in self.additionalSchemata]

        if ILayoutAware not in schemata:
            # if it is not a mosaic add form, carry on...
            return

        # we do not want the extra groups...
        self.groups = ()

        # adjust fields as well now...
        for field_name in self.hidden_fields:
            if field_name in self.fields:
                self.fields = self.fields.omit(field_name)

    def nextURL(self):
        # very hacky way to get url of object created.
        # only other way would be override a bunch of code I do not
        # feel very comfortable overridding
        if self.immediate_view is not None:
            return '{}/@@edit'.format(
                '/'.join(self.immediate_view.split('/')[:-1]))
        else:
            return self.context.absolute_url()


class MosaicDefaultAddView(add.DefaultAddView):
    form = MosaicDefaultAddForm
