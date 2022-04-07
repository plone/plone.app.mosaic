// This plugin is used to create a mosaic toolbar.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import Tile from "./mosaic.tile";
import "select2";

var normalizeClass = function (val) {
    return val.replace(/(_|\.|\/)/g, "-").toLowerCase();
};

class Toolbar {

    constructor(mosaic, el) {
        var self = this;
        self.mosaic = mosaic;
        self.$el = $(el);
    };

    initToolbar() {
        var self = this;

        return self.$el.each(function () {
            // Local variables
            var obj,
                content,
                actions,
                a,
                x,
                action_group,
                y,
                RepositionToolbar;

            // Get current object
            obj = $(this);

            // Empty object
            obj.html("");

            // Add mosaic toolbar class
            obj.append(
                $(document.createElement("div")).addClass("mosaic-inline-toolbar w-100")
            );
            obj = obj.children(".mosaic-inline-toolbar");

            // Add content
            obj.append(
                $(document.createElement("div")).addClass(
                    "mosaic-toolbar-content d-flex justify-content-between"
                )
            );
            content = obj.children(".mosaic-toolbar-content");

            // Add primary and secondary function div's
            actions = {};
            content.append(
                $(document.createElement("div")).addClass(
                    "mosaic-toolbar-primary-functions d-flex d-grid gap-2"
                )
            );
            actions.primary_actions = content.children(".mosaic-toolbar-primary-functions");
            content.append(
                $(document.createElement("div")).addClass(
                    "mosaic-toolbar-secondary-functions d-flex d-grid gap-2"
                )
            );
            actions.secondary_actions = content.children(
                ".mosaic-toolbar-secondary-functions"
            );

            // Loop through action groups
            for (a in actions) {
                // Add actions to toolbar
                for (x = 0; x < self.mosaic.options[a].length; x += 1) {
                    // If single action
                    if (self.mosaic.options[a][x].actions === undefined) {
                        // Add control
                        self.AddControl(actions[a], self.mosaic.options[a][x]);

                        // If fieldset
                    } else {
                        action_group = self.mosaic.options[a][x];
                        var classNamePart = normalizeClass(self.mosaic.options[a][x].name);
                        var $group = $(document.createElement("div")).addClass(
                            "d-flex mosaic-button-group mosaic-button-group-" + classNamePart
                        );
                        $group.append(
                            self.AddControl(
                                $group,
                                $.extend({}, true, action_group, {
                                    action: action_group.name.toLowerCase(),
                                    name: action_group.name.toLowerCase(),
                                })
                            )
                        );
                        var $btnContainer = $(document.createElement("div")).addClass(
                            "btn-container d-flex d-grid gap-2"
                        );
                        $group.append($btnContainer);
                        actions[a].append($group);
                        for (y = 0; y < action_group.actions.length; y += 1) {
                            // Add control
                            self.AddControl($btnContainer, action_group.actions[y]);
                        }
                    }
                }
            }

            self._mosaicToolbarLayoutEditor(actions);
            if (self.mosaic.hasContentLayout) {
                // hide these options if static
                $(".mosaic-toolbar-secondary-functions", this).addClass("d-none");
            }

            // Reposition toolbar on scroll
            RepositionToolbar = function () {
                // Local variables
                var left;

                if (
                    parseInt($(window).scrollTop(), 10) >
                    parseInt(obj.parent().offset().top, 10)
                ) {
                    if (obj.hasClass("mosaic-inline-toolbar")) {
                        left = obj.offset().left;

                        obj.width(obj.width())
                            .css({
                                "left": left,
                                "margin-left": "0px",
                            })
                            .removeClass("mosaic-inline-toolbar")
                            .addClass("mosaic-external-toolbar")
                            .parent()
                            .height(obj.height());
                    }
                } else {
                    if (obj.hasClass("mosaic-external-toolbar")) {
                        obj.css({
                            "width": "",
                            "left": "",
                            "margin-left": "",
                        })
                            .removeClass("mosaic-external-toolbar")
                            .addClass("mosaic-inline-toolbar")
                            .parent()
                            .css("height", "");
                    }
                }
            };

            // Bind method and add to array
            $(window).on("scroll", RepositionToolbar);

            // Set default actions
            self.SelectedTileChange();

            // Apply select2 for menus
            $(".mosaic-menu").each(function () {
                $(this).select2({
                    width: "style",
                    dropdownCssClass:
                        "mosaic-dropdown mosaic-dropdown-" + $(this).data("action"),
                    dropdownAutoWidth: true,
                    minimumResultsForSearch: 99,
                });
            });
        });
    };

    SelectedTileChange = function () {
        // Local variables
        var self = this, obj, tiletype, actions, x, tile_group, y;

        // Disable edit html source
        self.mosaic.layoutManager.disableEditHtmlSource();

        // Get object
        obj = $(this);

        var $selected_tile = $(".mosaic-selected-tile", self.mosaic.document);
        if ($selected_tile.length > 0) {
            var tile = new Tile(self.mosaic, $selected_tile);
            tiletype = tile.getType();
        }

        // Get actions
        actions = self.mosaic.options.default_available_actions;
        for (x = 0; x < self.mosaic.options.tiles.length; x += 1) {
            tile_group = self.mosaic.options.tiles[x];
            for (y = 0; y < tile_group.tiles.length; y += 1) {
                if (tile_group.tiles[y].name === tiletype) {
                    actions = actions.concat(tile_group.tiles[y].available_actions);
                }
            }
        }
        if (!$selected_tile.hasClass("removable")) {
            actions = $(actions).filter(function () {
                return this !== "remove";
            });
        }

        // Show option groups
        obj.find(".mosaic-option-group").show();

        // Hide all actions (but not complete menus)
        obj.find(".mosaic-button").hide();
        obj.find(".mosaic-menu-format")
            .find(".mosaic-option")
            .hide()
            .attr("disabled", "disabled");
        $(obj.find(".mosaic-menu-format").find(".mosaic-option").get(0))
            .show()
            .removeAttr("disabled");

        // Show actions
        $(actions).each(function (i, val) {
            if (self.mosaic.actionManager.actions[val]) {
                if (!self.mosaic.actionManager.actions[val].visible()) {
                    return;
                }
            }
            obj.find(".mosaic-button-" + val).show();
            obj.find(".mosaic-icon-menu-" + val).show();
            obj.find(".select2-container.mosaic-menu-" + val).show();
            obj.find(".mosaic-option-" + val)
                .show()
                .removeAttr("disabled");
        });
        if (self.mosaic.actionManager.actions.layout.visible()) {
            $(".mosaic-button-layout").show();
        }

        // Disable used field tiles
        obj.find(".mosaic-menu-insert")
            .children(".mosaic-option-group-fields")
            .children()
            .each(function () {
                if (
                    self.mosaic.panels.find(
                        ".mosaic-" + $(this).attr("value") + "-tile"
                    ).length === 0
                ) {
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

        if (!self.mosaic.hasContentLayout && self.mosaic.options.canChangeLayout) {
            $(".mosaic-button-savelayout").show();
        } else {
            $(".mosaic-button-savelayout").hide();
        }
    }

    AddControl(parent, action) {
        var $el, self = this;

        // Check if button or menu
        if (typeof action.menu !== undefined && action.menu) {
            // Check if icon menu
            if (action.icon) {
                $el = $(document.createElement("label"));
                // Create menu
                parent.append(
                    $el
                        .addClass(
                            "mosaic-icon-menu mosaic-icon-menu-" +
                                normalizeClass(action.name) +
                                " mosaic-icon"
                        )
                        .html(action.label)
                        .attr("title", action.label)
                        .append(
                            $(document.createElement("select"))
                                .addClass("mosaic-menu-" + normalizeClass(action.name))
                                .data("action", action.action)
                                .on("change", function (e) {
                                    self.mosaic.actionManager.execAction(action.action, e.target);
                                })
                                .each(function () {
                                    // Local variables
                                    var elm, y;

                                    for (const ai of action.items) {
                                        // Check if child objects
                                        if (ai.items !== undefined) {
                                            $(this).append(
                                                $(document.createElement("optgroup"))
                                                    .addClass(
                                                        "mosaic-option-group mosaic-option-group-" +
                                                            normalizeClass(ai.value)
                                                    )
                                                    .attr("label", ai.label)
                                            );
                                            elm = $(this).find(
                                                ".mosaic-option-group-" +
                                                    normalizeClass(ai.value)
                                            );

                                            // Add child nodes
                                            for (y in ai.items) {
                                                elm.append(
                                                    $(document.createElement("option"))
                                                        .attr(
                                                            "value",
                                                            ai.items[y].value
                                                        )
                                                        .addClass(
                                                            "mosaic-option mosaic-option-" +
                                                                normalizeClass(
                                                                    ai.items[y]
                                                                        .value
                                                                )
                                                        )
                                                        .html(ai.items[y].label)
                                                );
                                            }

                                            // Else no child objects
                                        } else {
                                            $(this).append(
                                                $(document.createElement("option"))
                                                    .attr("value", ai.value)
                                                    .addClass(
                                                        "mosaic-option mosaic-option-" +
                                                            normalizeClass(
                                                                ai.value
                                                            )
                                                    )
                                                    .html(ai.label)
                                            );
                                        }
                                    }
                                })
                        )
                );

                // Else text menu
            } else {
                $el = $(document.createElement("select"));
                // Create menu
                parent.append(
                    $el
                        .addClass(
                            "mosaic-menu mosaic-menu-" + action.name.replace(/_/g, "-")
                        )
                        .data("action", action.action)
                        .on("change", function (e) {
                            self.mosaic.actionManager.execAction(action.action, e.target);
                        })
                        .each(function () {
                            // Local variables
                            var elm;
                            for (const ai of action.items) {
                                // Check if child objects
                                if (ai.items !== undefined) {
                                    $(this).append(
                                        $(document.createElement("optgroup"))
                                            .addClass(
                                                "mosaic-option-group mosaic-option-group-" +
                                                    normalizeClass(ai.value)
                                            )
                                            .attr("label", ai.label)
                                    );
                                    elm = $(this).find(
                                        ".mosaic-option-group-" +
                                            normalizeClass(ai.value)
                                    );

                                    // Add child nodes
                                    for (const sub_ai of ai.items) {
                                        elm.append(
                                            $(document.createElement("option"))
                                                .attr(
                                                    "value",
                                                    sub_ai.value
                                                )
                                                .addClass(
                                                    "mosaic-option mosaic-option-" +
                                                        normalizeClass(
                                                            sub_ai.value
                                                        )
                                                )
                                                .html(sub_ai.label)
                                        );
                                    }

                                    // Else no child objects
                                } else {
                                    $(this).append(
                                        $(document.createElement("option"))
                                            .attr("value", ai.value)
                                            .addClass(
                                                "mosaic-option mosaic-option-" +
                                                    normalizeClass(ai.value)
                                            )
                                            .html(ai.label)
                                    );
                                }
                            }
                        })
                );
            }
        } else {
            if (normalizeClass(action.name) == "layout") {
                $el = $(document.createElement("div"));
                // Create button
                parent.append(
                    $el
                        .addClass(
                            "ms-3 d-flex align-items-center me-2 text-secondary mosaic-button mosaic-button-" +
                                normalizeClass(action.name) +
                                (action.icon ? " mosaic-icon" : "")
                        )
                        .html(action.label)
                );
            } else {
                $el = $(document.createElement("button"));
                // Create button
                parent.append(
                    $el
                        .addClass(
                            "btn btn-sm btn-secondary mosaic-button mosaic-button-" +
                                normalizeClass(action.name) +
                                (action.icon ? " mosaic-icon" : "")
                        )
                        .html(action.label)
                        .attr("title", action.label)
                        .attr("type", "button")
                        .data("action", action.action)
                        .on("mousedown", function (e) {
                            self.mosaic.actionManager.execAction(action.name, e.target);
                        })
                );
            }
        }
        if (self.mosaic.actionManager.actions[action.name]) {
            if (!self.mosaic.actionManager.actions[action.name].visible()) {
                // hide it
                $el.hide();
            }
        }
    };

    _mosaicToolbarLayoutEditor(actions) {
        var self = this;

        $(".mosaic-toolbar-secondary-functions", self.$el).removeClass("d-none");

        var x, y, action_group, elm_action_group;
        // Add formats to toolbar
        if (self.mosaic.options.formats !== undefined) {
            for (x = 0; x < self.mosaic.options.formats.length; x += 1) {
                action_group = self.mosaic.options.formats[x];
                actions.primary_actions.append(
                    $(document.createElement("fieldset")).addClass(
                        "d-flex d-grid gap-2 btn-group mosaic-button-group mosaic-button-group-" +
                            normalizeClass(action_group.name)
                    )
                );
                elm_action_group = actions.primary_actions.children(
                    ".mosaic-button-group-" + action_group.name.replace(/_/g, "-")
                );
                for (y = 0; y < action_group.actions.length; y += 1) {
                    if (action_group.actions[y].favorite) {
                        // Add control
                        self.AddControl(elm_action_group, action_group.actions[y]);
                    }
                }
                if (elm_action_group.children().length === 0) {
                    elm_action_group.remove();
                }
            }
        }

        // Add items to the insert menu
        if (self.mosaic.options.tiles !== undefined) {
            var elm_select_insert = actions.secondary_actions.find(".mosaic-menu-insert");
            for (x = 0; x < self.mosaic.options.tiles.length; x += 1) {
                action_group = self.mosaic.options.tiles[x];
                elm_select_insert.append(
                    $(document.createElement("optgroup"))
                        .addClass(
                            "mosaic-option-group mosaic-option-group-" +
                                normalizeClass(action_group.name)
                        )
                        .attr("label", action_group.label)
                );
                elm_action_group = actions.secondary_actions.find(
                    ".mosaic-option-group-" + normalizeClass(action_group.name)
                );
                for (y = 0; y < action_group.tiles.length; y += 1) {
                    var tile = action_group.tiles[y];
                    elm_action_group.append(
                        $(document.createElement("option"))
                            .addClass(
                                "mosaic-option mosaic-option-" + normalizeClass(tile.name)
                            )
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
        if (self.mosaic.options.formats !== undefined) {
            var elm_select_format = actions.secondary_actions.find(".mosaic-menu-format");
            for (x = 0; x < self.mosaic.options.formats.length; x += 1) {
                action_group = self.mosaic.options.formats[x];
                elm_select_format.append(
                    $(document.createElement("optgroup"))
                        .addClass(
                            "mosaic-option-group mosaic-option-group-" +
                                normalizeClass(action_group.name)
                        )
                        .attr("label", action_group.label)
                );
                elm_action_group = actions.secondary_actions.find(
                    ".mosaic-option-group-" + normalizeClass(action_group.name)
                );
                for (y = 0; y < action_group.actions.length; y += 1) {
                    var action = action_group.actions[y];
                    if (action.favorite === false) {
                        elm_action_group.append(
                            $(document.createElement("option"))
                                .addClass(
                                    "mosaic-option mosaic-option-" +
                                        normalizeClass(action.name)
                                )
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
    };
};


export default Toolbar;
