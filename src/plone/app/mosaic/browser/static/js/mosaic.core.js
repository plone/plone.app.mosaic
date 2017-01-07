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
  'mockup-utils',
  'mockup-patterns-modal',
  'mosaic-url/mosaic.tile',
  'mosaic-url/mosaic.panel',
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.actions'
], function ($, logger, _, utils, Modal, Tile, Panel) {
  "use strict";
  
  var log = logger.getLogger('pat-mosaic');

  // Define mosaic namespace
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Define mosaic loading
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
   * Called upon when all tiles have been loaded.
   *
   * @id jQuery.mosaic.initialized
   */
  $.mosaic.initialized = function () {
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
    var content, $content;

    // Merge options
    options = $.extend({
      url: window.document.location.href,
      type: '',
      ignore_context: false
    }, options);

    // Show loading indicator
    utils.loading.show();

    // Set edited document
    $.mosaic.document = window.document;

    // Set body class to toggle UI depending on this
    $('body', $.mosaic.document).addClass('mosaic-enabled');

    // Initialize actions
    $.mosaic.initActions();

    // Initialize options
    $.mosaic.options = options.data;  // XXX: Required options not documented 
    $.mosaic.tileHeadElements = [];
    $.mosaic.hasContentLayout = true;

    // Finalize init by loading static or customized layout content

    // a) Get pre-defined content layout
    content = $.mosaic.getSelectedContentLayout();
    if (content) {
      $.mosaic.applyLayout(content);
      return;
    }

    // b) Get customized content layout
    content = $.mosaic.getCustomContentLayout();
    if (content) {
      $content = $.mosaic.getDomTreeFromHtml(content);
      if ($content.attr('id') !== "no-layout") {
        
        // Remove unplaced saved helper tiles saved because of a fixed bug
        $content.find('.mosaic-helper-tile-new')
                .parents('.mosaic-grid-row').remove();
        
        $('body').addClass('mosaic-layout-customized');
        $.mosaic.hasContentLayout = false;
        $.mosaic._init($content);
        return;
      }
    }

    // c) Let user select a pre-defined layout
    $.mosaic.selectLayout(true);
  };

  $.mosaic.getCustomContentLayout = function () {
    return $($.mosaic.options.customContentLayout_field_selector,
      $.mosaic.document).val();
  };

  $.mosaic.getSelectedContentLayout = function () {
    return $($.mosaic.options.contentLayout_field_selector,
      $.mosaic.document).val();
  };

  $.mosaic.setSelectedContentLayout = function (value) {
    if (value) {
      $.mosaic.hasContentLayout = true;
      // Need to hide these buttons when not in custom content layout mode
      $('.mosaic-toolbar-secondary-functions', $.mosaic.document).hide();
      $('body').removeClass('mosaic-layout-customized');
    } else {
      $('body').addClass('mosaic-layout-customized');
      // Need to show these buttons when in custom content layout mode
      $('.mosaic-toolbar-secondary-functions', $.mosaic.document).show();
      $.mosaic.hasContentLayout = false;
    }
    return $($.mosaic.options.contentLayout_field_selector,
      $.mosaic.document).attr('value', value);
  };

  $.mosaic._initPanels = function ($content, callback) {
    $.mosaic.options.layout = $content.attr('data-layout');
    if ($.mosaic.loaded) { utils.loading.show(); }

    // Load site layout to be able to initialize all panels
    $.ajax({
      url: $.mosaic.options.layout,
      cache: false
    }).done(function (layoutHtml) {
      $.mosaic.__initPanels($content, $('<div>' + layoutHtml + '</div>'), callback);
    }).fail(function (xhr, type, status) {
      $.mosaic.__initPanels($content, $(), callback);
    }).always(function () {
      if ($.mosaic.loaded) { utils.loading.hide(); }
    });
  };

  $.mosaic.__initPanels = function ($content, $layout, callback) {
    var panels = {};

    // Drop panels within panels (only the top level panels are editable)
    $('[data-panel] [data-panel]', $content).removeAttr('data-panel');
    $('[data-panel] [data-panel]', $.mosaic.document).removeAttr('data-panel');

    // Initialize found panels from content
    $content.find("[data-panel]").each(function () {
      var panel = new Panel(this);
      panel.initialize($content);
      panels[$(this).attr('data-panel')] = panel;
    });

    // Initialize rest of the panels from layout
    $layout.find("[data-panel]").each(function () {
      if (panels[$(this).attr('data-panel')] === undefined) {
        var panel = new Panel(this);
        panel.initialize($layout);
        panels[$(this).attr('data-panel')] = panel;
      }
    });

    // Store all initialized panels
    $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);

    // Init app tiles in panels
    $.mosaic.options.panels.find("[data-tile]").each(function () {
      var tile;
      if (Tile.validTile(this)) {
        tile = new Tile(this);
        tile.initializeContent();
      }
    });

    // Init grid editor for panels with mosaic-grid
    $.mosaic.options.panels.mosaicLayout();

    // Blur inactive content
    $.mosaic.blur();

    // Optional callback
    if (typeof callback === 'function') { callback(); }
  };

  $.mosaic._init = function (content) {
    // Init layout
    $.mosaic._initPanels(content, function() {

      // Init toolbar (expects panels been initialized)
      $.mosaic.options.toolbar = $(document.createElement('div'))
        .addClass('mosaic-toolbar').prependTo($('body')).mosaicToolbar();

      // Signal initial load completed
      $.mosaic.initialized();

    });
  };

  $.mosaic.blur = function () {
    // Local variables
    var obj;

    // Clear previous blur
    $('.mosaic-blur', $.mosaic.document).removeClass('mosaic-blur');

    // Add blur to the rest of the content
    $("*", $.mosaic.document).each(function () {
      obj = $(this);

      // Check if block element
      if (obj.css('display') === 'block' ||
          obj.css('display') === 'flex') {

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
  };

  $.mosaic.applyLayout = function (layoutPath) {
    if ($.mosaic.loaded) { utils.loading.show(); }

    $.ajax({
      url: $('body').attr('data-portal-url') + '/' + layoutPath,
      cache: false
    }).done(function(layoutHtml){
      var $content = $.mosaic.getDomTreeFromHtml(layoutHtml);
      $.mosaic.setSelectedContentLayout(layoutPath);
      if(!$.mosaic.loaded){
        $.mosaic._init($content);
      }else{
        $.mosaic._initPanels($content);
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
      if ($.mosaic.loaded) { utils.loading.hide(); }
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
        if ($.mosaic.loaded) { utils.loading.show(); }
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
          if ($.mosaic.loaded) { utils.loading.hide(); }
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
    if ($.mosaic.loaded) { utils.loading.show(); }
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
      if ($.mosaic.loaded) { utils.loading.hide(); }
    });
  };

  $.mosaic.manageCustomLayouts = function(){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.manageLayoutsTemplate($.extend({}, true, {}, $.mosaic.options)),
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

  $.mosaic.selectLayout = function (initial) {
    // a) When on new page and there's only 1 available layout, auto select it
    if (initial !== undefined && initial) {
      if ($.mosaic.options.available_layouts.length === 1) {
        var layout = $.mosaic.options.available_layouts[0];
        var layoutPath = '++contentlayout++' + layout.directory + '/' + layout.file;
        $.mosaic.applyLayout(layoutPath);
        return;
      }
    }

    // b) When there's no layout available, select a known default layout
    if ($.mosaic.options.available_layouts.length === 0) {
      $.mosaic.applyLayout('++contentlayout++default/basic.html');
      return;
    }

    // c) Show layout selector and apply selected layout
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
        if (layout) {
          layoutPath = '++contentlayout++' + layout.path;
          $.mosaic.applyLayout(layoutPath);
        }
        modal.hide();
      });
    });
    modal.show();
  };

  $.mosaic.saveLayout = function () {
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
        if ($.mosaic.loaded) { utils.loading.show(); }
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
          if ($.mosaic.loaded) { utils.loading.hide(); }
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
    var tile_type_id, html_id, head_elements, i;

    // Calc delete url
    tile_type_id = url.split('?')[0].split('@@')[1].split('/');
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];

    // Remove head elements
    head_elements = $.mosaic.tileHeadElements[html_id];
    if (head_elements) {
      for (i = 0; i < head_elements.length; i += 1) {
        $(head_elements[i], $.mosaic.document).remove();
      }
    }
    $.mosaic.tileHeadElements[html_id] = [];
  };

  /**
   * Add head tags based on tile url and dom
   *
   * @id jQuery.mosaic.addHeadTags
   * @param {String} url Url of the tile
   * @param {Object} dom Dom object of the tile
   */
  $.mosaic.addHeadTags = function (url, dom) {
    if (!url || url === 'undefined') {
      return;
    }

    // Local variables
    var tile_type_id, html_id;

    // Calc url
    tile_type_id = url.split('?')[0].split('@@')[1].split('/');
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];
    $.mosaic.tileHeadElements[html_id] = [];

    // Get head items
    dom.find(".temp_head_tag").children().each(function () {

      // Add element
      $.mosaic.tileHeadElements[html_id].push(this);

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
