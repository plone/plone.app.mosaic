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

(function ($) {
    

    // Create the mosaic namespace
    $.mosaic = {
        "loaded": false,
        "nrOfTiles": 0,
        "tileInitCount": 0
    };

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
        $('[data-panel] [data-panel]').removeAttr('data-panel');
        // Find panels
        $('#content [data-panel]').removeAttr('data-panel');
        content.find("[data-panel]").each(function () {

            // Local variables
            var panel_id = $(this).attr("data-panel"),
                target = $("[data-panel=" + panel_id + "]",
                $.mosaic.document);

            // If content, create a new div since the form data is in
            // this panel
            if (panel_id === 'content') {
                target
                    .removeAttr('data-panel')
                    .removeAttr('id')
                    .addClass('mosaic-original-content')
                    .hide();
                target.before($(document.createElement("div"))
                    .attr("id", "content")
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

        // Init app tiles
        $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);
        $.mosaic.nrOfTiles =
            $.mosaic.options.panels.find("[data-tile]").size();

        $.mosaic.options.panels.find("[data-tile]").each(function () {

            // Local variables
            var target, href, tile_content, tiletype, classes, url,
                tile_config, x, tile_group, y, fieldhtml, lines, i;

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
                    fieldhtml = $("#" + tile_config.id)
                                    .find('textarea').attr('value');
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
                url = href;
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
//                $('#content.mosaic-original-content',
//                  $.mosaic.document).mosaicOverlay();

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
                    obj.attr('id') !== 'plone-cmsui-menu') {

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

}(jQuery));

define("mosaic.core", function(){});

/**
 * This plugin is used to register and execute actions.
 *
 * @author Rob Gietema
 * @version 0.1
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
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Global array containing actions and shortcuts
    $.mosaic.actionManager = {
        actions: [],                // Array with all the actions
        shortcuts: []               // Lookup array for shortcuts
    };

    /**
     * Register an action
     *
     * @id jQuery.mosaic.registerAction
     * @param {String} name Name of the action.
     * @param {Object} options Object containing all the options of the action
     */
    $.mosaic.registerAction = function (name, options) {

        // Extend default settings
        options = $.extend({

            // Handler for executing the action
            exec: function () {
            },

            // Shortcut can be any key + ctrl/shift/alt or a combination of
            // those
            shortcut: {
                ctrl: false,
                alt: false,
                shift: false,
                key: ""
            },

            // Method to see if the actions should be visible based on the
            // current tile state
            visible: function (tile) {
                return true;
            },

            // Should the action be undo-able?
            undoable: false

        }, options);

        // Add action to manager
        $.mosaic.actionManager.actions[name] = options;

        // Check if shortcut is defined
        if (options.shortcut.key !== "") {

            // Set keyCode and charCode
            options.shortcut.charCode = options.shortcut.key.toUpperCase()
                .charCodeAt(0);
            options.shortcut.action = name;

            // Set shortcut
            $.mosaic.actionManager.shortcuts.push(options.shortcut);
        }
    };

    /**
     * Execute an action
     *
     * @id jQuery.mosaicExecAction
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicExecAction = function () {

        // Loop through matched elements
        return this.each(function () {

            // Check if actions specified
            if ($(this).data("action") !== "") {

                var mgr = $.mosaic.actionManager;

                // Exec actions
                mgr.actions[$(this).data("action")].exec(this);
                if (mgr.actions[$(this).data("action")].undoable) {
                    $.mosaic.undo.snapshot();
                }
            }
        });
    };

    /**
     * Remove spans inserted by webkit
     *
     * @id jQuery.mosaic.fixWebkitSpan
     * @return {Object} jQuery object
     */
    $.mosaic.fixWebkitSpan = function () {
        var webkit_span = $(".Apple-style-span", $.mosaic.document);
        webkit_span.after(webkit_span.html());
        webkit_span.remove();
    };

    /**
     * Initialize the action manager
     *
     * @id jQuery.mosaic.initActions
     */
    $.mosaic.initActions = function () {

        // Register strong action
        $.mosaic.registerAction('strong', {
            exec: function () {
                $.mosaic.editor.applyFormat("strong");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: false,
                key: 'b'
            }
        });

        // Register emphasis action
        $.mosaic.registerAction('em', {
            exec: function () {
                $.mosaic.editor.applyFormat("em");
            }
        });

        // Register unordered list action
        $.mosaic.registerAction('ul', {
            exec: function () {
                $.mosaic.execCommand("InsertUnorderedList");
            }
        });

        // Register ordered list action
        $.mosaic.registerAction('ol', {
            exec: function () {
                $.mosaic.execCommand("InsertOrderedList");
            }
        });

        // Register undo action
        $.mosaic.registerAction('undo', {
            exec: function () {
                $.mosaic.execCommand("Undo");
            }
        });

        // Register redo action
        $.mosaic.registerAction('redo', {
            exec: function () {
                $.mosaic.execCommand("Redo");
            }
        });

        // Register paragraph action
        $.mosaic.registerAction('paragraph', {
            exec: function () {
                $.mosaic.editor.applyFormat("p");
            }
        });

        // Register heading action
        $.mosaic.registerAction('heading', {
            exec: function () {
                $.mosaic.editor.applyFormat("h2");
            }
        });

        // Register subheading action
        $.mosaic.registerAction('subheading', {
            exec: function () {
                $.mosaic.editor.applyFormat("h3");
            }
        });

        // Register discreet action
        $.mosaic.registerAction('discreet', {
            exec: function () {
                $.mosaic.editor.applyFormat("discreet");
            }
        });

        // Register literal action
        $.mosaic.registerAction('literal', {
            exec: function () {
                $.mosaic.editor.applyFormat("pre");
            }
        });

        // Register quote action
        $.mosaic.registerAction('quote', {
            exec: function () {
                $.mosaic.editor.applyFormat("pullquote");
            }
        });

        // Register callout action
        $.mosaic.registerAction('callout', {
            exec: function () {
                $.mosaic.editor.applyFormat("callout");
            }
        });

        // Register highlight action
        $.mosaic.registerAction('highlight', {
            exec: function () {
                $.mosaic.editor.applyFormat("highlight");
            }
        });

        // Register sub action
        $.mosaic.registerAction('sub', {
            exec: function () {
                $.mosaic.editor.applyFormat("sub");
            }
        });

        // Register sup action
        $.mosaic.registerAction('sup', {
            exec: function () {
                $.mosaic.editor.applyFormat("sup");
            }
        });

        // Register remove format action
        $.mosaic.registerAction('remove-format', {
            exec: function () {
                $.mosaic.editor.applyFormat("removeformat");
            }
        });

        // Register pagebreak action
        $.mosaic.registerAction('pagebreak', {
            exec: function () {
                $.mosaic.editor.applyFormat("pagebreak");
            }
        });

        // Register justify left action
        $.mosaic.registerAction('justify-left', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-left");
            }
        });

        // Register justify center action
        $.mosaic.registerAction('justify-center', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-center");
            }
        });

        // Register justify right action
        $.mosaic.registerAction('justify-right', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-right");
            }
        });

        // Register justify full action
        $.mosaic.registerAction('justify-justify', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-justify");
            }
        });

        // Register tile align block action
        $.mosaic.registerAction('tile-align-block', {
            exec: function () {

                // Remove left and right align classes
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .removeClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'b'
            }
        });

        // Register tile align left action
        $.mosaic.registerAction('tile-align-left', {
            exec: function () {

                // Remove right align class, add left align class
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .addClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'l'
            }
        });

        // Register tile align right action
        $.mosaic.registerAction('tile-align-right', {
            exec: function () {

                // Remove left align class, add right align class
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-left")
                    .addClass("mosaic-tile-align-right");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'r'
            }
        });

        // Register save action
        $.mosaic.registerAction('save', {
            exec: function () {
                $("#form-widgets-ILayoutAware-content")
                      .attr("value", $.mosaic.getPageContent());

                $("#form-buttons-save").click();
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: false,
                key: 's'
            }
        });

        // Register cancel action
        $.mosaic.registerAction('cancel', {
            exec: function () {

                // Cancel form
                $("#form-buttons-cancel").click();
            }
        });

        // Register html action
        $.mosaic.registerAction('html', {
            exec: function () {

                // Local variables
                var tilecontent, text, height;

                // Get tile content div
                tilecontent = $(".mosaic-selected-tile", $.mosaic.document)
                                  .children(".mosaic-tile-content");

                // Check if not already html editable
                if (tilecontent.find('.mosaic-rich-text-textarea')
                        .length === 0) {

                    // Add new text area and set content
                    text = tilecontent.html();
                    height = tilecontent.height();
                    tilecontent.empty();
                    tilecontent.prepend(
                        $($.mosaic.document.createElement("textarea"))
                            .addClass("mosaic-rich-text-textarea")
                            .html($.trim(text))
                            .height(height));
                }
            }
        });

        // Register undo action
        $.mosaic.registerAction('undo', {
            exec: function () {
                $.mosaic.undo.undo();
            }
        });

        // Register redo action
        $.mosaic.registerAction('redo', {
            exec: function () {
                $.mosaic.undo.redo();
            }
        });

        // Register page properties action
        $.mosaic.registerAction('page-properties', {
            exec: function () {
                $.mosaic.overlay.open('all');
            }
        });

         // Register add tile action
        $.mosaic.registerAction('add-tile', {
            exec: function () {

                // Open overlay
                var modal = require('mockup-patterns-modal');
                $.mosaic.overlay = new modal($('.mosaic-toolbar'),
                    {ajaxUrl: $.mosaic.options.context_url +
                     '/@@add-tile?form.button.Create=Create'});
                $.mosaic.overlay.show();
            }
        });

        // Register format action
        $.mosaic.registerAction('format', {
            exec: function (source) {

                // Execute the action
                $(source).find("[value=" + $(source).val() + "]")
                    .mosaicExecAction();

                // Reset menu
                $(source).val("none");
            }
        });

        // Register page-insert action
        $.mosaic.registerAction('insert', {
            exec: function (source) {

                // Local variables
                var tile_config, tile_group, x, y;

                // Check if value selected
                if ($(source).val() === "none") {
                    return false;
                }

                // Deselect tiles
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();

                // Set actions
                $.mosaic.options.panels.trigger("selectedtilechange");

                // Get tile config
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    tile_group = $.mosaic.options.tiles[x];
                    for (y = 0; y < tile_group.tiles.length; y += 1) {
                        if (tile_group.tiles[y].name === $(source).val()) {
                            tile_config = tile_group.tiles[y];
                        }
                    }
                }

                if (tile_config.tile_type === 'app') {

                    // Open overlay
                    var modal = require('mockup-patterns-modal');
                    $.mosaic.overlay = new modal($('.mosaic-toolbar'),
                        {ajaxUrl: $.mosaic.options.context_url +
                        '/@@add-tile?type=' + $(source).val() +
                        '&form.button.Create=Create', 
                        loadLinksWithinModal: true,
                    });
                    $.mosaic.overlay._tile_type = $(source).val();
                    $.mosaic.overlay.show();
                    $.mosaic.overlay.on(
                        'formActionSuccess',
                        function (event, response, state, xhr, form) {
                            $.mosaic.addAppTileHTML(
                                $.mosaic.overlay._tile_type, response,
                                xhr.getResponseHeader('X-Tile-Url')
                            );
                        }
                    );

                } else {

                    // Add tile
                    $.mosaic.addTile($(source).val(),
                        $.mosaic.getDefaultValue(tile_config));
                }

                // Reset menu
                $(source).val("none");

                // Normal exit
                return true;
            }
        });

        // Handle keypress event, check for shortcuts
        $(document).keypress(function (e) {

            // Action name
            var action = "";

            // Loop through shortcuts
            $($.mosaic.actionManager.shortcuts).each(function () {

                // Check if shortcut matched
                if (((e.ctrlKey === this.ctrl) ||
                     (navigator.userAgent.toLowerCase()
                        .indexOf('macintosh') !== -1 &&
                        e.metaKey === this.ctrl)) &&
                    ((e.altKey === this.alt) || (e.altKey === undefined)) &&
                    (e.shiftKey === this.shift) &&
                    (e.charCode && String.fromCharCode(e.charCode)
                        .toUpperCase().charCodeAt(0) === this.charCode)) {

                    // Found action
                    action = this.action;
                }
            });

            // Check if shortcut found
            if (action !== "") {

                // Exec actions
                $.mosaic.actionManager.actions[action].exec();

                if ($.mosaic.actionManager.actions[action].undoable) {
                    $.mosaic.undo.snapshot();
                }

                // Prevent other actions
                return false;
            }

            // Normal exit
            return true;
        });
    };
}(jQuery));

define("mosaic.actions", function(){});

/**
 * This plugin is used to set an element to be editable.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2011 Plone Foundation
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
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the editor namespace
    $.mosaic.editor = {
    };

    /**
    * Create a new instance of the mosaic editor.
    *
    * @constructor
    * @id jQuery.fn.mosaicEditor
    * @return {Object} Returns a new mosaic editor object.
    */
    $.fn.mosaicEditor = function () {
        var obj;

        // Get element
        obj = $(this);

        // Generate random id
        var random_id = 1 + Math.floor(100000 * Math.random());
        while ($("#mosaic-rich-text-init-" + random_id,
               $.mosaic.document).length > 0) {
            random_id = 1 + Math.floor(100000 * Math.random());
        }
        $(this).attr('id', 'mosaic-rich-text-init-' + random_id);

        // Init rich editor
        tinymce.init({
            selector: "#" + "mosaic-rich-text-init-" + random_id,
            theme: "modern",
            inline: true,
            schema: "html5",
            add_unload_trigger: false,
            toolbar: false,
            statusbar: false,
            menubar: false,
            formats : {
                strong : {inline : 'strong'},
                em : {inline : 'em'},
                h2 : {block : 'h2', remove : 'all'},
                h3 : {block : 'h3', remove : 'all'},
                p : {block : 'p', remove : 'all'},
                sub : {inline : 'sub', remove : 'all'},
                sup : {inline : 'sup', remove : 'all'},
                discreet : {block : 'p',
                            attributes : {'class' : 'discreet'},
                            remove : 'all'},
                pre : {block : 'pre', remove : 'all'},
                pullquote : {block: 'q',
                             attributes: {'class' : 'pullquote'},
                             remove: 'all'},
                callout : {block: 'p',
                           attributes: {'class' : 'callout'},
                           remove: 'all'},
                highlight : {inline: 'span',
                             attributes: {'class' : 'visualHighlight'},
                             remove: 'all'},
                pagebreak : {block: 'p',
                             attributes: {'class' : 'pagebreak'},
                             remove: 'all'},
                'justify-left' : {selector: 'p,h2,h3,pre,q',
                                  attributes: {'class' : 'justify-left'},
                                  remove: 'all'},
                'justify-center' : {selector: 'p,h2,h3,pre,q',
                                    attributes: {'class' : 'justify-center'},
                                    remove: 'all'},
                'justify-right' : {selector: 'p,h2,h3,pre,q',
                                   attributes: {'class' : 'justify-right'},
                                   remove: 'all'},
                'justify-justify' : {selector: 'p,h2,h3,pre,q',
                                     attributes: {'class' : 'justify-justify'},
                                     remove: 'all'}
            }
        });

        // Set editor class
        obj.addClass('mosaic-rich-text');
    };

    /**
     * Exec a command on the editor
     *
     * @id jQuery.mosaic.execCommand
     * @param {String} command Command to execute
     * @param {String} ui UI to use
     * @param {String} value Vale of the command
     */
    $.mosaic.execCommand = function (command, ui, value) {

        // Exec command
        tinymce.activeEditor.execCommand(command, ui, value);
    };

    /**
     * Apply formatting to the current selection
     *
     * @id jQuery.mosaic.editor.applyFormat
     * @param {String} format Name of the registered format to apply
     */
    $.mosaic.editor.applyFormat = function (format) {

        // Apply format
        tinyMCE.activeEditor.formatter.apply(format);
    };

    /**
     * Register format
     *
     * @id jQuery.mosaic.editor.registerFormat
     * @param {String} name Name of the registered format to apply
     * @param {Object} format Formatting object
     */
    $.mosaic.editor.registerFormat = function (name, format) {

        // Apply format
        tinymce.activeEditor.formatter.register(name, format);
    };

})(jQuery);


define("mosaic.editor", function(){});

/**
 * This plugin is used to create a mosaic layout.
 *
 * @author Rob Gietema
 * @version 0.1
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
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the layout namespace
    $.mosaic.layout = {
        widthClasses: ['mosaic-width-quarter', 'mosaic-width-third',
                       'mosaic-width-half', 'mosaic-width-two-thirds',
                       'mosaic-width-three-quarters', 'mosaic-width-full'],
        positionClasses: ['mosaic-position-leftmost', 'mosaic-position-quarter',
                          'mosaic-position-third', 'mosaic-position-half',
                          'mosaic-position-two-thirds',
                          'mosaic-position-three-quarters']
    };

    /**
    * Create a new instance of a mosaic layout.
    *
    * @constructor
    * @id jQuery.fn.mosaicLayout
    * @return {Object} Returns a new mosaic layout object.
    */
    $.fn.mosaicLayout = function () {

        // Keydown handler
        var DocumentKeydown = function (e) {

            // Check if esc
            if (e.keyCode === 27) {

                // Check if dragging
                var original_tile = $(".mosaic-original-tile", $.mosaic.document);
                if (original_tile.length > 0) {
                    original_tile.each(function () {
                        $(this).addClass("mosaic-drag-cancel");
                        if ($(this).hasClass("mosaic-helper-tile-new")) {
                            $(document).trigger("mousedown");
                        } else {
                            $(document).trigger("mouseup");
                        }
                    });

                // Deselect tile
                } else {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }

                // Find resize helper
                $(".mosaic-resize-handle-helper",
                  $.mosaic.document).each(function () {

                    // Remove resizing state
                    $(this).parents("[data-panel]")
                        .removeClass("mosaic-panel-resizing");
                    $(this).parent().removeClass("mosaic-row-resizing");
                    $(this).parent().children(".mosaic-resize-placeholder")
                        .remove();

                    // Remove helper
                    $(this).remove();
                });

                // Hide overlay
                $.mosaic.overlay.hide();
                // $.mosaic.overlay.$el.trigger('destroy.modal.patterns');;
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('keydown', DocumentKeydown);

        // Add deselect
        var DocumentMousedown = function (e) {

            // Get element
            var elm;
            if (e.target) {
                elm = e.target;
            } else if (e.srcElement) {
                elm = e.srcElement;
            }

            // If clicked outside a tile
            if ($(elm).parents(".mosaic-tile").length === 0) {

                // Check if outside toolbar
                if ($(elm).parents(".mosaic-toolbar").length === 0) {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }
            }

            // Find resize helper
            var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document);
            if (new_tile.length > 0) {
                new_tile.each(function () {

                    // Handle drag end
                    $(this).mosaicHandleDragEnd();
                });
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousedown', DocumentMousedown);

        // Handle mouse move event
        var DocumentMousemove = function (e) {

            // Find resize helper
            $(".mosaic-helper-tile-new", $.mosaic.document).each(function () {

                // Get offset
                var offset = $(this).parent().offset();

                // Get mouse x
                $(this).css("top", e.pageY + 3 - offset.top);
                $(this).css("left", e.pageX + 3 - offset.left);
            });

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {
                var columns;

                var cur_snap_offset;

                // Get helper
                var helper = $(this);

                // Get row
                var row = helper.parent();

                // Get mouse x
                var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

                // Get mouse percentage
                var mouse_percentage = (mouse_x / helper.data("row_width")) * 100;

                // Get closest snap location
                var snap = 25;
                var snap_offset = 1000;
                $([25, 33, 50, 67, 75]).each(function () {
                    cur_snap_offset = Math.abs(this - mouse_percentage);
                    if (cur_snap_offset < snap_offset) {
                        snap = this;
                        snap_offset = cur_snap_offset;
                    }
                });

                // If 2 columns
                if (helper.data("nr_of_columns") === 2) {

                    // Check if resize
                    if (helper.data("column_sizes").split(" ")[0] !== snap) {

                        // Loop through columns
                        row.children(".mosaic-resize-placeholder").each(function (i) {

                            // First column
                            if (i === 0) {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(snap, 10)));

                            // Second column
                            } else {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(100 - snap, 10)))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                                // Set helper
                                helper
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));
                            }
                        });

                        // Set new size
                        $(this).data("column_sizes", snap + " " + (100 - snap));
                    }

                // Else 3 columns
                } else {

                    // Get resize handle index
                    var resize_handle_index = $(this).data("resize_handle_index");

                    // Check if first resize handle
                    if (resize_handle_index === 1) {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index") - 1] !== snap) && (parseInt(snap, 10) <= 50)) {

                            // Get columns
                            columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 25:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            case 33:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(1)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "50 25 25");
                                break;
                            }
                        }

                    // Else second resize handle
                    } else {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index")] !== (100 - snap)) && (parseInt(snap, 10) >= 50)) {

                            // Get columns
                            columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                helper.data("column_sizes", "25 25 50");
                                break;
                            case 66:
                            case 67:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 75:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            }
                        }
                    }
                }
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousemove', DocumentMousemove);
        $($.mosaic.document).bind('dragover', DocumentMousemove);

        // Handle mouse up event
        var DocumentMouseup = function (e) {

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

                // Get panel
                var panel = $(this).parents("[data-panel]");

                // Get column sizes
                var column_sizes = $(this).data("column_sizes").split(" ");

                // Set column sizes
                $(this).parent().children(".mosaic-grid-cell").each(function (i) {
                    var offset_x = 0;
                    for (var j = 0; j < i; j += 1) {
                        offset_x += parseInt(column_sizes[j], 10);
                    }
                    $(this)
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .addClass(GetPositionClassByInt(offset_x) + " " + GetWidthClassByInt(parseInt(column_sizes[i], 10)));
                });

                // Remove resizing state
                panel.removeClass("mosaic-panel-resizing");
                $(this).parent().removeClass("mosaic-row-resizing");
                $(this).parent().children(".mosaic-resize-placeholder").remove();

                // Set resize handles
                $(this).parent().mosaicSetResizeHandles();
                panel.mosaicSetResizeHandleLocation();
                panel.find(".mosaic-selected-tile").mosaicFocusTileContent();

                // Remove helper
                $(this).remove();
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mouseup', DocumentMouseup);

        // Handle mousemove on tile
        var TileMousemove = function (e) {

            // Check if dragging
            if ($(this).parents("[data-panel]").hasClass("mosaic-panel-dragging")) {

                // Hide all dividers
                $(".mosaic-selected-divider", $.mosaic.document)
                    .removeClass("mosaic-selected-divider");

                // Don't show dividers if above original or floating tile
                if (($(this).hasClass("mosaic-original-tile") === false) &&
                    ($(this).hasClass("mosaic-tile-align-left") === false) &&
                    ($(this).hasClass("mosaic-tile-align-right") === false)) {

                    // Get direction
                    var dir = $(this).mosaicGetDirection(e);
                    var divider = $(this).children(".mosaic-divider-" + dir);

                    // Check if left or right divider
                    if ((dir === "left") || (dir === "right")) {
                        var row = divider.parent().parent().parent();

                        // If row has multiple columns
                        if (row.children(".mosaic-grid-cell").length > 1) {
                            divider.height(row.height() + 5);
                            divider.css('top', (row.offset().top - divider.parent().offset().top) - 5);
                        } else {
                            divider.height(divider.parent().height() + 5);
                            divider.css('top', -5);
                        }
                    }

                    // Show divider
                    divider.addClass("mosaic-selected-divider");
                }
            }
        };

        // Bind events
        $(".mosaic-tile", $.mosaic.document).live("mousemove", TileMousemove);
        $(".mosaic-tile", $.mosaic.document).live("dragover", TileMousemove);

        // On click select the current tile
        $(".mosaic-tile", $.mosaic.document).live("click", function () {

            // Select tile
            $(this).mosaicSelectTile();
        });

        $(".mosaic-close-icon", $.mosaic.document).live("click", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if app tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();

                // Remove tags
                $.mosaic.removeHeadTags(tile_url);

                // Calc delete url
                var url = tile_url.split('?')[0];
                url = url.split('@@');
                var tile_type_id = url[1].split('/');
                url = url[0] + '@@delete-tile?type=' + tile_type_id[0] + '&id=' + tile_type_id[1] + '&confirm=true';

                // Ajax call to remove tile
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (value) {

/*
                        $.plone.notify({
                            title: "Info",
                            message: "Application tile removed",
                            sticky: false
                        });
*/
                    }
                });
            }

            // Remove empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Get original row
            var original_row = $(this).parents(".mosaic-tile").parent().parent();

            // Save tile value
            $.mosaic.saveTileValueToForm(tile_config.name, tile_config);

            // Remove current tile
            $(this).parent().remove();

            $.mosaic.undo.snapshot();

            // Cleanup original row
            original_row.mosaicCleanupRow();

            // Add empty rows
            $.mosaic.options.panels.mosaicAddEmptyRows();

            // Set toolbar
            $.mosaic.options.toolbar.trigger("selectedtilechange");
            $.mosaic.options.toolbar.mosaicSetResizeHandleLocation();
        });


        // On click open overlay
        $(".mosaic-info-icon", $.mosaic.document).live("click", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if application tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();
                if (tile_url.indexOf('?') != -1) {
                    var match = tile_url.split("?");
                    var start_url = match[0];
                    var parameters = match[1];
                    parameters = parameters.split("&");
                    for (var i = 0; i < parameters.length; i += 1) {
                        parameters[i] = '"' + parameters[i].replace('=', '":"') + '"';
                    }
                    tile_url = start_url + '?_tiledata={' + parameters.join(",") + '}';
                }
                tile_url = tile_url.replace(/@@/, '@@edit-tile/');

                // Open overlay
                $.mosaic.overlay.openIframe(tile_url);

            } else {

                // Edit field
                $.mosaic.overlay.open('field', tile_config);
            }
        });

        // Loop through matched elements
        var total = this.length;
        return this.each(function (i) {

            // Get current object
            var obj = $(this);

            // Add icons and dividers
            obj.find('.mosaic-tile').mosaicInitTile();
            obj.find('.mosaic-tile').mosaicAddDrag();
            obj.mosaicAddEmptyRows();
            obj.children('.mosaic-grid-row').mosaicSetResizeHandles();
            if (i === (total - 1)) {

                // Get biggest panel
                var width = 0;
                var index = 0;
                $.mosaic.options.panels.each(function (j) {
                    if ($(this).width() > width) {
                        width = $(this).width();
                        index = j;
                    }
                });

                // Select first tile in biggest panel
                $.mosaic.options.panels.eq(index).find('.mosaic-tile:first').mosaicSelectTile();
            }
        });
    };

    /**
     * Initialize the matched tiles
     *
     * @id jQuery.mosaicInitTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicInitTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get layout object
            var tile = $(this);
            var obj = tile.parents("[data-panel]");

            var tile_config = $(this).mosaicGetTileConfig();

            // Check read only
            if (tile_config && tile_config.read_only) {

                // Set read only
                $(this).addClass("mosaic-read-only-tile");
            }

            // Init rich text
            if (tile_config &&
                ((tile_config.tile_type === 'text' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'app' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'field' && tile_config.read_only === false &&
                  (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
                   tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget')))) {

                // Init rich editor
                $(this).children('.mosaic-tile-content').mosaicEditor();
            }

            // Add border divs
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-tile-outer-border")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-inner-border")
                    )
            );

            // If tile is field tile
            if (tile_config && tile_config.tile_type === "field") {

                // Add label
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-field-label")
                        .append(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-field-label-content")
                                .html(tile_config.label)
                        )
                        .append(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-field-label-left")
                        )
                );
            }

            // If the tile is movable
            if ($(this).hasClass("movable") && $.mosaic.options.can_change_layout) {

                // Add drag handle
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-drag-handle")
                );
            }

            // If tile is removable
            if ($(this).hasClass("removable") && $.mosaic.options.can_change_layout) {

                // Add close icon
                $(this).prepend('<div class="mosaic-tile-control mosaic-close-icon"></div>');
            }

            // Add settings icon
            if (tile_config && tile_config.settings) {
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-info-icon")
                );
            }

            // Add dividers
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-top")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-bottom")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-right")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-left")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
        });
    };

    /**
     * Select the matched tile
     *
     * @id jQuery.mosaicSelectTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicSelectTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Check if not already selected
            if ($(this).hasClass("mosaic-selected-tile") === false) {

                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();
                $(this).addClass("mosaic-selected-tile");

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Focus the tile content field
                $(this).mosaicFocusTileContent();
            }
        });
    };

    /**
     * Focus the tile content
     *
     * @id jQuery.mosaicFocusTileContent
     * @return {Object} jQuery object
     */
    $.fn.mosaicFocusTileContent = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get content
            var tile_content = $(this).children(".mosaic-tile-content");
            tile_content.focus();

            // Check if rich text
            if (tile_content.hasClass('mosaic-rich-text')) {

                // Put cursor at the end
                tinyMCE.activeEditor.selection.select(
                    tinyMCE.activeEditor.getBody(), true);
                tinyMCE.activeEditor.selection.collapse(false);
            }
        });
    };

    /**
     * Add mouse move handler to empty rows
     *
     * @id jQuery.mosaicAddMouseMoveEmptyRow
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddMouseMoveEmptyRow = function () {

        // Loop through matched elements
        return this.each(function () {

            // Mouse move event
            $(this).mousemove(function (e) {

                // Get layout object
                var obj = $(this).parents("[data-panel]");

                // Check if dragging
                if (obj.hasClass("mosaic-panel-dragging")) {

                    // Hide all dividers
                    $(".mosaic-selected-divider", $.mosaic.document)
                        .removeClass("mosaic-selected-divider");
                    $(this).children("div").addClass("mosaic-selected-divider");
                }
            });
        });
    };

    /**
     * Add empty rows
     *
     * @id jQuery.mosaicAddEmptyRows
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddEmptyRows = function () {

        // Loop through matched elements
        return this.each(function () {

            // Loop through rows
            $(this).find(".mosaic-grid-row").each(function (i) {

                // Check if current row has multiple columns
                if ($(this).children(".mosaic-grid-cell").length > 1) {

                    // Check if first row
                    if (i === 0) {
                        $(this).before(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }

                    // Check if last row or next row also contains columns
                    if (($(this).nextAll(".mosaic-grid-row").length === 0) || ($(this).next().children(".mosaic-grid-cell").length > 1)) {
                        $(this).after(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }
                }
            });
        });
    };

    /**
     * Get the width class of the matched elements
     *
     * @id jQuery.mosaicGetWidthClass
     * @return {String} Name of the width class
     */
    $.fn.mosaicGetWidthClass = function () {

        var x;

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {

                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x])) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {
                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x].replace("position", "resize"))) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Fallback
        return $.mosaic.layout.widthClasses[0];
    };

    /**
     * Get the position class of the matched elements
     *
     * @id jQuery.mosaicGetPositionClass
     * @return {String} Name of the position class
     */
    $.fn.mosaicGetPositionClass = function () {

        var x;

        // Loop through position classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x])) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Loop through resize classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x].replace("position", "resize"))) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Fallback
        return $.mosaic.layout.positionClasses[0];
    };

    /**
     * Add draggable to matched elements
     *
     * @id jQuery.mosaicAddDrag
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddDrag = function () {

        // Loop through matched elements
        return this.each(function () {

            var tile = $(this);

            var DragMove = function (event) {
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                var offset = helper.parents("[data-panel]").offset();
                helper.css("top", event.pageY + 3 - offset.top);
                helper.css("left", event.pageX + 3 - offset.left);
            };
            var DragStop = function () {
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                $($.mosaic.document)
                    .unbind('mousemove', DragMove)
                    .unbind('mouseup', DragStop);

                // Handle drag end
                helper.mosaicHandleDragEnd();
                helper.remove();
            };
            return tile.each(function () {
                tile.find('div.mosaic-drag-handle')
                    .unbind('mousedown')
                    .bind('mousedown', function (event) {

                    var downX = event.pageX;
                    var downY = event.pageY;
                    var DragCheckMove = function (event) {
                        if (Math.max(
                            Math.abs(downX - event.pageX),
                            Math.abs(downY - event.pageY)
                        ) >= 1) {

                            // Add dragging class to content area
                            $.mosaic.options.panels.addClass("mosaic-panel-dragging");
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .removeClass("mosaic-selected-tile")
                                .children(".mosaic-tile-content").blur();

                            var originaltile = $(event.target).parents(".mosaic-tile");

                            var clone = originaltile.clone(true);
                            originaltile.addClass("mosaic-original-tile");

                            originaltile.parents("[data-panel]").append(clone);
                            clone
                                .css({
                                    "width": originaltile.width(),
                                    "position": "absolute",
                                    "opacity": 0.5
                                })
                                .addClass("mosaic-helper-tile");
                            $($.mosaic.document).mousemove(DragMove);
                            $($.mosaic.document).mouseup(DragStop);
                            $($.mosaic.document).unbind('mousemove', DragCheckMove);
                        }
                    };
                    $($.mosaic.document).bind('mousemove', DragCheckMove);
                    $($.mosaic.document).bind('mouseup', function () {
                        $($.mosaic.document).unbind('mousemove', DragCheckMove);
                    });
                });
            });
        });
    };

    /**
     * Event handler for drag end
     *
     * @id jQuery.mosaicHandleDragEnd
     * @return {Object} jQuery object
     */
    $.fn.mosaicHandleDragEnd = function () {

        // Get layout object
        var obj = $(this).parents("[data-panel]");

        // Remove dragging class from content
        $.mosaic.options.panels.removeClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Get direction
        var divider = $(".mosaic-selected-divider", $.mosaic.document);
        var drop = divider.parent();
        var dir = "";
        if (divider.hasClass("mosaic-divider-top")) {
            dir = "top";
        }
        if (divider.hasClass("mosaic-divider-bottom")) {
            dir = "bottom";
        }
        if (divider.hasClass("mosaic-divider-left")) {
            dir = "left";
        }
        if (divider.hasClass("mosaic-divider-right")) {
            dir = "right";
        }
        divider.removeClass("mosaic-selected-divider");

        // True if new tile is inserted
        var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document).length > 0;
        var original_tile = $(".mosaic-original-tile", $.mosaic.document);

        // Check if esc is pressed
        if (original_tile.hasClass("mosaic-drag-cancel")) {

            // Remove cancel class
            original_tile.removeClass("mosaic-drag-cancel");

            // Remove remaining empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Dropped on empty row
        } else if (drop.hasClass("mosaic-empty-row")) {

            // Replace empty with normal row class
            drop
                .removeClass("mosaic-empty-row")
                .unbind('mousemove');

            // Clean cell
            drop.children(".mosaic-grid-cell")
                .children("div").remove();

            // Add tile to empty row
            drop.children(".mosaic-grid-cell")
                .append(original_tile
                    .clone(true)
                    .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                    .css({width: "", left: "", top: ""})
                    .mosaicAddDrag()
                    .addClass("mosaic-new-tile")
            );

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

        // Not dropped on tile
        } else if (drop.hasClass("mosaic-tile") === false) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Check if max columns rows is reached
        } else if ((drop.parent().parent().children(".mosaic-grid-cell").length === 4) && (dir === "left" || dir === "right")) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

            // Notify user
            $.plone.notify({
                title: "Info",
                message: "You can't have more then 4 columns",
                sticky: false
            });

        // Dropped on row
        } else {

            // Remove empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // If top
            if (dir === "top") {

                // Add tile before
                drop.before(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If bottom
            } else if (dir === "bottom") {

                // Add tile after
                drop.after(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If left
            } else if ((dir === "left") || (dir === "right")) {

                // Check if only 1 column in the row
                if (drop.parent().parent().children(".mosaic-grid-cell").length === 1) {

                    // Put tiles above dropped tile in a new row above
                    var prev_elms = drop.prevAll();
                    if (prev_elms.length > 0) {
                        drop.parent().parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($(prev_elms.get().reverse()).clone(true).mosaicAddDrag())
                                )
                            );
                        prev_elms.remove();
                    }

                    // Put tiles below dropped tile in a new row below
                    var next_elms = drop.nextAll();
                    if (next_elms.length > 0) {
                        drop.parent().parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append(next_elms.clone(true).mosaicAddDrag())
                                )
                            );
                        next_elms.remove();
                    }

                    // Resize current column
                    drop.parent()
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .addClass("mosaic-width-half");

                    // Create column with dragged tile in it
                    if (dir === "left") {
                        drop.parent()
                            .addClass("mosaic-position-half")
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    } else {
                        drop.parent()
                            .addClass("mosaic-position-leftmost")
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-half")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    }

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();

                // Dropped inside column
                } else {

                    // Create new column
                    if (dir === "left") {
                        drop.parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    } else {
                        drop.parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    }

                    // Rezize columns
                    drop.parent().parent().mosaicSetColumnSizes();

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();
                }
            }
        }

        // Remove original tile
        var original_row = original_tile.parent().parent();
        $(".mosaic-original-tile", $.mosaic.document).remove();

        // Cleanup original row
        original_row.mosaicCleanupRow();

        // Add empty rows
        $.mosaic.options.panels.mosaicAddEmptyRows();

        // Select new tile
        if (new_tile) {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile").mosaicSelectTile();
        } else {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile");
        }
    };

    /**
     * Set the sizes of the column
     *
     * @id jQuery.mosaicSetColumnSizes
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetColumnSizes = function () {

        // Loop through matched elements
        return this.each(function () {

            // Resize columns in the row
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            $(this)
                .children(".mosaic-grid-cell").each(function (i) {
                    $(this)
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "));

                    // Set width / position
                    switch (nr_of_columns) {

                    // 1 column
                    case 1:
                        $(this).addClass("mosaic-width-full mosaic-position-leftmost");
                        break;

                    // 2 columns
                    case 2:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-half mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-half mosaic-position-half");
                            break;
                        }
                        break;

                    // 3 columns
                    case 3:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-third mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-third mosaic-position-third");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-third mosaic-position-two-thirds");
                            break;
                        }
                        break;

                    // 4 columns
                    case 4:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-quarter mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-quarter mosaic-position-quarter");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-quarter mosaic-position-half");
                            break;
                        case 3:
                            $(this).addClass("mosaic-width-quarter mosaic-position-three-quarters");
                            break;
                        }
                        break;
                    }
                });
        });
    };

    /**
     * Add new resize handlers
     *
     * @id jQuery.mosaicSetResizeHandles
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetResizeHandles = function () {

        // Loop through matched elements
        return this.each(function () {

            // Remove resize handles
            $(this).children(".mosaic-resize-handle").remove();

            // Check number of columns
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            switch (nr_of_columns) {
            case 2:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            case 3:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-two " + $($(this).children(".mosaic-grid-cell").get(2))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            }

            // Mouse down handler on resize handle
            $(this).children(".mosaic-resize-handle").mousedown(function (e) {

                // Get number of columns and current sizes
                var column_sizes = [];
                $(this).parent().children(".mosaic-grid-cell").each(function () {

                    // Add column size
                    switch ($(this).mosaicGetWidthClass()) {
                    case "mosaic-width-half":
                        column_sizes.push("50");
                        break;
                    case "mosaic-width-quarter":
                        column_sizes.push("25");
                        break;
                    case "mosaic-width-third":
                        column_sizes.push("33");
                        break;
                    case "mosaic-width-two-thirds":
                        column_sizes.push("66");
                        break;
                    case "mosaic-width-three-quarters":
                        column_sizes.push("75");
                        break;
                    }

                    // Add placeholder
                    $(this).parent().append($($.mosaic.document.createElement("div"))
                        .addClass("mosaic-resize-placeholder " + $(this).mosaicGetWidthClass() + " " + $(this).mosaicGetPositionClass().replace("position", "resize"))
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-resize-placeholder-inner-border")
                        )
                    );
                });

                // Get resize handle index
                var resize_handle_index = 1;
                if ($(this).hasClass("mosaic-resize-handle-two")) {
                    resize_handle_index = 2;
                }

                // Add helper
                $(this).parent().append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
                    .addClass($(this).mosaicGetPositionClass().replace("position", "resize"))
                    .data("row_width", $(this).parent().width())
                    .data("nr_of_columns", $(this).parent().children(".mosaic-grid-cell").length)
                    .data("column_sizes", column_sizes.join(" "))
                    .data("resize_handle_index", resize_handle_index)
                );

                // Set resizing state
                $(this).parents("[data-panel]").addClass("mosaic-panel-resizing");
                $(this).parent().addClass("mosaic-row-resizing");
                $(".mosaic-selected-tile", $.mosaic.document).children(".mosaic-tile-content").blur();

                // Prevent drag event
                return false;
            });
        });
    };

    /**
     * Cleanup row after tiles added or removed from the row
     *
     * @id jQuery.mosaicCleanupRow
     * @return {Object} jQuery object
     */
    $.fn.mosaicCleanupRow = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get original row
            var original_row = $(this);

            // Remove empty columns
            original_row.children(".mosaic-grid-cell").each(function () {
                if ($(this).children().length === 0) {
                    $(this).remove();

                    // Resize columns
                    original_row.mosaicSetColumnSizes();
                }
            });

            // Remove row if no tiles inside
            if (original_row.find(".mosaic-tile").length === 0) {
                var del_row = original_row;

                // Check if next row available
                if (original_row.nextAll(".mosaic-grid-row").length > 0) {
                    original_row = original_row.next(".mosaic-grid-row");

                // Check if prev row available
                } else if (original_row.prevAll(".mosaic-grid-row").length > 0) {
                    original_row = original_row.prev(".mosaic-grid-row");

                // This is the last row
                } else {
                    original_row.remove();
                    return;
                }

                // Remove current row
                del_row.remove();
            }

            // Check if prev row exists and if both rows only have 1 column
            if ((original_row.prevAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) && (original_row.prev().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").prepend(
                    original_row.prev().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.prev().remove();
            }

            // Check if next row exists and if both rows only have 1 column
            if ((original_row.nextAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) && (original_row.next().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").append(
                    original_row.next().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.next().remove();
            }

            // Set resize handles
            original_row.mosaicSetResizeHandles();
        });
    };

    /**
     * Set the location of the resize handle (left, right or center)
     *
     * @id jQuery.mosaicSetResizeHandleLocation
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetResizeHandleLocation = function () {

        // Get panel
        var obj = $(this);

        // Loop through rows
        obj.children(".mosaic-grid-row").each(function () {

            // Get row
            var row = $(this);

            // Get cells
            var cells = row.children(".mosaic-grid-cell");

            // Check if 2 or 3 columns
            if ((cells.length === 2) || (cells.length === 3)) {

                // Remove location classes
                row.children(".mosaic-resize-handle").removeClass("mosaic-resize-handle-left mosaic-resize-handle-center mosaic-resize-handle-right");

                // Check if first column is selected
                if ($(cells.get(0)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-left");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");

                // Check if second columns is selected
                } else if ($(cells.get(1)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-right");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-left");

                // Check if third column is selected
                } else if (cells.length === 3 && $(cells.get(2)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-right");

                // No tile selected
                } else {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");
                }
            }
        });
    };

    /**
     * Get the config of the tile
     *
     * @id jQuery.mosaicGetTileConfig
     * @return {Object} config of the tile
     */
    $.fn.mosaicGetTileConfig = function () {

        // Get tile type
        var tiletype = '';
        var classes = $(this).attr('class').split(" ");
        $(classes).each(function () {
            var classname = this.match(/^mosaic-(.*)-tile$/);
            if (classname !== null) {
                if ((classname[1] !== 'selected') && (classname[1] !== 'new') && (classname[1] !== 'read-only') && (classname[1] !== 'helper') && (classname[1] !== 'original')) {
                    tiletype = classname[1];
                }
            }
        });

        // Get tile config
        var tile_config;
        for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
            var tile_group = $.mosaic.options.tiles[x];
            for (var y = 0; y < tile_group.tiles.length; y += 1) {
                if (tile_group.tiles[y].name === tiletype) {
                    tile_config = tile_group.tiles[y];
                }
            }
        }

        // Return config
        return tile_config;
    };

    /**
     * Get the direction based on the tile size and relative x and y coords of the cursor
     *
     * @id jQuery.mosaicGetDirection
     * @param {Object} e Event object
     * @return {String} Direction of the cursor relative to the tile
     */
    $.fn.mosaicGetDirection = function (e) {

        // Calculate x, y, width and height
        var width = parseFloat($(this).width());
        var height = parseFloat($(this).height());
        var x = parseFloat((e.pageX - $(this).offset().left) - (width / 2));
        var y = parseFloat((e.pageY - $(this).offset().top) - (height / 2));
        var halfwidth = width / 2;
        var halfheight = height / 2;

        // If left of center
        if (x < 0) {

            // If above center
            if (y < 0) {
                if ((x / y) < ((-1 * halfwidth) / (-1 * halfheight))) {
                    return "top";
                } else {
                    return "left";
                }
            // Below center
            } else {
                if ((x / y) < ((-1 * halfwidth) / (halfheight))) {
                    return "left";
                } else {
                    return "bottom";
                }
            }

        // Right of center
        } else {

            // If above center
            if (y < 0) {
                if ((x / y) < ((1 * halfwidth) / (-1 * halfheight))) {
                    return "right";
                } else {
                    return "top";
                }
            // Below center
            } else {
                if ((x / y) < ((halfwidth) / (halfheight))) {
                    return "bottom";
                } else {
                    return "right";
                }
            }
        }
    };

    /**
     * Disable edit html source
     *
     * @id jQuery.mosaic.disableEditHtmlSource
     */
    $.mosaic.disableEditHtmlSource = function () {

        // Find rich text textareas
        $(".mosaic-rich-text-textarea", $.mosaic.document).each(function () {

            // Local variables
            var tilecontent, text;

            // Get text and tilecontent
            text = $(this).val();
            tilecontent = $(this).parent();
            tilecontent
                .html(text)
                .mosaicEditor();
        });
    };


    /**
     * Add an apptile with the given value
     *
     * @id jQuery.mosaic.addAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.addAppTile = function (type, url, id) {

        // Close overlay
        $.mosaic.overlay.hide();
        // $.mosaic.overlay.trigger('destroy.modal.patterns');

        // Get value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Add tile
                $.mosaic.addTile(type,
                    '<p class="hiddenStructure tileUrl">' + url + '</p>' +
                        value.find('.temp_body_tag').html());
            }
        });
    };

    /**
     * Add an apptile with the given value
     *
     * @id jQuery.mosaic.addAppTile
     * @param {String} type Type of the application tile
     * @param {String} response HTML code to show
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.addAppTileHTML = function (type, response, url) {

        // Close overlay
        $.mosaic.overlay.hide();
        $.mosaic.overlay = null;
        value = $.mosaic.getDomTreeFromHtml(response);
        $.mosaic.addHeadTags(url, value);
        $.mosaic.addTile(type,
            '<p class="hiddenStructure tileUrl">' + url + '</p>' +
                value.find('.temp_body_tag').html());
    };


    /**
     * Edit an apptile with the given value
     *
     * @id jQuery.mosaic.editAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.editAppTile = function (url) {

        // Close overlay
        $.mosaic.overlay.close();

        // Focus on current window
        window.parent.focus();

        // Get new value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Remove head tags
                $.mosaic.removeHeadTags(url);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Update tile
                $('.mosaic-selected-tile .mosaic-tile-content',
                  $.mosaic.document).html('<p class="hiddenStructure tileUrl">' + url + '</p>' + value.find('.temp_body_tag').html());
            }
        });
    };

    /**
     * Add a tile with the given value
     *
     * @id jQuery.mosaic.addTile
     * @param {String} type Type of the application tile
     * @param {String} value Value of the application tile
     */
    $.mosaic.addTile = function (type, value) {

        // Set dragging state
        $.mosaic.options.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Add helper
        $($.mosaic.options.panels.get(0)).append(
            $($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-row")
                .append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                    .append($($.mosaic.document.createElement("div"))
                        .addClass("movable removable mosaic-tile mosaic-" + type + "-tile")
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-content")
                            .html(value)
                        )
                        .addClass("mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile")
                    )
                )
        );

        // Set helper min size
        var helper = $.mosaic.options.panels.find(".mosaic-helper-tile-new");

        // Get max width
        var width = 0;
        $.mosaic.options.panels.each(function () {
            if ($(this).width() > width) {
                width = $(this).width();
            }
        });

        // Set width
        if (helper.width() < (width / 4)) {
            helper.width(width / 4);
        } else {
            helper.width(helper.width());
        }
        helper.mosaicInitTile();

        // Notify user
        /*
        $.plone.notify({
            title: "Inserting new tile",
            message: "Select the location for the new tile",
            sticky: false
        });
        */
    };

    /**
     * Get the default value of the given tile
     *
     * @id jQuery.mosaic.getDefaultValue
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.getDefaultValue = function (tile_config) {
        switch (tile_config.tile_type) {
        case "field":
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                return '<div>' + $("#" + tile_config.id, $.mosaic.document).find('input').attr('value') + '</div>';
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
                var lines = $("#" + tile_config.id, $.mosaic.document).find('textarea').attr('value').split('\n');
                var return_string = "";
                for (var i = 0; i < lines.length; i += 1) {
                    return_string += '<div>' + lines[i] + '</div>';
                }
                return return_string;
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                return $("#" + tile_config.id, $.mosaic.document).find('textarea').attr('value');
            default:
                return '<div class="discreet">Placeholder for field:<br/><b>' + tile_config.label + '</b></div>';
            }
            break;
        default:
            return tile_config.default_value;
        }
    };

    /**
     * Save the tile value to the form
     *
     * @id jQuery.mosaic.saveTileValueToForm
     * @param {String} tiletype Type of the tile
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.saveTileValueToForm = function (tiletype, tile_config) {

        // Update field values if type is rich text
        if (tile_config && tile_config.tile_type === 'field' &&
            tile_config.read_only === false &&
            (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
             tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget')) {
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                $("#" + tile_config.id).find('input').attr('value', $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').html());
                break;
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
                var value = "";
                $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').each(function () {
                    value += $(this).html() + "\n";
                });
                value = value.replace(/<br[^>]*>/ig, "\n");
                $("#" + tile_config.id).find('textarea').attr('value', value);
                break;
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                $(document.getElementById(tile_config.id)).find('textarea').attr('value', $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content').html());
                break;
            }
        }
    };

    /**
     * Get the content of the page which can be saved
     *
     * @id jQuery.mosaic.getPageContent
     * @return {String} Full content of the page
     */
    $.mosaic.getPageContent = function () {

        // Content
        var content,
            body = "",
            tilecount = 0,
            panel_id = "";

        // Disable edit html source
        $.mosaic.disableEditHtmlSource();

        // Add body tag
        body += "  <body>\n";

        // Loop through panels
        $("[data-panel]", $.mosaic.document).each(function () {

            // Add open panel tag
            panel_id = $(this).attr("data-panel");
            body += '    <div data-panel="' + panel_id + '">\n';

            // Loop through rows
            $(this).children(".mosaic-grid-row").each(function () {

                // Check if not an empty row
                if ($(this).hasClass("mosaic-empty-row") === false) {

                    // Add row open tag
                    body += '      <div class="mosaic-grid-row">\n';

                    // Loop through rows
                    $(this).children(".mosaic-grid-cell").each(function () {

                        // Add cell start tag
                        body += '        <div class="' +
                            $(this).attr("class") + '">\n';

                        // Loop through tiles
                        $(this).children(".mosaic-tile").each(function () {

                            // Get tile type
                            var tiletype = '',
                                classes = $(this).attr('class').split(" ");
                            $(classes).each(function () {
                                var classname = this.match(/^mosaic-(.*)-tile$/);
                                if (classname !== null) {
                                    if ((classname[1] !== 'selected') && (classname[1] !== 'new') && (classname[1] !== 'read-only') && (classname[1] !== 'helper') && (classname[1] !== 'original')) {
                                        tiletype = classname[1];
                                    }
                                }
                            });

                            // Get tile config
                            var tile_config;
                            for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                                var tile_group = $.mosaic.options.tiles[x];
                                for (var y = 0; y < tile_group.tiles.length; y += 1) {
                                    if (tile_group.tiles[y].name === tiletype) {
                                        tile_config = tile_group.tiles[y];
                                    }
                                }
                            }

                            // Predefine vars
                            var tile_url;

                            switch (tile_config.tile_type) {
                            case "text":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';
                                body += $(this).children(".mosaic-tile-content").html();
                                body += '          </div>\n';
                                body += '          </div>\n';
                                break;
                            case "app":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Get url
                                tile_url = $(this).find('.tileUrl').html();
                                if (tile_url === null) {
                                    break;
                                }
                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';

                                // Save title and description
                                if (tile_config.name === 'plone.app.standardtiles.title') {
                                    $('.mosaic-plone\\.app\\.standardtiles\\.title-tile .mosaic-tile-content .hiddenStructure', $.mosaic.document).remove();
                                    $("#formfield-form-widgets-IDublinCore-title").find('input').attr('value', $.trim($('.mosaic-plone\\.app\\.standardtiles\\.title-tile .mosaic-tile-content', $.mosaic.document).text()));
                                }
                                if (tile_config.name === 'plone.app.standardtiles.description') {
                                    $('.mosaic-plone\\.app\\.standardtiles\\.description-tile .mosaic-tile-content .hiddenStructure', $.mosaic.document).remove();
                                    $("#formfield-form-widgets-IDublinCore-description").find('textarea').attr('value', $.trim($('.mosaic-plone\\.app\\.standardtiles\\.description-tile .mosaic-tile-content', $.mosaic.document).text()));
                                }

                                break;
                            case "field":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Calc url
                                tile_url = './@@plone.app.standardtiles.field?field=' + tiletype;

                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';

                                // Update field values if type is rich text
                                $.mosaic.saveTileValueToForm(tiletype, tile_config);
                                break;
                            }
                        });

                        // Add cell end tag
                        body += '        </div>\n';
                    });

                    // Add row close tag
                    body += '      </div>\n';
                }
            });

            // Add close panel tag
            body += '    </div>\n';
        });

        // Add close tag
        body += "  </body>\n";

        content = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="' + $.mosaic.options.layout + '">\n';
        content += body;
        content += '</html>\n';
        return content;
    };

    /**
     * Get the name of the width class of the given integer
     *
     * @id GetWidthClassByInt
     * @param {Integer} column_width Percentage of the column width
     * @return {String} Classname of the width class of the given integer
     */
    function GetWidthClassByInt(column_width) {
        switch (column_width) {
        case 25:
            return "mosaic-width-quarter";
        case 33:
            return "mosaic-width-third";
        case 50:
            return "mosaic-width-half";
        case 66:
        case 67:
            return "mosaic-width-two-thirds";
        case 75:
            return "mosaic-width-three-quarters";
        case 100:
            return "mosaic-width-full";
        }

        // Fallback
        return "mosaic-width-full";
    }

    /**
     * Get the name of the position class of the given integer
     *
     * @id GetPositionClassByInt
     * @param {Integer} position Percentage of the column position
     * @return {String} Classname of the position class of the given integer
     */
    function GetPositionClassByInt(position) {
        switch (position) {
        case 0:
            return "mosaic-position-leftmost";
        case 25:
            return "mosaic-position-quarter";
        case 33:
            return "mosaic-position-third";
        case 50:
            return "mosaic-position-half";
        case 66:
        case 67:
            return "mosaic-position-two-thirds";
        case 75:
            return "mosaic-position-three-quarters";
        }

        // Fallback
        return "mosaic-position-leftmost";
    }

}(jQuery));

define("mosaic.layout", function(){});

/**
 * This plugin is used to display an overlay
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

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the overlay namespace
    $.mosaic.overlay = {
    };

    /**
     * Create a new instance of a mosaic overlay.
     *
     * @constructor
     * @id jQuery.fn.mosaicOverlay
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicOverlay = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get current object
            var obj = $(this);

            // Init overlay
            obj
                .hide()
                .css({
                    'width': '900px',
                    'left': (($(window.parent).width() - 900) / 2)
                })
                .addClass("mosaic-overlay");

            // Add lightbox
            $(document.body, $.mosaic.document)
                .prepend($(document.createElement("div"))
                    .addClass("mosaic-overlay-blocker")
            );
        });
    };

    /**
     * Open the overlay
     *
     * @id jQuery.mosaic.overlay.open
     * @param {String} mode Mode of the overlay
     * @param {Object} tile_config Configuration of the tile
     */
    $.mosaic.overlay.open = function (mode, tile_config) {

        // Local variables
        var form, formtabs, tile_group, x, visible_tabs, offset_top,
            field_tile, field, fieldset;

        // Expand the overlay
        expandMenu();
        $('.overlay').show();

        // Get form
        form = $(".overlay").find("form");

        // Clear actions
        if ($(".mosaic-overlay-ok-button").length === 0) {
            $(".overlay .formControls").children("input").hide();
            $(".overlay .formControls").append(
                $(document.createElement("input")).attr({
                    'type': 'button',
                    'value': 'Ok'
                })
                .addClass('button-field context mosaic-overlay-ok-button')
                .click(function () {
                    $.mosaic.overlay.close();
                })
            );
        }

        if (mode === 'all') {

            // Get form tabs
            formtabs = form.find(".formTabs");

            // Show form tabs
            form.find(".formTabs").removeClass('mosaic-hidden');

            // Show all fields
            form.find("fieldset").children().removeClass('mosaic-hidden');

            // Hide all fieldsets
            form.find('fieldset').hide();

            // Deselect all tabs
            formtabs.find('a').removeClass('selected');

            // Remove first and last tab
            formtabs.children('.firstFormTab').removeClass('firstFormTab');
            formtabs.children('.lastFormTab').removeClass('lastFormTab');

            // Hide layout field
            form.find('#formfield-form-widgets-ILayoutAware-content')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-ILayoutAware-pageSiteLayout')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-ILayoutAware-sectionSiteLayout')
                .addClass('mosaic-hidden');

            // Hide title and description
            form.find('#formfield-form-widgets-IDublinCore-title')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-IDublinCore-description')
                .addClass('mosaic-hidden');

            // Hide field which are on the wysiwyg area
            for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                if ($.mosaic.options.tiles[x].name === 'fields') {
                    tile_group = $.mosaic.options.tiles[x];
                }
            }
            for (x = 0; x < tile_group.tiles.length; x += 1) {
                field_tile = tile_group.tiles[x];
                if ($.mosaic.options.panels
                    .find(".mosaic-" + field_tile.name + "-tile")
                        .length !== 0) {
                    $($.mosaic.document.getElementById(field_tile.id))
                        .addClass('mosaic-hidden');
                }
            }

            // Hide tab if fieldset has no visible items
            form.find("fieldset").each(function () {
                if ($(this).children("div:not(.mosaic-hidden)").length === 0) {
                    $('a[href=#fieldsetlegend-' +
                        $(this).attr('id').split('-')[1] + ']')
                        .parent().addClass('mosaic-hidden');
                }
            });

            // Get visible tabs
            visible_tabs = formtabs.children(':not(.mosaic-hidden)');

            // Add first and last form tab
            visible_tabs.eq(0).addClass('firstFormTab');
            visible_tabs.eq(visible_tabs.length - 1).addClass('lastFormTab');

            // Select first tab
            visible_tabs.eq(0).children('a').addClass('selected');
            form.find('#fieldset-' +
                visible_tabs.eq(0).children('a').attr('href').split('-')[1])
                .show();

        } else if (mode === 'field') {

            // Get fieldset and field
            field = $("#" + tile_config.id);
            fieldset = field.parents("fieldset");

            // Hide all fieldsets
            form.find('fieldset').hide();

            // Show current fieldset
            fieldset.show();

            // Hide all fields in current fieldset
            fieldset.children().addClass('mosaic-hidden');

            // Show current field
            field.removeClass('mosaic-hidden');

            // Hide form tabs
            form.find(".formTabs").addClass('mosaic-hidden');
        }
    };

    /**
     * Close the overlay
     *
     * @id jQuery.mosaic.overlay.close
     */
    $.mosaic.overlay.close = function () {

        // Check if iframe is open
        if ($(".mosaic-iframe-overlay", $.mosaic.document).length !== 0) {
            $(".mosaic-iframe-overlay", $.mosaic.document).remove();
        } else {
            // Expand the overlay
            $('.overlay').hide();
            forceContractMenu();
        }
    };

    /**
     * Open an iframe overlay
     *
     * @id jQuery.mosaic.overlay.openIframe
     * @param {String} url of the iframe
     */
    $.mosaic.overlay.openIframe = function (url) {

        $(".mosaic-overlay-blocker", $.mosaic.document).show();

        $($.mosaic.document.body).append(
            $($.mosaic.document.createElement("iframe"))
                .css({
                    'position': 'absolute',
                    'width': '900px',
                    'height': '450px',
                    'top': '130px',
                    'z-index': '3000',
                    'left': (($(window.parent).width() - 900) / 2),
                    'border': '0px'
                })
                .attr({
                    'src': url
                })
                .addClass("mosaic-iframe-overlay")
        );
    };
}(jQuery));

define("mosaic.overlay", function(){});

/**
 * This plugin is used to trigger the editing of tiles in an overlay
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

(function ($) {
    

    // Init on load
    $(window).load(function () {

        // Check if tiledata is available and valid
        if (typeof(tiledata) !== 'undefined') {

            // Check action
            if (tiledata.action === 'cancel') {

                // Close overlay
                $.mosaic.overlay.close();

            } else if (tiledata.action === 'save') {

                // Check mode
                if (tiledata.mode === 'add') {

                    // Check url
                    if (typeof(tiledata.url) !== 'undefined') {

                        // Insert app tile
                        $.mosaic.addAppTile(tiledata.tile_type,
                            tiledata.url, tiledata.id);
                    }
                } else {

                    // Update app tile
                    $.mosaic.editAppTile(tiledata.url);
                }
            }
        }
    });

}(jQuery));


define("mosaic.overlaytriggers", function(){});

/**
 * This plugin is used to create a mosaic toolbar.
 *
 * @author Rob Gietema
 * @version 0.1
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
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    /**
     * Adds a control to the toolbar
     *
     * @id AddControl
     * @param {Object} parent Parent object to append control to
     * @param {Object} action Object of the action
     */
    function AddControl(parent, action) {

        // Check if button or menu
        if ((typeof (action.menu) !== undefined) && (action.menu)) {

            // Check if icon menu
            if (action.icon) {

                // Create menu
                parent.append($(document.createElement("label"))
                    .addClass("mosaic-icon-menu mosaic-icon-menu-" +
                              action.name.replace(/_/g, "-") + ' mosaic-icon')
                    .html(action.label)
                    .attr("title", action.label)
                    .append($(document.createElement("select"))
                        .addClass("mosaic-menu-" +
                                  action.name.replace(/_/g, "-"))
                        .data("action", action.action)
                        .change(function () {
                            $(this).mosaicExecAction();
                        })
                        .each(function () {

                            // Local variables
                            var z, elm, y;

                            for (z in action.items) {

                                // Check if child objects
                                if (action.items[z].items !== undefined) {
                                    $(this).append($(document.createElement("optgroup"))
                                        .addClass("mosaic-option-group mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"))
                                        .attr("label", action.items[z].label)
                                    );
                                    elm = $(this).find(".mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"));

                                    // Add child nodes
                                    for (y in action.items[z].items) {
                                        elm.append(
                                            $(document.createElement("option"))
                                                .attr('value', action.items[z].items[y].value)
                                                .addClass('mosaic-option mosaic-option-' + action.items[z].items[y].value.replace(/\//g, "-"))
                                                .html(action.items[z].items[y].label)
                                        );
                                    }

                                // Else no child objects
                                } else {
                                    $(this).append(
                                        $(document.createElement("option"))
                                            .attr('value', action.items[z].value)
                                            .addClass('mosaic-option mosaic-option-' + action.items[z].value.replace(/\//g, "-"))
                                            .html(action.items[z].label)
                                    );
                                }
                            }
                        })
                    )
                );

            // Else text menu
            } else {

                // Create menu
                parent.append($(document.createElement("select"))
                    .addClass("mosaic-menu mosaic-menu-" +
                              action.name.replace(/_/g, "-"))
                    .data("action", action.action)
                    .change(function () {
                        $(this).mosaicExecAction();
                    })
                    .each(function () {

                        // Local variables
                        var z, elm, y;
                        for (z = 0; z < action.items.length; z += 1) {

                            // Check if child objects
                            if (action.items[z].items !== undefined) {
                                $(this).append($(document.createElement("optgroup"))
                                    .addClass("mosaic-option-group mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"))
                                    .attr("label", action.items[z].label)
                                );
                                elm = $(this).find(".mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"));

                                // Add child nodes
                                for (y in action.items[z].items) {
                                    elm.append(
                                        $(document.createElement("option"))
                                            .attr('value', action.items[z].items[y].value)
                                            .addClass('mosaic-option mosaic-option-' + action.items[z].items[y].value.replace(/\//g, "-"))
                                            .html(action.items[z].items[y].label)
                                    );
                                }

                            // Else no child objects
                            } else {
                                $(this).append(
                                    $(document.createElement("option"))
                                        .attr('value', action.items[z].value)
                                        .addClass('mosaic-option mosaic-option-' + action.items[z].value.replace(/\//g, "-"))
                                        .html(action.items[z].label)
                                );
                            }
                        }
                    })
                );
            }

        } else {

            // Create button
            parent.append($(document.createElement("button"))
                .addClass("mosaic-button mosaic-button-" + action.name.replace(/_/g, "-") + (action.icon ? ' mosaic-icon' : ''))
                .html(action.label)
                .attr("title", action.label)
                .attr("type", "button")
                .data("action", action.action)
                .mousedown(function () {
                    $(this).mosaicExecAction();
                })
            );
        }
    }

    /**
     * Create a new instance of a mosaic toolbar.
     *
     * @constructor
     * @id jQuery.fn.mosaicToolbar
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicToolbar = function () {

        // Loop through matched elements
        return this.each(function () {

            // Local variables
            var obj, content, actions, a, x, action_group, elm_action_group, y,
            elm_select_insert, tile, elm_select_format, action,
            RepositionToolbar, SelectedTileChange;

            // Get current object
            obj = $(this);

            // Empty object
            obj.html("");

            // Add mosaic toolbar class
            obj.append($(document.createElement("div"))
                .addClass("mosaic-inline-toolbar")
            );
            obj = obj.children(".mosaic-inline-toolbar");

            // Add content
            obj.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-content")
            );
            content = obj.children(".mosaic-toolbar-content");

            // Add primary and secondary function div's
            actions = {};
            content.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-primary-functions")
            );
            actions.primary_actions =
                content.children(".mosaic-toolbar-primary-functions");
            content.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-secondary-functions")
            );
            actions.secondary_actions =
                content.children(".mosaic-toolbar-secondary-functions");

            // Loop through action groups
            for (a in actions) {

                // Add actions to toolbar
                for (x = 0; x < $.mosaic.options[a].length; x += 1) {

                    // If single action
                    if ($.mosaic.options[a][x].actions === undefined) {

                        // Add control
                        AddControl(actions[a], $.mosaic.options[a][x]);

                    // If fieldset
                    } else {
                        action_group = $.mosaic.options[a][x];
                        actions[a].append($(document.createElement("fieldset"))
                            .addClass("mosaic-button-group mosaic-button-group-" +
                                $.mosaic.options[a][x].name.replace(/_/g, "-"))
                        );
                        elm_action_group = actions[a]
                            .children(".mosaic-button-group-" +
                            $.mosaic.options[a][x].name.replace(/_/g, "-"));
                        for (y = 0; y < action_group.actions.length; y += 1) {

                            // Add control
                            AddControl(elm_action_group,
                                       action_group.actions[y]);
                        }
                    }
                }
            }

            // Add formats to toolbar
            if ($.mosaic.options.formats !== undefined) {
                for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
                    action_group = $.mosaic.options.formats[x];
                    actions.primary_actions.append(
                        $(document.createElement("fieldset"))
                            .addClass(
                                  "mosaic-button-group mosaic-button-group-" +
                                  action_group.name.replace(/_/g, "-"))
                    );
                    elm_action_group = actions.primary_actions.children(
                        ".mosaic-button-group-" +
                        action_group.name.replace(/_/g, "-"));
                    for (y = 0; y < action_group.actions.length; y += 1) {
                        if (action_group.actions[y].favorite) {

                            // Add control
                            AddControl(elm_action_group,
                                       action_group.actions[y]);
                        }
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Add items to the insert menu
            if ($.mosaic.options.tiles !== undefined) {
                elm_select_insert = actions.secondary_actions.find(
                    ".mosaic-menu-insert");
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    action_group = $.mosaic.options.tiles[x];
                    elm_select_insert.append($(document.createElement("optgroup"))
                        .addClass("mosaic-option-group mosaic-option-group-" + action_group.name.replace(/_/g, "-"))
                        .attr("label", action_group.label)
                    );
                    elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + action_group.name.replace(/_/g, "-"));
                    for (y = 0; y < action_group.tiles.length; y += 1) {
                        tile = action_group.tiles[y];
                        elm_action_group.append($(document.createElement("option"))
                            .addClass("mosaic-option mosaic-option-" + tile.name.replace(/_/g, "-"))
                            .attr("value", tile.name)
                            .html(tile.label)
                        );
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Add items to the format menu
            if ($.mosaic.options.formats !== undefined) {
                elm_select_format = actions.secondary_actions.find(".mosaic-menu-format");
                for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
                    action_group = $.mosaic.options.formats[x];
                    elm_select_format.append($(document.createElement("optgroup"))
                        .addClass("mosaic-option-group mosaic-option-group-" + action_group.name.replace(/_/g, "-"))
                        .attr("label", action_group.label)
                    );
                    elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + action_group.name.replace(/_/g, "-"));
                    for (y = 0; y <  action_group.actions.length; y += 1) {
                        action = action_group.actions[y];
                        if (action.favorite === false) {
                            elm_action_group.append($(document.createElement("option"))
                                .addClass("mosaic-option mosaic-option-" + action.name.replace(/_/g, "-"))
                                .attr("value", action.name)
                                .html(action.label)
                                .data("action", action.action)
                            );
                        }
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Reposition toolbar on scroll
            RepositionToolbar = function () {

                // Local variables
                var left;

                if (parseInt($(window).scrollTop(), 10) >
                    parseInt(obj.parent().offset().top, 10)) {
                    if (obj.hasClass("mosaic-inline-toolbar")) {
                        left = obj.offset().left;

                        obj
                            .width(obj.width())
                            .css({
                                'left': left,
                                'margin-left': '0px'
                            })
                            .removeClass("mosaic-inline-toolbar")
                            .addClass("mosaic-external-toolbar")
                            .parent().height(obj.height());
                    }
                } else {
                    if (obj.hasClass("mosaic-external-toolbar")) {
                        obj
                            .css({
                                'width': '',
                                'left': '',
                                'margin-left': ''
                            })
                            .removeClass("mosaic-external-toolbar")
                            .addClass("mosaic-inline-toolbar")
                            .parent().css('height', '');
                    }
                }
            };

            // Bind method and add to array
            $(window).bind('scroll', RepositionToolbar);

            // Bind selected tile change event
            SelectedTileChange = function () {

                // Local variables
                var obj, tiletype, selected_tile, classes, actions, x,
                tile_group, y;

                // Disable edit html source
                $.mosaic.disableEditHtmlSource();

                // Get object
                obj = $(this);

                // Get selected tile and tiletype
                tiletype = "";
                selected_tile = $(".mosaic-selected-tile", $.mosaic.document);
                if (selected_tile.length > 0) {
                    classes = selected_tile.attr('class').split(" ");
                    $(classes).each(function () {
                        var classname = this.match(/^mosaic-(.*)-tile$/);
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
                }

                // Get actions
                actions = $.mosaic.options.default_available_actions;
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    tile_group = $.mosaic.options.tiles[x];
                    for (y = 0; y <  tile_group.tiles.length; y += 1) {
                        if (tile_group.tiles[y].name === tiletype) {
                            actions = actions
                                .concat(tile_group.tiles[y].available_actions);
                        }
                    }
                }

                // Show option groups
                obj.find(".mosaic-option-group").show();

                // Hide all actions
                obj.find(".mosaic-button").hide();
                obj.find(".mosaic-menu").hide();
                obj.find(".mosaic-icon-menu").hide();
                obj.find(".mosaic-menu-format").find(".mosaic-option")
                    .hide()
                    .attr("disabled", "disabled");
                $(obj.find(".mosaic-menu-format")
                    .find(".mosaic-option").get(0))
                    .show()
                    .removeAttr("disabled");

                // Show actions
                $(actions).each(function (i, val) {
                    obj.find(".mosaic-button-" + val).show();
                    obj.find(".mosaic-icon-menu-" + val).show();
                    obj.find(".mosaic-menu-" + val).show();
                    obj.find(".mosaic-option-" + val)
                        .show()
                        .removeAttr("disabled");
                });

                // Set available fields
                obj.find(".mosaic-menu-insert")
                    .children(".mosaic-option-group-fields")
                    .children().each(function () {
                    if ($.mosaic.options.panels
                        .find(".mosaic-" + $(this).attr("value") + "-tile")
                        .length === 0) {
                        $(this).show().removeAttr("disabled");
                    } else {
                        $(this).hide().attr("disabled", "disabled");
                    }
                });

                // Hide option group if no visible items
                obj.find(".mosaic-option-group").each(function () {
                    if ($(this).children(":enabled").length === 0) {
                        $(this).hide();
                    }
                });

                // Hide menu if no enabled items
                $(".mosaic-menu, .mosaic-icon-menu",
                  $.mosaic.document).each(function () {
                    if ($(this).find(".mosaic-option:enabled").length === 1) {
                        $(this).hide();
                    }
                });
            };

            // Bind method and add to array
            $(this).bind("selectedtilechange", SelectedTileChange);

            // Set default actions
            $(this).trigger("selectedtilechange");
        });
    };
}(jQuery));

define("mosaic.toolbar", function(){});

/**
 * This plugin is used to create the mosaic undo stack, and enable
 * undo/redo actions. The JS defines two classes, one for internal use
 * ($.mosaic.undo.Stack) and the public one $.mosaic.unto.UndoManager. The
 * latter needs to be initialized (form the mosaic core), using:
 *  - stack size (max undo history)
 *  - reference to a handler that is called with the state as argument on undo/redo
 *  - current state (optional)
 *
 * The state can be anyting, but a feasible use is a DOM snippet as
 * state, that can be re-applied to an element on undo/redo.  Check
 * out plone.app.mosaic/plone/app/mosaic/tests/javascipts/test_undo.html
 * for an example wiring.
 *
 * Currently for mosaic the 'public' methods of the module are 'init',
 * 'undo', 'redo', 'hasInitial' and 'snapshot'. The undo manager
 * always needs an intial state (to be able to redo the undo...). A
 * state can be added with the jQuery.mosaic.undo.snapshot
 * method. Always take the snapshot AFTER the change in the DOM.
 *
 * @author D.A.Dokter
 * @version 0.1
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
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Declare mosaic.undo namespace
    $.mosaic.undo = function () {};

    /**
     * Initialize undo manager.
     * @id jQuery.mosaic.undo.init
     */
    $.mosaic.undo.init = function () {

        function handler(state) {

            for (var i = 0; i < state.length; i += 1) {
                $("#" + state[i].target, $.mosaic.document)
                    .html(state[i].source);
            }
        }

        $.mosaic.undo.undoManager =  new $.mosaic.undo.UndoManager(10, handler);
    };


    /**
     * Create a snapshot of the current situation, and add it to the
     * undo manager.
     * @id jQuery.mosaic.undo.snapshot
     */
    $.mosaic.undo.snapshot = function () {
        var state = [];
        $(".mosaic-panel", $.mosaic.document).each(function () {
            state.push({"target": $(this).attr("id"),
                        "source": $(this).html()});
        });
        if (typeof($.mosaic.undo.undoManager) === "undefined") {
            $.mosaic.undo.init();
        }

        $.mosaic.undo.undoManager.add(state);
    };


    /**
     *
     */
    $.mosaic.undo.hasInitial = function () {
        if ($.mosaic.undo.undoManager.stack.size() > 0) {
            return true;
        } else {
            return false;
        }
    };


    /**
     * Undo.
     * @id jQuery.mosaic.undo.undo
     */
    $.mosaic.undo.undo = function () {
        $.mosaic.undo.undoManager.undo();
    };


    /**
     * Redo.
     * @id jQuery.mosaic.undo.redo
     */
    $.mosaic.undo.redo = function () {
        $.mosaic.undo.undoManager.redo();
    };


    /**
     * Stack constructor, taking optional size parameter.
     * @id jQuery.mosaic.undo.Stack
     * @param {Integer} stackSize Maximum number of items on the stack.
     */
    $.mosaic.undo.Stack = function (stackSize) {
        if (typeof(stackSize) === "undefined") {
            this.maxsize = 10;
        } else {
            this.maxsize = stackSize;
        }

        this.stack = [];
    };

    /**
     * Return current stack size.
     * @id jQuery.mosaic.undo.Stack.size
     */
    $.mosaic.undo.Stack.prototype.size  = function () {
        return this.stack.length;
    };

    /**
     * FIFO stack push, that removes object at other end if the stack
     * grows bigger than the size set.
     * @id jQuery.mosaic.undo.Stack.add
     * @param {Object} obj Object to push onto the stack.
     */
    $.mosaic.undo.Stack.prototype.add = function (obj) {

        if (this.stack.length >= this.maxsize) {
            this.stack.pop();
        }

        this.stack.unshift(obj);
    };

    /**
     * Get the object at the given index. Note that new states (added
     * through jQuery.mosaic.undo.Stack.add) are added (using shift) at index 0.
     * @id jQuery.mosaic.undo.Stack.get
     */
    $.mosaic.undo.Stack.prototype.get = function (i) {
        return this.stack[i];
    };

    /**
     * Undo manager, handling calls to undo/redo. This implementation
     * uses full DOM snippets.
     * @id jQuery.mosaic.undo.UndoManager
     * @param {Integer} stackSize max undo history
     * @param {Function} handler for undo/redo, taking state as argument
     * @param {Object} currentState Current state
     */
    $.mosaic.undo.UndoManager = function (stackSize, handler, currentState) {

        this.stack = new $.mosaic.undo.Stack(stackSize);
        this.pointer = 0;
        this.handler = handler;
        if (typeof(currentState) !== "undefined") {
            this.stack.add(currentState);
        }
    };

    /**
     * Add state to manager.
     * @id jQuery.mosaic.undo.UndoManager.add
     * @param {Object} state State to add.
     */
    $.mosaic.undo.UndoManager.prototype.add = function (state) {

        this.stack.add(state);
    };

    /**
     * Undo last action, by restoring last state.
     * @id jQuery.mosaic.undo.UndoManager.undo
     */
    $.mosaic.undo.UndoManager.prototype.undo = function  () {

        var state = this.stack.get(this.pointer + 1);

        if (state) {
            this.handler(state);
            this.pointer += 1;
        } else {
          // Alert there's no (more) states.
        }
    };

    /**
     * Redo last action, by calling handler with previous state.
     * @id jQuery.mosaic.undo.UndoManager.redo
     */
    $.mosaic.undo.UndoManager.prototype.redo = function () {

        var state = this.stack.get(this.pointer - 1);

        if (state) {
            this.handler(state);
            this.pointer -= 1;
        } else {
            // Alert there's no (more) states.
        }
    };

}(jQuery));

define("mosaic.undo", function(){});

/**
 * This plugin is used to upload files and images.
 *
 * @author Rob Gietema
 * @version 0.1
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
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    /**
     * Initialize the upload module
     *
     * @id jQuery.mosaic.initUpload
     */
    $.mosaic.initUpload = function () {

        // Bind dragover
        $(".mosaic-panel", $.mosaic.document).bind("dragover", function (e) {

            // Check if drag not already loaded
            if ($(".mosaic-panel-dragging", $.mosaic.document).length === 0) {

                // Deselect tiles
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Add dummy tile
                $.mosaic.addTile('image', '<img src="++resource++plone.app.' +
                    'mosaic.images/files.png" border="0" />');
            }
        });

        document.addEventListener(
            "drop",
            function (event) {
                // Local variables
                var dt, first, i, files, newtile, file, img, tile, xhr,
                    boundary, data;

                dt = event.dataTransfer;
                files = dt.files;

                // Prevent default actions
                event.stopPropagation();
                event.preventDefault();

                // Drop tile
                $($.mosaic.document).trigger("mousedown");

                // Check filetypes
                first = true;
                for (i = 0; i < files.length; i += 1) {

                    // Get file
                    file = files.item(i);

                    // Check if supported mimetype
                    if (file.mediaType.indexOf('image') === 0) {

                        // Check if first
                        if (first) {

                            // Set image and tile
                            img = $(".mosaic-selected-tile", $.mosaic.document)
                                .children(".mosaic-tile-content")
                                .children("img");
                            tile = $(".mosaic-selected-tile",
                                     $.mosaic.document);

                            // Set first to false
                            first = false;

                        // Not the first
                        } else {

                            // Create new tile
                            newtile = $($.mosaic.document.createElement("div"))
                                .addClass("movable removable mosaic-tile " +
                                          "mosaic-image-tile")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-tile-content")
                                    .append(
                                        $($.mosaic.document.createElement("img"))
                                            .attr("border", 0)
                                    )
                                );

                            // Insert new tile
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .after(newtile);
                            newtile.mosaicInitTile();
                            newtile.mosaicAddDrag();

                            // Get image object
                            img = newtile.children(".mosaic-tile-content")
                                .children("img");
                            tile = newtile;
                        }

                        // Setup progress div
                        tile.append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-uploadprogress")
                        );

                        // Set image values
                        img.get(0).src = file.getAsDataURL();

                        // Create new ajax request
                        xhr = new XMLHttpRequest();

                        // Set progress handler
                        xhr.upload.log = img;
                        /*
                        xhr.upload.addEventListener("progress",
                            function (event) {
                            if (event.lengthComputable) {
                                var percentage = Math.round((event.loaded *
                                    100) / event.total);
                                if (percentage < 100) {
                                    // console.log(percentage);
                                }
                            }
                        }
                        , false);
                        */

                        // Added load handler
                        xhr.addEventListener("load", function (event) {

                            // Get response
                            var response = eval('(' +
                                event.target.responseText + ')');

                            // Check if error
                            if (response.status === 1) {

                                // Raise error
                                $.plone.notify({
                                    type: "error",
                                    title: "Error",
                                    message: response.message,
                                    sticky: true
                                });

                            // No error
                            } else {

                                // Set url and alt and fadein
                                $(event.target.upload.log).attr({
                                    'src': response.url,
                                    'alt': response.title
                                })
                                .parents(".mosaic-tile")
                                    .children(".mosaic-tile-uploadprogress")
                                    .fadeOut("slow", function () {
                                        $(this).remove();
                                    });
                            }
                        }, false);

                        // Set error handler
                        xhr.upload.addEventListener("error", function (error) {
                            $.plone.notify({
                                type: "error",
                                title: "Error",
                                message: "Error uploading file: " + error,
                                sticky: true
                            });
                        }, false);

                        // Set boundary
                        boundary = "AJAX---------------------------AJAX";

                        // Open xhr and set content type
                        xhr.open("POST", $.mosaic.options.url + "/@@mosaic-upload",
                            true);
                        xhr.setRequestHeader('Content-Type',
                            'multipart/form-data; boundary=' + boundary);

                        // Add start boundary
                        data = "--" + boundary + "\r\n";

                        // Add file
                        data += 'Content-Disposition: form-data; ';
                        data += 'name="uploadfile"; ';
                        data += 'filename="' + file.fileName + '"' + "\r\n";
                        data += "Content-Type: " + file.mediaType;
                        data += "\r\n\r\n";
                        data += file.getAsBinary() + "\r\n";

                        // Add end boundary
                        data += "--" + boundary + "--" + "\r\n";

                        // Sent data
                        xhr.sendAsBinary(data);
                    } else {

                        // Notify unsupported
                        $.plone.notify({
                            type: "warning",
                            title: "Warning",
                            message: "The filetype of file " + file.fileName +
                                " is unsupported",
                            sticky: true
                        });
                    }
                }

                // Remove tile if no supported filetypes
                if (first) {
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .find(".mosaic-close-icon")
                        .trigger("click");
                }
            },
            false
        );
    };
}(jQuery));

define("mosaic.upload", function(){});



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
  'jquery',
  'mockup-registry',
  'mockup-patterns-base',
  'mosaic.core',
  'mosaic.overlay',
  'mosaic.layout',
  'mosaic.toolbar',
  'mosaic.actions',
  'mosaic.upload',
  'mosaic.editor',
  'mosaic.undo',
  'mosaic.overlaytriggers'
], function($, Registry, Base) {
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
  if (window.parent === window) {
    $(document).ready(function() {
      $('body').addClass('pat-test');
      Registry.scan($('body'));
    });
  }

  return Layout;

});
