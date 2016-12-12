/**
 * This plugin is used to define the mosaic namespace
 *
 * @author Rob Gietema
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 * @version 0.1
 */

/* global window: false */
/*jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 120, maxerr: 9999, quotmark: false */

define([
  'jquery',
  'pat-logger',
  'underscore',
  'mosaic-url/mosaic.tile',
  'mosaic-url/mosaic.panel',
  'mockup-patterns-modal',
  'mockup-utils',
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.actions'
], function($, logger, _, Tile, Panel, Modal, utils) {
  "use strict";

  var log = logger.getLogger('pat-mosaic');

  // Create the mosaic namespace
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Set variables
  $.mosaic.loaded = false;

  // Define mosaic saving
  $.mosaic.saving = false;

  // Define UI templates
  $.mosaic.selectLayoutTemplate = _.template('<div>' +
    '<h1>Select Layout</h1>' +
    '<div class="mosaic-select-layout">' +
      '<div class="global-layouts">' +
        '<ul>' +
          '<% _.each(available_layouts, function(layout){ ' +
            'var screenshot = layout.preview || layout.screenshot;' +
            'if(!screenshot){' +
              'screenshot = "++plone++mosaic/img/default-layout-screenshot.png";' +
            '} %>' +
            '<li><a href="#" data-value="<%- layout.path %>">' +
              '<p><%- layout.title %></p>' +
              '<p class="mosaic-select-layout-description"><%- layout.description %></p>' +
              '<img src="<%- portal_url %>/<%- screenshot %>"></a></li>' +
          '<% }); %>' +
        '</ul>' +
      '</div>' +
      '<% if(user_layouts.length > 0){ %>' +
        '<div class="user-layouts">' +
          '<h4>My Layouts</h4>' +
          '<ul>' +
            '<% _.each(user_layouts, function(layout){ ' +
              'var screenshot = layout.preview || layout.screenshot;' +
              'if(!screenshot){' +
                'screenshot = "++plone++mosaic/img/default-layout-screenshot.png";' +
              '} %>' +
              '<li><a href="#" data-value="<%- layout.path %>">' +
                '<p><%- layout.title %></p><img src="<%- portal_url %>/<%- screenshot %>"></a></li>' +
            '<% }); %>' +
          '</ul>' +
        '</div>' +
      '<% } %>' +
      '<% if(hasCustomLayouts && canChangeLayout) { %>' +
        '<p class="manage-custom-layouts"><a href="#" class="plone-btn plone-btn-default">Manage custom layouts</a></p>' +
      '<% } %>' +
    '</div>' +
    '<div class="buttons">' +
      '<!-- <button class="plone-btn plone-btn-default">Select</button> -->' +
    '</div>' +
  '</div>');

  $.mosaic.saveLayoutTemplate = _.template('<div>' +
    '<h1>Save Layout</h1>' +
    '<div class="mosaic-save-layout">' +
      '<p>This process takes a copy of the existing layout and saves it to a new, ' +
          'resuable layout.</p>' +
      '<div class="form-group field">' +
        '<label for="layoutNameField">Name</label>' +
        '<input type="text" name="name" class="form-control" id="layoutNameField" />' +
      '</div>' +
      '<% if(canManageLayouts){ %>' +
        '<div class="field form-group">' +
          '<span class="option">' +
            '<input id="globalLayout" type="checkbox">' +
            '<label for="globalLayout">' +
              '<span class="label">Global</span>' +
            '</label>' +
          '</span>' +
          '<div class="formHelp">Should this layout be available for all users on the site?</div>' +
        '</div>' +
      '<% } %>' +
    '</div>' +
    '<div class="buttons">' +
      '<button class="plone-btn plone-btn-primary">Save</button>' +
    '</div>' +
  '</div>');

  $.mosaic.manageLayoutsTemplate = _.template('<div>' +
    '<h1>Manage custom layouts</h1>' +
    '<div class="mosaic-manage-custom-layouts">' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>Name</th>' +
            '<th>Path</th>' +
            '<th>Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<% _.each(available_layouts.concat(user_layouts), function(layout){ %>' +
            '<% if(layout.path.indexOf("custom/") !== -1){ %>' +
              '<% if(layout.path.split("/").length > 2 || canManageLayouts) { %>' +
                '<tr>' +
                  '<td><%- layout.title %></td>' +
                  '<td><%- layout.path %></td>' +
                  '<td>' +
                    '<a href="#" class="btn btn-danger delete-layout" ' +
                        'data-layout="<%- layout.path %>">Delete</a>' +
                  '</td>' +
                '</tr>' +
              '<% } %>' +
            '<% } %>' +
          '<% }); %>' +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>');

  $.mosaic.deleteLayoutTemplate = _.template('<div>' +
    '<h1>Delete layout</h1>' +
    '<div class="mosaic-delete-layout">' +
      '<% if(existing.length === 0 && !selected){  %>' +
        '<div class="portalMessage warning">' +
          '<strong>Warning</strong>' +
          'Are you certain you want to delete this layout? This can not be undone.' +
        '</div>' +
      '<% } else { %>' +
        '<div class="portalMessage error">' +
          '<strong>Warning</strong>' +
          'Are you certain you want to delete this layout? This can not be undone. ' +
          '<% if(existing.length > 0) { %>' +
            'There are currently <%- existing.length %> items assigned to this layout. ' +
          '<% } %>' +
          'You need to provide a replacement layout for the existing items in order to ' +
          'delete this for items currently assigned to this.' +
        '</div>' +
        '<div class="form-group field">' +
          '<label for="layoutField">Replacement Layout</label>' +
          '<select name="layout" class="form-control" id="layoutField">' +
            '<% _.each(available_layouts.concat(user_layouts), function(l){ %>' +
              '<% if(l.path !== layout.path){ %>' +
                '<option value="<%- l.path %>"><%- l.title %></option>' +
              '<% } %>' +
            '<% }); %>' +
          '</select>' +
        '</div>' +
      '<% } %>' +
    '</div>' +
    '<div class="buttons">' +
      '<button class="plone-btn plone-btn-danger delete">Yes, delete</button>' +
      '<button class="plone-btn plone-btn-default cancel">No</button>' +
    '</div>' +
  '</div>');

  /**
   * Called upon full initialization (that is: when all tiles have
   * been loaded).
   * @id jQuery.mosaic.initialized
   */
  $.mosaic.initialized = function () {
    if ($.mosaic.loaded) {
      return;
    }
    $.mosaic.loaded = true;
    utils.loading.hide();
  };

  /**
   * Initialize the Mosaic
   *
   * @id jQuery.mosaic.init
   * @param {Object} options Options used to initialize the UI
   */
  $.mosaic.init = function (options) {
    options = $.extend({
      url: window.document.location.href,
      type: '',
      ignore_context: false
    }, options);

    // Set document
    $.mosaic.document = window.document;

    // Local variables
    var match;

    // Initialize modules
    $.mosaic.initActions();

    // Get the url of the page
    match = options.url.match(/^([\w#!:.?+=&%@!\-\/]+)\/edit$/);
    if (match) {
      options.url = match[1];
    }

    // Chop add
    match = options.url
      .match(/^([\w#:.?=%@!\-\/]+)\/\+\+add\+\+([\w#!:.?+=&%@!\-\/]+)$/);
    if (match) {
      options.url = match[1];
      options.type = match[2];
      options.ignore_context = true;
    }

    // Add global options
    $.mosaic.options = options.data;
    $.mosaic.options.url = options.url;
    $.mosaic.options.ignore_context = options.ignore_context;
    $.mosaic.options.tileheadelements = [];
    $.mosaic.hasContentLayout = true;

    var contentLayout = $.mosaic.getSelectedContentLayout();
    if(contentLayout){
      $.mosaic.applyLayout(contentLayout);
    }else{
      var contentRaw = $($.mosaic.options.customContentLayout_field_selector).val();
      if(!contentRaw){
        $.mosaic.selectLayout(true);
      }else{
        var $content = $.mosaic.getDomTreeFromHtml(contentRaw);
        if($content.attr('id') === "no-layout"){
          $.mosaic.selectLayout(true);
        }else{
          $('body').addClass('mosaic-layout-customized');
          $.mosaic.hasContentLayout = false;
          $.mosaic._init($content);
        }

        // XXX There is a case where you can have an extraneous mid-edit tile
        var $helper = $('.mosaic-helper-tile-new');
        if($helper.length > 0){
          $helper.parents('.mosaic-grid-row').remove();
        }
      }
    }
  };

  $.mosaic.getSelectedContentLayout = function(){
    return $($.mosaic.options.contentLayout_field_selector).val();
  };

  $.mosaic.setSelectedContentLayout = function(value){
    if(value){
      $.mosaic.hasContentLayout = true;
      // Need to hide these buttons when not in custom content layout mode
      $('.mosaic-toolbar-secondary-functions', $.mosaic.document).hide();
      $('body').removeClass('mosaic-layout-customized');
    }else{
      $('body').addClass('mosaic-layout-customized');
      $.mosaic.hasContentLayout = false;
    }
    return $($.mosaic.options.contentLayout_field_selector).attr('value', value);
  };


  $.mosaic._initPanels = function ($content){
    $.mosaic.options.layout = $content.attr('data-layout');

    // Drop panels within panels (only the top level panels are editable)
    $('[data-panel] [data-panel]', $.mosaic.document)
      .removeAttr('data-panel');

    $content.find("[data-panel]").each(function () {
      var panel = new Panel(this);
      panel.initialize($content);
    });
    // Pre-fill new panels from the layout
    $("[data-panel]", $.mosaic.document).each(function () {
      var panel = new Panel(this);
      panel.prefill();
    });

    // Init app tiles
    $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);

    $.mosaic.options.panels.find("[data-tile]").each(function () {
      if(Tile.validTile(this)){
        var tile = new Tile($(this).parent());
        tile.initializeContent();
      }
    });
  };

  $.mosaic._init = function (content) {

    $.mosaic._initPanels(content);

    // Init overlay
    $('.mosaic-original-content', $.mosaic.document).mosaicOverlay();

    // Add toolbar div below menu
    $("body").prepend($(document.createElement("div"))
      .addClass("mosaic-toolbar")
    );

    // Add the toolbar to the options
    $.mosaic.options.toolbar = $(".mosaic-toolbar");

    // Init toolbar
    $.mosaic.options.toolbar.mosaicToolbar();

    // Init layout
    $.mosaic.options.panels.mosaicLayout();

    // Add blur to the rest of the content
    $("*", $.mosaic.document).each(function () {

      // Local variables
      var obj;

      obj = $(this);

      // Check if block element
      if (obj.css('display') === 'block') {

        // Check if panel or toolbar
        if (!obj.hasClass('mosaic-panel') &&
          !obj.hasClass('mosaic-toolbar') &&
          !obj.hasClass('mosaic-notifications') &&
          !obj.hasClass('mosaic-modal-wrapper') &&
          obj.attr('id') !== 'edit-zone') {

          // Check if inside panel or toolbar
          if (obj.parents('.mosaic-panel, .mosaic-toolbar')
            .length === 0) {

            // Check if parent of a panel or toolbar
            if (obj.find('.mosaic-panel, .mosaic-toolbar')
              .length === 0) {

              // Check if parent has a child who is a
              // panel or a toolbar
              if (obj.parent()
                .find('.mosaic-panel, .mosaic-toolbar')
                .length !== 0) {

                // Add blur class
                obj.addClass('mosaic-blur');
              }
            }
          }
        }
      }
    });

    // Init upload
    // $.mosaic.initUpload();
    $.mosaic.undo.init();

    // on enabling, add class, disable toolbar classes, hide toolbar
    $('.pat-toolbar').hide();
    var $body = $('body');
    $body.addClass('mosaic-enabled');
    $body[0].className.split(' ').forEach(function(className){
      if(className.indexOf('plone-toolbar') !== -1){
        $body.removeClass(className);
      }
    });

    $.mosaic.initialized();
  };

  $.mosaic.applyLayout = function(layoutPath, callback){
    if(callback === undefined){
      callback = function(){};
    }
    utils.loading.show();
    $.ajax({
      url: $('body').attr('data-portal-url') + '/' + layoutPath,
      cache: false
    }).done(function(layoutHtml){
      var $content = $.mosaic.getDomTreeFromHtml(layoutHtml);
      $.mosaic.setSelectedContentLayout(layoutPath);
      if($.mosaic.loaded){
        // initialize panels
        $.mosaic._initPanels($content);
        // and setup layout for the new panels
        $.mosaic.options.panels.mosaicLayout();
      }else{
        $.mosaic._init($content);
      }
    }).fail(function(xhr, type, status){
      // use backup layout
      if(status === 'Not Found'){
        window.alert('Specified layout can not be found. Loading default layout.');
      }else{
        window.alert('Error loading layout specified for this content. Falling back to basic layout.');
      }
      $.mosaic.applyLayout('++contentlayout++default/basic.html');
    }).always(function(){
      utils.loading.hide();
    });
  };

  var _hasCustomLayouts = function(){
    if($.mosaic.options.user_layouts.length > 0){
      return true;
    }
    return _.filter($.mosaic.options.available_layouts, function(layout){
      return layout.path.indexOf('custom/') !== -1;
    }).length > 0;
  };

  $.mosaic._deleteLayout = function(layout, existing, callback){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.deleteLayoutTemplate($.extend({}, true, {
        existing: existing,
        layout: layout,
        selected: $.mosaic.getSelectedContentLayout() === '++contentlayout++' + layout.path
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });

    modal.on('shown', function() {
      $('button.delete:visible', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        utils.loading.show();
        var replacement = $('#layoutField', modal.$modal).val();
        $.ajax({
          url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
          data: {
            action: 'deletelayout',
            layout: layout.path,
            replacement: replacement,
            _authenticator: utils.getAuthenticator()
          }
        }).done(function(data){
          modal.hide();
          callback(data);
          if(replacement && $.mosaic.getSelectedContentLayout() === '++contentlayout++' + layout.path){
            $.mosaic.applyLayout('++contentlayout++' + replacement);
          }
        }).fail(function(){
          window.alert('Error deleting layout');
        }).always(function(){
          utils.loading.hide();
        });
      });
      $('button.cancel:visible', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        modal.hide();
      });
    });
    modal.show();
  };

  $.mosaic.deleteLayout = function(layout, callback){
    utils.loading.show();
    $.ajax({
      url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
      data: {
        action: 'existing',
        layout: layout.path
      }
    }).done(function(data){
      $.mosaic._deleteLayout(layout, data.data, callback);
    }).fail(function(){
      window.alert('Error loading data for existing assignments');
    }).always(function(){
      utils.loading.hide();
    });
  };

  $.mosaic.manageCustomLayouts = function(){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.manageLayoutsTemplate($.extend({}, true, {

      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });

    modal.on('shown', function() {
      $('.delete-layout', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        var layout_id = $(this).attr('data-layout');
        _.each($.mosaic.options.available_layouts.concat($.mosaic.options.user_layouts), function(l){
          if(l.path === layout_id){
            return $.mosaic.deleteLayout(l, function(data){
              // callback for when the delete is complete and we need to reload data...
              // reload it...
              $.mosaic.options.available_layouts = data.available_layouts;
              $.mosaic.options.user_layouts = data.user_layouts;
              modal.hide();
              $.mosaic.manageCustomLayouts();
            });
          }
        });
      });
    });
    modal.show();
  };


  $.mosaic.selectLayout = function(initial){
    if(initial !== undefined && initial){
      // check if there is only 1 available layout and auto select
      // if that is the case.
      if($.mosaic.options.available_layouts.length === 1){
        var layout = $.mosaic.options.available_layouts[0];
        var layoutPath = '++contentlayout++' + layout.directory + '/' + layout.file;
        $.mosaic.applyLayout(layoutPath);
        return;
      }
    }
    if($.mosaic.options.available_layouts.length === 0){
      // use backup layout
      $.mosaic.applyLayout('++contentlayout++default/basic.html');
      return;
    }
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.selectLayoutTemplate($.extend({}, true, {
        hasCustomLayouts: _hasCustomLayouts(),
        portal_url: $('body').attr('data-portal-url')
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });
    modal.on('shown', function() {
      $('.manage-custom-layouts a', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        modal.hide();
        $.mosaic.manageCustomLayouts();
      });
      $('li a', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        var layout;
        var layout_id = $(this).attr('data-value');
        _.each($.mosaic.options.available_layouts.concat($.mosaic.options.user_layouts), function(l){
          if(l.path === layout_id){
            layout = l;
          }
        });
        var layoutPath = '++contentlayout++' + layout.path;
        modal.hide();
        $.mosaic.applyLayout(layoutPath);
      });
    });
    modal.show();
  };

  $.mosaic.saveLayout = function(initial){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.saveLayoutTemplate($.extend({}, true, {
        hasCustomLayouts: _hasCustomLayouts()
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });
    modal.on('shown', function() {
      $('.plone-btn:visible', modal.$modal).off('click').on('click', function(e){
        var layoutName = $('#layoutNameField', modal.$modal).val();
        if(!layoutName){
          return;
        }
        utils.loading.show();
        e.preventDefault();
        var globalLayout = 'false';
        var $el = $('#globalLayout', modal.$modal);
        if($el.size() > 0 && $el[0].checked){
          globalLayout = 'true';
        }
        $.ajax({
          url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
          method: 'POST',
          data: {
            action: 'save',
            _authenticator: utils.getAuthenticator(),
            global: globalLayout,
            name: layoutName,
            layout: $.mosaic.getPageContent(true)
          }
        }).done(function(result){
          if(result.success){
            $.mosaic.options.available_layouts = result.available_layouts;
            $.mosaic.options.user_layouts = result.user_layouts;
            $.mosaic.applyLayout(result.layout);
          }
        }).fail(function(){
          window.alert('Error saving layout');
        }).always(function(){
          utils.loading.hide();
          modal.hide();
        });
      });
    });
    modal.show();
  };

  /**
   * Get the dom tree of the specified content
   *
   * @id jQuery.mosaic.getDomTreeFromHtml
   * @param {String} content Html content
   * @return {Object} Dom tree of the html
   */
  $.mosaic.getDomTreeFromHtml = function (content) {

    // Remove doctype and replace html, head and body tag since the are
    // stripped when converting to jQuery object
    content = content.replace(/<!DOCTYPE[\w\s\- .\/\":]+>/, '');
    content = content.replace(/<html>/, "<div class=\"temp_html_tag\">");
    content = content.replace(/<\/html>/, "</div>");
    content = content.replace(/<html\s/, "<div class=\"temp_html_tag\" ");
    content = content.replace(/<\/html\s/, "</div ");
    content = content.replace(/<head>/, "<div class=\"temp_head_tag\">");
    content = content.replace(/<\/head>/, "</div>");
    content = content.replace(/<head\s/, "<div class=\"temp_head_tag\" ");
    content = content.replace(/<\/head\s/, "</div ");
    content = content.replace(/<body>/, "<div class=\"temp_body_tag\">");
    content = content.replace(/<\/body>/, "</div>");
    content = content.replace(/<body\s/, "<div class=\"temp_body_tag\" ");
    content = content.replace(/<\/body\s/, "</div ");
    return $($(content)[0]);
  };

  /**
   * Remove head tags based on tile url
   *
   * @id jQuery.mosaic.removeHeadTags
   * @param {String} url Url of the tile
   */
  $.mosaic.removeHeadTags = function (url) {
    if(!url || url === 'undefined'){
      return;
    }

    // Local variables
    var tile_type_id, html_id, headelements, i;

    // Calc delete url
    url = url.split('?')[0];
    url = url.split('@@');
    tile_type_id = url[1].split('/');
    url = url[0] + '@@delete-tile?type=' + tile_type_id[0] + '&id=' +
      tile_type_id[1] + '&confirm=true';
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];

    // Remove head elements
    headelements = $.mosaic.options.tileheadelements[html_id];
    if(headelements){
      for (i = 0; i < headelements.length; i += 1) {
        $(headelements[i], $.mosaic.document).remove();
      }
    }
    $.mosaic.options.tileheadelements[html_id] = [];
  };

  /**
   * Add head tags based on tile url and dom
   *
   * @id jQuery.mosaic.addHeadTags
   * @param {String} url Url of the tile
   * @param {Object} dom Dom object of the tile
   */
  $.mosaic.addHeadTags = function (url, dom) {

    // Local variables
    var tile_type_id, html_id;

    // Calc url
    url = url.split('?')[0];
    url = url.split('@@');
    tile_type_id = url[1].split('/');
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];
    $.mosaic.options.tileheadelements[html_id] = [];

    // Get head items
    dom.find(".temp_head_tag").children().each(function () {

      // Add element
      $.mosaic.options.tileheadelements[html_id].push(this);

      // Add head elements
      $('head', $.mosaic.document).append(this);
    });
  };

  /**
   * Queue callback to be executed in serial to other queued
   * functions
   *
   * Each callback should end its execution by calling the
   * callback it gets as in
   *
   *   $.mosaic.queue(function(next) {
   *     next();
   *   })
   *
   * to allow execution of the next item in queue.
   *
   * @param {queueName} optional queue name
   * @param {callback} callback fn to be called
   */
  $.mosaic.queue = function (queueName, callback) {
    if (typeof callback === 'undefined') {
        callback = queueName;
        queueName = 'fx';  // 'fx' autoexecutes by default
    }
    $(window).queue(queueName, callback);
  };

});
