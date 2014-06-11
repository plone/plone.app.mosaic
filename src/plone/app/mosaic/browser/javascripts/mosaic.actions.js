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
"use strict";

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
                $.mosaic.overlay.openIframe($.mosaic.options.parent +
                    '@@add-tile?form.button.Create=Create');
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
                    $.mosaic.overlay.openIframe($.mosaic.options.parent +
                        '@@add-tile?type=' + $(source).val() +
                        '&form.button.Create=Create');

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
