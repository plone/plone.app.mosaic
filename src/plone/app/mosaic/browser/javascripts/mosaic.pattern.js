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

require([
  'requirejs',
  'jquery',
  'mockup-registry',
  'mockup-patterns-base',
  'mosaic.core',
  'mosaic.overlay',
  'mosaic.tinymce',
  'mosaic.layout',
  'mosaic.toolbar',
  'mosaic.actions',
  'mosaic.upload',
  'mosaic.editor',
  'mosaic.undo',
  'mosaic.overlaytriggers'
], function(undefined, $, Registry, Base) {
  'use strict';

  var Layout = Base.extend({
    name: 'layout',
    defaults: {
      attribute: 'class',
    },
    init: function() {
      var self = this;
      self.options.data.$el = self.$el;
      $.mosaic.init({'data': self.options.data});

    }

  });

  // initialize only if we are in top frame
  // if (window.parent === window) {
  //   $(document).ready(function() {
  //     $('body').addClass('pat-test');
  //     Registry.scan($('body'));
  //   });
  // }

  return Layout;

});
