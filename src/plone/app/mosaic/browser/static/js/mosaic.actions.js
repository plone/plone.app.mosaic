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

define([
    'jquery',
    'mockup-patterns-modal'
], function($, modal) {
    'use strict';

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
     * Build mosaic-prefixed class name so that 'foo-bar' becomes
     * 'mosaic-foo-bar' and 'fooBar' becomes 'mosaicFooBar'.
     *
     * @id jQuery.mosaic.getPrefixedClassName
     * @name {String} class name
     * @return {String} class name
     */
    $.mosaic.getPrefixedClassName = function (name) {
        if (name.indexOf('-') > -1) {
            // dash-spaced-class-name
            return 'mosaic-' + name;
        } else {
            // camelCaseClassName
            return 'mosaic' + name.charAt(0).toUpperCase() + name.slice(1);
        }
    };

    /**
     * Initialize the action manager
     *
     * @id jQuery.mosaic.initActions
     */
    $.mosaic.initActions = function () {

        // Register generic re-usable apply format action
        $.mosaic.registerAction('apply-format', {
            exec: function () {
                if (arguments.length > 0 && arguments[0].value) {
                    $.mosaic.editor.applyFormat(arguments[0].value);
                }
            }
        });

        // Register generic re-usable toggle tile class format action
        $.mosaic.registerAction('tile-toggle-class', {
             exec: function () {
                 var name;
                 if (arguments.length > 0 && arguments[0].value) {
                     name = $.mosaic.getPrefixedClassName(arguments[0].value);
                     $(".mosaic-selected-tile", $.mosaic.document)
                         .toggleClass(name);
                 }
             }
         });

        // Register generic re-usable toggle tile class format action
        $.mosaic.registerAction('tile-remove-format', {
            exec: function () {
                var i, j, group, action, name;
                for (i = 0; i < $.mosaic.options.formats.length; i++) {
                    group = $.mosaic.options.formats[i];
                    for (j = 0; j < group.actions.length; j++) {
                        action = group.actions[j];
                        if (action.category === 'tile') {
                            name = $.mosaic.getPrefixedClassName(action.name);
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .removeClass(name);
                        }
                    }
                }
            }
        });

        // Register generic re-usable toggle row class format action
        $.mosaic.registerAction('row-toggle-class', {
            exec: function () {
                var name;
                if (arguments.length > 0 && arguments[0].value) {
                    name = $.mosaic.getPrefixedClassName(arguments[0].value);
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .parents('.mosaic-grid-row').first()
                        .toggleClass(name);
                }
            }
        });

        // Register generic re-usable toggle row class format action
        $.mosaic.registerAction('row-remove-format', {
            exec: function () {
                var i, j, group, action, name;
                for (i = 0; i < $.mosaic.options.formats.length; i++) {
                    group = $.mosaic.options.formats[i];
                    for (j = 0; j < group.actions.length; j++) {
                        action = group.actions[j];
                        if (action.category === 'row') {
                            name = $.mosaic.getPrefixedClassName(action.name);
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .parents('.mosaic-grid-row').first()
                                .removeClass(name);
                        }
                    }
                }
            }
        });

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
                $("#form-widgets-ILayoutAware-content, " +
                  "[name='form.widgets.ILayoutAware.content']")
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
        $.mosaic.registerAction('properties', {
            exec: function () {
                $.mosaic.overlay.open('all');
            }
        });

        // Register page layout action // XXX: deprecated
        $.mosaic.registerAction('page-layout', {
            exec: function () {
                // Open overlay
                var m = new modal($('.mosaic-original-content'), {
                    'title': 'Layout options',
                    'content': '#fieldset-layout'
                });
                m.on('show', function() {
                    m.$modal
                        .removeClass('mosaic-blur')
                        .find('#formfield-form-widgets-ILayoutAware-content')
                        .remove();
                    m.$el.find('select').each(function() {
                        var val = $(this).val(),
                            id = $(this).attr('id');
                        m.$modal.find('#' + id).val(val);
                    });
                });
                m.on('hide', function() {
                    m.$modal.find('select').each(function() {
                        var val = $(this).val(),
                            id = $(this).attr('id');
                        m.$el.find('#' + id).val(val);
                    });
                });
                m.show();
            }
        });

         // Register add tile action
        $.mosaic.registerAction('add-tile', {
            exec: function () {

                // Open overlay
                var m = new modal($('.mosaic-toolbar'),
                    {ajaxUrl: $.mosaic.options.context_url +
                     '/@@add-tile?form.button.Create=Create'});
                m.show();
            }
        });

        // Register format action
        $.mosaic.registerAction('format', {
            exec: function (source) {

                // Execute the action
                $(source).find("[value=" + $(source).val() + "]")
                    .mosaicExecAction();

                // Reset menu
                $(source).select2("val", "none"); // $(source).val("none");
            }
        });

        // Register page-insert action
        $.mosaic.registerAction('insert', {
            exec: function (source) {

                // Local variables
                var tile_config, tile_group, tile_type, x, y;

                // Check if value selected
                if ($(source).val() === "none") {
                    return false;
                } else {
                    tile_type = $(source).val();
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
                        if (tile_group.tiles[y].name === tile_type) {
                            tile_config = tile_group.tiles[y];
                        }
                    }
                }

                // Create new app tile
                if (tile_config.tile_type === 'app') {
                    // Load add form form selected tiletype
                    $.ajax({
                        type: "GET",
                        url: $.mosaic.options.context_url +
                            '/@@add-tile?tiletype=' + tile_type +
                            '&form.button.Create=Create',
                        success: function(value, xhr) {
                            var $value, action_url, authenticator, modalFunc;

                            // Read form
                            $value = $(value);
                            action_url = $value.find('form').attr('action');
                            authenticator = $value.find('[name="_authenticator"]').val();

                            // Open add form in modal when requires user input
                            modalFunc = function(html) {
                                $.mosaic.overlay.app = new modal($('.mosaic-toolbar'), {
                                    html: html,
                                    loadLinksWithinModal: true
                                });
                                $.mosaic.overlay.app.show();
                                $.mosaic.overlay.app.$el.off('formActionSuccess');
                                $.mosaic.overlay.app.on(
                                    'formActionSuccess',
                                    function (event, response, state, xhr) {
                                        var tileUrl = xhr.getResponseHeader('X-Tile-Url')
                                        if (tileUrl) {
                                            $.mosaic.addAppTileHTML(
                                                tile_type, response, tileUrl);
                                        }
                                        // Close overlay
                                        $.mosaic.overlay.app.hide();
                                        $.mosaic.overlay.app = null;
                                    }
                                );
                            };

                            // Auto-submit add-form when all required fields are filled
                            if ($("form .required", $value).filter(function() {
                                    return $(this).parents(".field").first()
                                                  .find("input, select, textarea")
                                                  .not('[type="hidden"]').last()
                                                  .val().length == 0 }).length > 0) {
                                modalFunc(value);
                            } else if (action_url) {
                                $("form", $value).ajaxSubmit({
                                    type: "POST",
                                    url: action_url,
                                    data: {
                                        'buttons.save': 'Save',
                                        '_authenticator': authenticator
                                    },
                                    success: function(value, state, xhr) {
                                        var tileUrl = xhr.getResponseHeader('X-Tile-Url')
                                        if (tileUrl) {
                                            $.mosaic.addAppTileHTML(
                                                tile_type, value, tileUrl);
                                        } else {
                                            modalFunc(value);
                                        }
                                    }
                                });
                            }
                        }
                    });

                } else {

                    // Add tile
                    $.mosaic.addTile(
                        tile_type, $.mosaic.getDefaultValue(tile_config));
                }

                // Reset menu
                $(source).select2("val", "none"); // $(source).val("none");

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
});
