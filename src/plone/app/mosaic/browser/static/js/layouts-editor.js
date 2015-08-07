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

  var assignTemplate = _.template('<form method="POST">' +
    '<input type="hidden" name="_authenticator" value="<%- _authenticator %>" />' +
    '<input type="hidden" name="assign-save" value="yes" />' +
    '<% _.each(types, function(type){ %>' +
      '<div class="field">' +
        '<label class="horizontal"><%- type.title %></label>' +
        '<select multiple="true" name="<%- type.id %>">' +
          '<% _.each(available, function(view){ %>' +
            '<option value="<%- view.value %>"' +
              '<% if(_.contains(type.layouts, view.value)){ %> selected="selected" <% } %> ><%- view.title %> (<%- view.value %>)' +
            '</option>' +
          '<% }) %>' +
        '</select>' +
      '</div>' +
    '<% }) %>' +
    '<input type="submit" class="plone-btn plone-btn-primary" value="Save" />' +
  '</form>');

  var loadAssignForm = function(data){
    $('#assign-container').html(assignTemplate($.extend(data, {
      _authenticator: utils.getAuthenticator()
    })));
  };

  var patternsLoaded = function(){
    $('#assign').click(function(){
      utils.loading.show();
      $.ajax({
        url: window.location.href + '?assign-data=yes',
        dataType: 'json'
      }).done(function(data){
        loadAssignForm(data);
      });
    });
  };

  var _checkLoaded = function(){
    if($('body').hasClass('patterns-loaded')){
      patternsLoaded();
    }else{
      setTimeout(_checkLoaded, 100);
    }
  };
  _checkLoaded();
});
