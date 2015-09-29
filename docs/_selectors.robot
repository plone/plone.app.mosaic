*** Variables ***

${SELECTOR_ADDONS_ENABLED}  jquery=#content-core > form:nth-child(3) > fieldset:nth-child(1)
${SELECTOR_ADDONS_MOSAIC}  ${SELECTOR_ADDONS_ENABLED} ul li label:contains('Plone Mosaic')

${SELECTOR_CONTENTMENU_DISPLAY_LINK}  css=#plone-contentmenu-display dt a
${SELECTOR_CONTENTMENU_DISPLAY_ITEMS}  css=#plone-contentmenu-display dd

${SELECTOR_TOOLBAR}  css=#edit-bar
