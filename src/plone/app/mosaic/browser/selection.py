# -*- coding: utf-8 -*-
from plone.app.content.browser.selection import DefaultViewSelectionView
from zope.component import getUtility
from zope.schema.interfaces import IVocabularyFactory


class LayoutAwareDefaultViewSelectionView(DefaultViewSelectionView):

    @property
    def vocab(self):
        vocab_factory = getUtility(IVocabularyFactory,
                                   name='plone.availableDisplayLayouts')
        vocab = vocab_factory(self.context)
        return (list(super(LayoutAwareDefaultViewSelectionView, self).vocab)
                + [(term.value, term.title) for term in vocab])
