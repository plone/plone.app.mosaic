// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

if (window.jQuery) {
  define( 'jquery', [], function () {
    'use strict';
    return window.jQuery;
  } );
}

require([
  'jquery',
  'mockup-utils',
  'underscore',
  'mockup-patterns-filemanager'
], function($, utils, _) {
  'use strict';
  $(document).ready(function(){

    var EditorTemplate = _.template(
'<table class="table listing">' +
  '<thead>' +
    '<th>Title</th>' +
    '<th>Path</th>' +
    '<th>Types</th>' +
    '<th>Actions</th>' +
  '</thead>' +
  '<tbody>' +
    '<% _.each(items, function(item){ %>' +
      '<tr data-layout-key="<%- item.key %>">' +
        '<td><%- item.title %></td>' +
        '<td><%- item.key %></td>' +
        '<td><%- item._for || "all" %></td>' +
        '<td>' +
          '<% if(item.hidden){ %>' +
            '<a href="#" class="showit">Show</a>' +
          '<% }else{ %>' +
            '<a href="#" class="hideit">Hide</a>' +
          '<% } %>' +
        '</td>' +
      '</tr>' +
    '<% }); %>' +
  '</tbody' +
'</table>');

    var loadEditor = function(){
      var baseUrl = window.location.origin + window.location.pathname;
      var url = baseUrl + '?list-contentlayouts=true';
      utils.loading.show();
      $.ajax({
        url: url,
        dataType: 'JSON'
      }).done(function(data){
        var $el = $('#show-hide-editor');
        if($el.size() === 0){
          $el = $('<div id="show-hide-editor" />');
          $('.show-hide-layouts').append($el);
        }
        $el.empty();
        $el.html(EditorTemplate({
          items: data
        }));
        $('.showit,.hideit', $el).click(function(e){
          utils.loading.show();
          e.preventDefault();
          $.ajax({
            url: baseUrl,
            data: {
              'action': $(this).hasClass('showit') && 'show' || 'hide',
              'layout': $(this).parents('tr').attr('data-layout-key'),
              '_authenticator': utils.getAuthenticator()
            }
          }).done(function(){
            loadEditor();
          });
        });
      }).always(function(){
        utils.loading.hide();
      });
    }

    $('#content-core').on('clicked', '#autotoc-item-autotoc-2', function(e){
      e.preventDefault();
      loadEditor();      
    });

  });
});
