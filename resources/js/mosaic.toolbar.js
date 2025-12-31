/**
 * This plugin is used to create the mosaic toolbar.
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

define([
    "jquery",
    "pat-registry",
    "mockup-patterns-modal",
], function ($, Registry) {
    "use strict";

    /**
     * Create a new instance of the toolbar.
     *
     * @constructor
     * @id jQuery.fn.mosaicToolbar
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicToolbar = function () {
        // Loop through matched elements
        return this.each(function () {
            // Get current object
            var obj = $(this);

            // Init toolbar
            obj.mosaicInitActions()
                .mosaicCreateToolbar()
                .mosaicBindToolbar();
        });
    };

    /**
     * Initialize the actions
     *
     * @id jQuery.fn.mosaicInitActions
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicInitActions = function () {
        // Loop through matched elements
        return this.each(function () {
            var self = $(this).data("mosaic");

            // Init default actions
            self.actionManager.actions = {
                undo: {
                    name: "undo",
                    label: "Undo",
                    action: function () {
                        self.undo();
                    },
                    icon: false,
                },
                redo: {
                    name: "redo",
                    label: "Redo",
                    action: function () {
                        self.redo();
                    },
                    icon: false,
                },
                page_properties: {
                    name: "properties",
                    label: "Properties",
                    action: function () {
                        self.showProperties();
                    },
                    icon: false,
                },
                add_tile: {
                    name: "add-tile",
                    label: "Add tile",
                    action: function () {
                        self.addNewTile();
                    },
                    icon: false,
                },
                format: {
                    name: "format",
                    label: "Format",
                    action: function () {
                        self.showFormat();
                    },
                    icon: false,
                },
                insert: {
                    name: "insert",
                    label: "Insert",
                    action: function () {
                        self.showInsert();
                    },
                    icon: false,
                },
                save: {
                    name: "save",
                    label: "Save",
                    action: function () {
                        self.saveLayoutToForm();
                        $("#form-widgets-ILayoutAware-content")
                            .closest("form")
                            .submit();
                    },
                    icon: false,
                },
                cancel: {
                    name: "cancel",
                    label: "Cancel",
                    action: function () {
                        if (
                            confirm(
                                "Any unsaved changes will be lost. Are you sure?"
                            )
                        ) {
                            window.location.href =
                                $(".mosaic-toolbar").data("cancel-url");
                        }
                    },
                    icon: false,
                },
            };
        });
    };

    /**
     * Create a new instance of the toolbar.
     *
     * @id jQuery.fn.mosaicCreateToolbar
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicCreateToolbar = function () {
        // Loop through matched elements
        return this.each(function () {
            var self = $(this).data("mosaic");
            var actions = [];
            var primary_actions = [];
            var secondary_actions = [];

            // Check if not empty
            if (self.actionManager.actions.length === 0) {
                return false;
            }

            // Add mosaic toolbar div below content
            $(this).children(".mosaic-toolbar").remove();
            $(this).prepend(
                $(document.createElement("div"))
                    .addClass("mosaic-toolbar")
                    .data("cancel-url", self.options.cancelURL)
            );

            if (
                self.actionManager.actions.length === 0 &&
                self.options.primary_actions.length === 0 &&
                self.options.secondary_actions.length === 0
            ) {
                return;
            }

            // Strong actions
            if (self.options.primary_actions) {
                for (var i = 0; i < self.options.primary_actions.length; i += 1) {
                    primary_actions.push(
                        self.actionManager.actions[
                            self.options.primary_actions[i]
                        ]
                    );
                }
            }

            // Secondary actions
            if (self.options.secondary_actions) {
                for (
                    var i = 0;
                    i < self.options.secondary_actions.length;
                    i += 1
                ) {
                    secondary_actions.push(
                        self.actionManager.actions[
                            self.options.secondary_actions[i]
                        ]
                    );
                }
            }

            actions = primary_actions.concat(secondary_actions);

            if (!actions) {
                return;
            }

            // Add all actions to toolbar
            for (var i = 0; i < actions.length; i += 1) {
                self.addToolbarButton(actions[i]);
            }
        });
    };

    /**
     * Bind the toolbar
     *
     * @id jQuery.fn.mosaicBindToolbar
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicBindToolbar = function () {
        // Loop through matched elements
        return this.each(function () {
            var self = $(this).data("mosaic");

            // Loop through actions
            $(this)
                .find(".mosaic-toolbar")
                .children(".mosaic-button-group")
                .children(".mosaic-button")
                .each(function (i) {
                    // Get shortcut
                    var action = $(this).data("action");

                    // Bind click event
                    $(this)
                        .off("click")
                        .on("click", function () {
                            action();
                        });
                });
        });
    };

    /**
     * Add a button to the toolbar
     *
     * @id jQuery.mosaicToolbar.addToolbarButton
     * @param {Object} action Action to add to the toolbar
     */
    $.mosaic.addToolbarButton = function (action) {
        var self = this;
        var $el = $(document.createElement("button"));
        var a_cname = action.name.replace(/_/g, "-");

        // if there is an fieldset named "secondary_actions" add this action to the end of the
        // secondary_actions button-group, otherwise append to last child
        var last_group = $(
            ".mosaic-toolbar > .mosaic-button-group:last-child"
        );
        var parent = $(
            `.mosaic-button-group-${action.category}`,
            ".mosaic-toolbar"
        );

        if (!parent.length) {
            parent = $(document.createElement("div")).addClass(
                `btn-group btn-group-sm mosaic-button-group mosaic-button-group-${action.category}`
            );
            if (last_group.length) {
                last_group.after(parent);
            } else {
                $(".mosaic-toolbar").append(parent);
            }
        }

        if (action.icon) {
            // If action has icon set, we show the icon. If there is no label
            // set then use the action.name as css class for the icon otherwise
            // just display a icon
            var icon_cname = action.name.replace(/_/g, "-");
            if (action.label === "") {
                $el.append(
                    $(document.createElement("i")).addClass(
                        `mosaic-icon mosaic-icon-${icon_cname}`
                    )
                );
            } else {
                $el.append(
                    $(document.createElement("i")).addClass(
                        `mosaic-icon-before mosaic-icon-${icon_cname}`
                    )
                );
            }
        } else {
            // TODO: We don't have real icons here but text formatted like
            // icons. We should work on a mosaic font with real icons here.
            if (action.label === "") {
                $el.append(
                    $(document.createElement("i")).addClass(
                        `mosaic-icon mosaic-icon-${a_cname}`
                    )
                );
            }
        }

        if (action.category === "primary_actions") {
            // TODO: make this a option: add .addClass("mosaic-btn-primary");
            if (action.name === "save") {
                parent.append(
                    $el
                        .addClass(
                            `btn btn-sm btn-${action.name === 'save' ? 'primary' : 'secondary'} mosaic-button-${a_cname} ${action.icon ? " mosaic-icon" : ""}`
                        )
                        .html(action.label)
                        .attr("title", action.label)
                        .attr("type", "button")
                        .attr("tabindex", "0")
                        .data("action", action.action)
                        .on("click", function (e) {
                            self.mosaic.actionManager.execAction(action.name, e.target);
                        })
                        // ensure Enter/Space keyboard activation triggers the click handler
                        .on("keydown", function (ev) {
                            if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                $(this).trigger("click");
                            }
                        }),
                );
            } else {
                parent.append(
                    $el
                        .addClass(
                            `btn btn-sm btn-${action.name === 'save' ? 'primary' : 'secondary'} mosaic-button-${a_cname} ${action.icon ? " mosaic-icon" : ""}`
                        )
                        .html(action.label)
                        .attr("title", action.label)
                        .attr("type", "button")
                        .attr("tabindex", "0")
                        .data("action", action.action)
                        .on("click", function (e) {
                            self.mosaic.actionManager.execAction(action.name, e.target);
                        })
                        // ensure Enter/Space keyboard activation triggers the click handler
                        .on("keydown", function (ev) {
                            if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                $(this).trigger("click");
                            }
                        }),
                );
            }
        } else if (action.category === "secondary_actions") {
            parent.append(
                $el
                    .addClass(
                        `btn btn-sm btn-secondary mosaic-button-${a_cname} ${action.icon ? " mosaic-icon" : ""}`
                    )
                    .html(action.label)
                    .attr("title", action.label)
                    .attr("type", "button")
                    .attr("tabindex", "0")
                    .data("action", action.action)
                    .on("click", function (e) {
                        self.mosaic.actionManager.execAction(action.name, e.target);
                    })
                    // ensure Enter/Space keyboard activation triggers the click handler
                    .on("keydown", function (ev) {
                        if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            $(this).trigger("click");
                        }
                    }),
            );
        }
    };

    /**
     * Exec an action
     *
     * @id jQuery.mosaicActionManager.execAction
     * @return {Object} Returns a jQuery object of the element the exec action
     *     was called on
     */
    $.mosaic.actionManager.execAction = function (name, trigger) {
        var self = this;

        // Check if actions specified
        if (typeof self.actions !== "undefined") {
            // Check if action exists
            if (self.actions.hasOwnProperty(name)) {
                // Exec action
                self.actions[name].action(trigger);
            }
        }
    };
});
