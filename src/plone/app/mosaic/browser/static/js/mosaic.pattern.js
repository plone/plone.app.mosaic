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
  'mosaic-url/mosaic.core',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.actions',
  'mosaic-url/mosaic.editor',
  'mosaic-url/mosaic.overlay',
], function($, Base) {
  'use strict';

  var Layout = Base.extend({
    name: 'layout',
    trigger: '.pat-layout',
    parser: 'mockup',
    defaults: {
      attribute: 'class'
    },
    init: function() {
      var self = this;
      self.options.data.$el = self.$el;
      $.mosaic.init({'data': self.options.data});
    }
  });

  return Layout;
});