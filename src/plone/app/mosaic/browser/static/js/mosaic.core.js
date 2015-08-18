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
    'mockup-patterns-modal',
    'underscore',
    'mosaic.toolbar',
    'mosaic.layout',
    'mosaic.actions'
], function($, logger, Modal, _) {
    "use strict";



    var log = logger.getLogger('pat-structure');

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
                '<% _.each(_.keys(available_layouts), function(key){ ' +
                    'var layout = available_layouts[key]; %>' +
                    '<li><a href="#" data-value="<%- key %>"><%- layout.title %></a></li>' +
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
        $.mosaic.staticLayout = true;

        var staticLayout = $.mosaic.getSelectedStaticLayout();
        if(staticLayout){
            $.mosaic.applyLayout(staticLayout);
        }else{
            var contentRaw = $($.mosaic.options.content_field_selector).val();
            if(!contentRaw){
                $.mosaic.selectLayout();
            }else{
                var $content = $.mosaic.getDomTreeFromHtml(contentRaw);
                if($content.attr('id') === "no-layout"){
                    $.mosaic.selectLayout();
                }else{
                    $.mosaic.staticLayout = false;
                    $.mosaic._init($content);
                }
            }
        }
    };

    $.mosaic.getSelectedStaticLayout = function(){
        return $($.mosaic.options.staticLayout_field_selector).val();
    };

    $.mosaic.setSelectedStaticLayout = function(value){
        if(value){
            $.mosaic.staticLayout = true;
        }else{
            $.mosaic.staticLayout = false;
        }
        return $($.mosaic.options.staticLayout_field_selector).attr('value', value);
    };


    $.mosaic._initPanels = function (content){
        $.mosaic.options.layout = content.attr('data-layout');

        // Drop panels within panels (only the top level panels are editable)
        $('[data-panel] [data-panel]', $.mosaic.document)
            .removeAttr('data-panel');

        content.find("[data-panel]").each(function () {

            // Local variables
            var panel_id = $(this).attr("data-panel"), panel_attr_id,
                target = $("[data-panel=" + panel_id + "]",
                $.mosaic.document);

            // Implicitly initialize required panels with id matching element
            if (panel_id === 'content' && target.length === 0) {
                $('#' + panel_id, $.mosaic.document).each(function() {
                    target = $(this);
                    target.attr('data-panel', panel_id);
                });
            }

            // If content, create a new div since the form data is in
            // this panel
            if (panel_id === 'content') {
                panel_attr_id = target.attr('id');
                if($('.mosaic-original-content', $.mosaic.document).size() === 0){
                    target.before($(document.createElement("div"))
                        .attr("id", panel_attr_id)
                        .attr("class", target.attr("class"))
                        .addClass('mosaic-panel')
                        .attr('data-panel', 'content')
                        .html(content.find("[data-panel=" + panel_id + "]").html()));
                    target
                        .removeAttr('data-panel')
                        .removeAttr('id')
                        .addClass('mosaic-original-content')
                        .hide();
                }else{
                    // re-initializing, so we just have to replace existing
                    target.replaceWith($(document.createElement("div"))
                        .attr("id", panel_attr_id)
                        .attr("class", target.attr("class"))
                        .addClass('mosaic-panel')
                        .attr('data-panel', 'content')
                        .html(content.find("[data-panel=" + panel_id + "]").html()));
                }
            } else {
                target.attr("class",
                    content.find("[data-panel=" + panel_id + "]").attr("class"));
                target.addClass('mosaic-panel');
                target.html(content.find("[data-panel=" +
                    panel_id + "]").html());
            }
        });

        // Pre-fill new panels from the layout
        $("[data-panel]", $.mosaic.document).each(function () {
            if (!$(this).hasClass('mosaic-panel')) {
                log.info($(this));
                $(this).addClass('mosaic-panel');
                $(this).children().wrap($(
                    '<div class="mosaic-grid-row">' +
                        '<div class="mosaic-grid-cell mosaic-width-full mosaic-position-leftmost">' +
                            '<div class="movable removable mosaic-tile mosaic-text-tile">' +
                                '<div class="mosaic-tile-content">' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                ));
            }
        });

        // Init app tiles
        $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);

        $.mosaic.options.panels.find("[data-tile]").each(function () {

            // Local variables
            var base, href, tile_content, url, start, end,
                tile_config, fieldhtml, lines;

            base = $($.mosaic.document).find('head > base').attr('href');
            href = $(this).attr("data-tile");

            // Get tile type
            tile_content = $(this).parent();
            tile_config = $.mosaic.getTileConfig(tile_content);
            if(!tile_config){
                return;
            }
            // Check if a field tile
            if (tile_config.tile_type === 'field') {

                fieldhtml = '';

                // Wrap title and description fields for proper styles
                if (tile_config.name === 'IDublinCore-title') {
                    start = '<h1 class="documentFirstHeading">';
                    end = '</h1>';
                } else if (tile_config.name === 'IDublinCore-description') {
                    start = '<p class="documentDescription">';
                    end = '</p>';
                } else {
                    start = '<div>';
                    end = '</div>';
                }

                switch (tile_config.widget) {
                case "z3c.form.browser.text.TextWidget":
                case "z3c.form.browser.text.TextFieldWidget":
                    fieldhtml = start +
                        $("#" + tile_config.id)
                              .find('input').attr('value') + end;
                    break;
                case "z3c.form.browser.textarea.TextAreaWidget":
                case "z3c.form.browser.textarea.TextAreaFieldWidget":
                case "z3c.form.browser.textlines.TextLinesWidget":
                case "z3c.form.browser.textlines.TextLinesFieldWidget":
                    lines = $("#" + tile_config.id)
                                .find('textarea')
                                .val().split('\n');
                    fieldhtml += start;
                    for (var i = 0; i < lines.length; i += 1) {
                        fieldhtml += lines[i] + '<br/>';
                    }
                    fieldhtml += end;
                    break;
                case "plone.app.z3cform.widget.RichTextFieldWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                case "plone.app.widgets.dx.RichTextWidget":
                    fieldhtml = $("#" + tile_config.id)
                                    .find('textarea').val();
                    break;
                default:
                    fieldhtml = '<div class="discreet">Placeholder ' +
                        'for field:<br/><b>' + tile_config.label +
                        '</b></div>';
                    break;
                }
                tile_content.html(fieldhtml);

            // Get data from app tile
            } else if (tile_config) {
                url = base ? [base, href].join('/')
                                         .replace(/\/+\.\//g, '/') : href;
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (value) {

                        // Get dom tree
                        value = $.mosaic.getDomTreeFromHtml(value);

                        // Add head tags
                        $.mosaic.addHeadTags(href, value);

                        tile_content
                            .html('<p class="hiddenStructure ' +
                                'tileUrl">' + href.replace(/&/gim, '&amp;') + '</p>' +
                                value.find('.temp_body_tag').html());
                    }
                });
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
            $.mosaic.setSelectedStaticLayout(layoutPath);
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

    $.mosaic.selectLayout = function(){
        var $el = $('<div/>').appendTo('body');
        var modal = new Modal($el, {
            html: $.mosaic.selectLayoutTemplate($.mosaic.options),
            content: null,
            buttons: '.plone-btn'
        });
        modal.on('shown', function() {
            $('li a', modal.$modal).off('click').on('click', function(e){
                e.preventDefault();
                var layout = $.mosaic.options.available_layouts[$(this).attr('data-value')];
                var layoutPath = '++contentlayout++' + layout.directory + '/' + layout.file;
                modal.hide();
                $.mosaic.applyLayout(layoutPath);
            });
        });
        modal.show();
    };

    /**
     * Get the tile type for the wrapped dom node
     *
     * @id jQuery.mosaic.getTileType
     * @param {$DOM} element to get tile type for
     * @return {string} name of tile type
     */
    $.mosaic.getTileType = function ($el) {
        var tiletype = '';
        if(!$el.is('.mosaic-tile')){
            $el = $el.parents('.mosaic-tile');
        }
        var classes = $el.attr('class').split(" ");
        $(classes).each(function () {

            // Local variables
            var classname;

            classname = this.match(/^mosaic-([\w.\-]+)-tile$/);
            if (classname !== null) {
                if ((classname[1] !== 'selected') &&
                    (classname[1] !== 'new') &&
                    (classname[1] !== 'read-only') &&
                    (classname[1] !== 'helper') &&
                    (classname[1] !== 'original')) {
                    tiletype = classname[1];
                }
            }
        });

        if(!tiletype){
            log.error('Could not find tile type on element with classes: ' + classes.join(', '));
        }

        return tiletype;
    };

    /**
     * Get the tile config for tile type
     *
     * @id jQuery.mosaic.getTileConfig
     * @param {string|$DOM} element to get tile type for or a string for the tile type
     * @return {object} name of tile type
     */
    $.mosaic.getTileConfig = function (tiletype) {
        var tile_config;
        if(typeof(tiletype) !== 'string'){
            /* assuming this is a dom node */
            tiletype = $.mosaic.getTileType(tiletype);
        }
        // Get tile config
        for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
            var found = false;
            var tile_group = $.mosaic.options.tiles[x];
            for (var y = 0; y < tile_group.tiles.length; y += 1) {

                // Set settings value
                if (tile_group.tiles[y].tile_type === 'field') {
                    var widget = tile_group.tiles[y].widget.split('.');
                    widget = widget[widget.length - 1];
                    switch(widget) {
                    case "TextWidget":
                    case "TextFieldWidget":
                    case "TextAreaWidget":
                    case "TextAreaFieldWidget":
                    case "TextLinesWidget":
                    case "TextLinesFieldWidget":
                    case "WysiwygWidget":
                    case "WysiwygFieldWidget":
                    case "RichTextWidget":
                    case "RichTextFieldWidget":
                        tile_group.tiles[y].settings = false;
                        break;
                    default:
                        tile_group.tiles[y].settings = true;
                    }
                }
                if (tile_group.tiles[y].name === tiletype) {
                    tile_config = tile_group.tiles[y];
                    found = true;
                    break;
                }
            }
            if(found){
                break;
            }
        }


        if(!tile_config){
            // dive out of here, something went wrong finding tile config
            log.error('Could not load tile config for tile type: ' + tiletype);
            return;
        }
        return tile_config;
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
        for (i = 0; i < headelements.length; i += 1) {
            $(headelements[i], $.mosaic.document).remove();
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
