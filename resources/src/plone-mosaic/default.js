require('plone');

require('./default.less');
require('./theme.less');

window.jQuery = require('jquery');  // Expose jQuery for BBB
window.require = undefined;  // Fix @@search
