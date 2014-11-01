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

/*global tiledata: false, jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

define([
    'jquery',
    'mosaic.toolbar',
    'mosaic.layout',
    'mosaic.actions'
], function($) {
    "use strict";

    // Create the mosaic namespace
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Set variables
    $.mosaic.loaded = false;
    $.mosaic.nrOfTiles = 0;
    $.mosaic.tileInitCount = 0;

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


        // Local variables
        var content;

        // Add global options
        $.mosaic.options = options.data;
        $.mosaic.options.url = options.url;
        $.mosaic.options.ignore_context = options.ignore_context;
        $.mosaic.options.tileheadelements = [];

        content = $('[name="form.widgets.ILayoutAware.content"]').val();

        // Check if no layout
        if (content === '') {

            // Exit
            return;
        }

        // Get dom tree
        content = $.mosaic.getDomTreeFromHtml(content);
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
                target
                    .removeAttr('data-panel')
                    .removeAttr('id')
                    .addClass('mosaic-original-content')
                    .hide();
                target.before($(document.createElement("div"))
                    .attr("id", panel_attr_id)
                    .addClass('mosaic-panel')
                    .attr('data-panel', 'content')
                    .html(content.find("[data-panel=" +
                        panel_id + "]").html())
                );
            } else {
                target.addClass('mosaic-panel');
                target.html(content.find("[data-panel=" +
                    panel_id + "]").html());
            }
        });

        // Pre-fill new panels from the layout
        $("[data-panel]", $.mosaic.document).each(function () {
            if (!$(this).hasClass('mosaic-panel')) {
                console.log($(this));
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
        $.mosaic.nrOfTiles =
            $.mosaic.options.panels.find("[data-tile]").size();

        $.mosaic.options.panels.find("[data-tile]").each(function () {

            // Local variables
            var target, base, href, tile_content, tiletype, classes, url,
                tile_config, x, tile_group, y, fieldhtml, lines, i;

            base = $($.mosaic.document).find('head > base').attr('href');
            href = $(this).attr("data-tile");

            // Get tile type
            tile_content = $(this).parent();
            tiletype = '';
            classes = tile_content.parents('.mosaic-tile').attr('class')
                .split(" ");
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

            // Get tile config
            for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                tile_group = $.mosaic.options.tiles[x];
                for (y = 0; y < tile_group.tiles.length; y += 1) {

                    // Set settings value
                    if (tile_group.tiles[y].tile_type === 'field') {
                        var widget = tile_group.tiles[y].widget.split('.');
                        widget = widget[widget.length - 1];
                        switch(widget) {
                        case "TextWidget":
                        case "TextFieldWidget":
                        case "TextAreaWidget":
                        case "TextAreaFieldWidget":
                        case "WysiwygWidget":
                        case "WysiwygFieldWidget":
                        case "RichTextWidget":
                            tile_group.tiles[y].settings = false;
                            break;
                        default:
                            tile_group.tiles[y].settings = true;
                        }
                    }
                    if (tile_group.tiles[y].name === tiletype) {
                        tile_config = tile_group.tiles[y];
                    }
                }
            }

            // Check if a field tile
            if (tile_config.tile_type === 'field') {

                fieldhtml = '';

                switch (tile_config.widget) {
                case "z3c.form.browser.text.TextWidget":
                case "z3c.form.browser.text.TextFieldWidget":
                    fieldhtml = '<div>' +
                        $("#" + tile_config.id)
                              .find('input').attr('value') + '</div>';
                    break;
                case "z3c.form.browser.textarea.TextAreaWidget":
                case "z3c.form.browser.textarea.TextAreaFieldWidget":
                    lines = $("#" + tile_config.id)
                                .find('textarea')
                                .attr('value').split('\n');
                    for (i = 0; i < lines.length; i += 1) {
                        fieldhtml += '<div>' + lines[i] + '</div>';
                    }
                    break;
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
            } else {
                url = base ? [base, href].join('/')
                                         .replace(/\/+\.\//g, '/') : href;
                if (tile_config.name ===
                    'plone.app.standardtiles.title' ||
                    tile_config.name ===
                    'plone.app.standardtiles.description') {
                    url += '?ignore_context=' +
                        $.mosaic.options.ignore_context;
                }
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
                                'tileUrl">' + href + '</p>' +
                                value.find('.temp_body_tag').html());

                        $.mosaic.tileInitCount += 1;

                        if ($.mosaic.tileInitCount >= $.mosaic.nrOfTiles) {
                            $.mosaic.initialized();
                        }
                    }
                });
            }
        });

        // Init overlay
        $('.mosaic-original-content', $.mosaic.document).mosaicOverlay();

        // Add toolbar div below menu
        $("body").prepend($(document.createElement("div"))
            .addClass("mosaic-toolbar")
        );

        // Add the toolbar to the options
        $.mosaic.options.toolbar = $(".mosaic-toolbar");

        // Add page url to the options
        $.mosaic.options.url = options.url;

        // Init toolbar
        $.mosaic.options.toolbar.mosaicToolbar();

        // Init panel
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
        content = content.replace(/<html/, "<div class=\"temp_html_tag\"");
        content = content.replace(/<\/html/, "</div");
        content = content.replace(/<head/, "<div class=\"temp_head_tag\"");
        content = content.replace(/<\/head/, "</div");
        content = content.replace(/<body/, "<div class=\"temp_body_tag\"");
        content = content.replace(/<\/body/, "</div");
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