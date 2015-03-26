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

define([
    'jquery',
    'mosaic.layout'
], function($) {
    'use strict';

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
                    .addClass("mosaic-menu pat-select2 mosaic-menu-" +
                              action.name.replace(/_/g, "-"))
                    .data("pat-select2", "width: 10em; minimumResultsForSearch: 99;")
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
});