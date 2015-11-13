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
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.actions'
], function($, logger, _, Tile, Panel, Modal) {
  "use strict";

  var log = logger.getLogger('pat-mosaic');

  // Create the mosaic namespace
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Set variables
  $.mosaic.loaded = false;

  $.mosaic.selectLayoutTemplate = _.template('<div>' +
    '<h1>Select Layout</h1>' +
    '<div class="mosaic-select-layout">' +
      '<ul>' +
        '<% _.each(available_layouts, function(layout){ ' +
          'var screenshot = layout.preview || layout.screenshot;' +
          'if(!screenshot){' +
            'screenshot = "++resource++plone.app.mosaic.images/default-layout-screenshot.png";' +
          '} %>' +
          '<li><a href="#" data-value="<%- layout.path %>">' +
            '<p><%- layout.title %></p><img src="<%- screenshot %>"></a></li>' +
        '<% }); %>' +
      '</ul>' +
    '</div>' +
    '<div class="buttons">' +
      '<!-- <button class="plone-btn plone-btn-default">Select</button> -->' +
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

    // Take first snapshot
    $.mosaic.undo.snapshot();
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

    $('body').addClass('mosaic-enabled');

    $.mosaic.initialized();
  };

  $.mosaic.applyLayout = function(layoutPath, callback){
    if(callback === undefined){
      callback = function(){};
    }
    $.ajax({
      url: $.mosaic.options.context_url + '/' + layoutPath
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
    });
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
      html: $.mosaic.selectLayoutTemplate($.mosaic.options),
      content: null,
      buttons: '.plone-btn'
    });
    modal.on('shown', function() {
      $('li a', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        var layout;
        var layout_id = $(this).attr('data-value');
        _.each($.mosaic.options.available_layouts, function(l){
          if(l.path === layout_id){
            layout = l;
          }
        });
        var layoutPath = '++contentlayout++' + layout.directory + '/' + layout.file;
        modal.hide();
        $.mosaic.applyLayout(layoutPath);
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
});
