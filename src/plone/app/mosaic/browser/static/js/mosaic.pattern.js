/* Layout Mosaic pattern.
 *
 * Options:
 *
 * Documentation:
 *
 * License:
 *    Copyright (C) 2014 Plone Foundation
 *
 *    This program is free software; you can redistribute it and/or modify it
 *    under the terms of the GNU General Public License as published by the
 *    Free Software Foundation; either version 2 of the License.
 *
 *    This program is distributed in the hope that it will be useful, but
 *    WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 *    Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License along
 *    with this program; if not, write to the Free Software Foundation, Inc.,
 *    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
window.DEBUG = true;
require([
    'jquery',
    'mockup-patterns-base',
    'mosaic.core',
    'mosaic.layout',
    'mosaic.toolbar',
    'mosaic.actions',
    'mosaic.upload',
    'mosaic.editor',
    'mosaic.undo',
    'mosaic.overlay',
], function($, Base) {
    'use strict';

    var Layout = Base.extend({
        name: 'layout',
        trigger: '.pat-layout',
        defaults: {
            attribute: 'class'
        },
        init: function() {
            var self = this;
            self.options.data.$el = self.$el;
            $.mosaic.init({'data': self.options.data});
        }
    });

    // XXX: This is defined in jquery.form.js, but for some reason is still
    // not always defined. Re-defining it here fixes issues where $.fieldValue
    // is not a function.
    $.fn.fieldValue = function(successful) {
        for (var val=[], i=0, max=this.length; i < max; i++) {
            var el = this[i];
            var v = $.fieldValue(el, successful);
            if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
                continue;
            }
            if (v.constructor == Array) {
                $.merge(val, v);
            } else {
                val.push(v);
            }
        }
        return val;
    };

    return Layout;
});