// This plugin is used to create a mosaic toolbar.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import Registry from "@patternslib/patternslib/src/core/registry";

var normalizeClass = function (val) {
    return val.replace(/(_|\.|\/)/g, "-").toLowerCase();
};

class Toolbar {

    constructor(mosaic, el) {
        var self = this;
        self.mosaic = mosaic;
        self.$el = $(document.createElement("div")).addClass(
            "mosaic-toolbar bg-light position-fixed top-0 start-0 end-0 p-2 border-bottom shadow-sm"
        );

        // Add toolbar div below menu
        $("body").prepend(self.$el);

        self.lastChange = (new Date()).getTime();
    };

    initToolbar() {
        var self = this;
        // Local variables
        var content,
            actions,
            a,
            action_group,
            y;

        // Empty
        self.$el.html("");

        // Add mosaic toolbar class
        self.$el.append(
            $(document.createElement("div")).addClass("mosaic-inline-toolbar w-100")
        );
        self.$el = self.$el.children(".mosaic-inline-toolbar");

        // Add content
        self.$el.append(
            $(document.createElement("div")).addClass(
                "mosaic-toolbar-content d-flex justify-content-between"
            )
        );
        content = self.$el.children(".mosaic-toolbar-content");

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
        for (const a in actions) {
            // Add actions to toolbar
            for (const action of self.mosaic.options[a]) {
                // If single action
                if (action.actions === undefined) {
                    // Add control
                    self.AddControl(actions[a], action);

                // If fieldset
                } else {
                    action_group = action;
                    var classNamePart = normalizeClass(action.name);
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
                    for (const group_action of action_group.actions) {
                        // Add control
                        self.AddControl($btnContainer, group_action);
                    }
                }
            }
        }

        self._mosaicToolbarLayoutEditor(actions);

        if (self.mosaic.hasContentLayout) {
            // hide these options if static
            $(".mosaic-toolbar-secondary-functions", self.$el).addClass("d-none");
        }

        // Set default actions
        self.SelectedTileChange();

        Registry.scan(self.$el);
    };

    SelectedTileChange = function () {
        // Local variables
        var self = this;

        var selected_tile = self.mosaic.document.querySelector(".mosaic-selected-tile");
        var tiletype = selected_tile ? selected_tile["mosaic-tile"].getType() : null;

        // Get actions
        var actions = self.mosaic.options.default_available_actions;
        for (const tile_group of self.mosaic.options.tiles) {
            for (const tile of tile_group.tiles) {
                if (tile.name === tiletype) {
                    actions = actions.concat(tile.available_actions);
                }
            }
        }
        if (selected_tile && !selected_tile.classList.contains("removable")) {
            actions = actions.filter(item => item !== "remove");
        }

        // Show option groups
        self.$el.find(".mosaic-option-group").show();

        // Hide all actions (but not complete menus)
        self.$el.find(".mosaic-button").hide();
        self.$el.find(".mosaic-menu-format")
            .find(".mosaic-option")
            .hide()
            .attr("disabled", "disabled");
        $(self.$el.find(".mosaic-menu-format").find(".mosaic-option").get(0))
            .show()
            .removeAttr("disabled");

        // Show actions
        for(const val of actions) {
            if (self.mosaic.actionManager.actions[val]) {
                if (!self.mosaic.actionManager.actions[val].visible()) {
                    return;
                }
            }
            self.$el.find(".mosaic-button-" + val).show();
            self.$el.find(".mosaic-icon-menu-" + val).show();
            self.$el.find(".mosaic-option-" + val)
                .show()
                .removeAttr("disabled");
        };
        if (self.mosaic.actionManager.actions.layout.visible()) {
            $(".mosaic-button-layout").show();
        }

        // Disable used field tiles
        self.$el.find(".mosaic-menu-insert")
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
        self.$el.find(".mosaic-option-group").each(function () {
            if ($(this).children(":enabled").length === 0) {
                $(this).hide();
            }
        });

        if (!self.mosaic.hasContentLayout && self.mosaic.options.canChangeLayout) {
            $(".mosaic-button-savelayout").show();
        } else {
            $(".mosaic-button-savelayout").hide();
        }

        // auto save
        if (
            !self.mosaic.overlay.app &&
            !self.mosaic.saving &&
            !self.mosaic.modal &&
            ((new Date()).getTime() - self.lastChange) > 6000
        ) {
            self.mosaic.queue(function(next){
                self.mosaic.layoutManager.saveLayoutToForm();
                $("#form-widgets-ILayoutAware-customContentLayout, " +
                "[name='form.widgets.ILayoutAware.customContentLayout']").trigger("blur");
                next();
            });
            self.lastChange = (new Date()).getTime();
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
                                                        "mosaic-option-group " +
                                                        `mosaic-option-group-${normalizeClass(ai.value)}`
                                                    )
                                                    .attr("label", ai.label)
                                            );
                                            elm = $(this).find(
                                                `.mosaic-option-group-${normalizeClass(ai.value)}`
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
                                                            "mosaic-option " +
                                                            `mosaic-option-${normalizeClass(ai.items[y].value)}`
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
                                                        "mosaic-option " +
                                                        `mosaic-option-${normalizeClass(ai.value)}`
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
                var menu_id = `mosaic-menu-${action.name.replace(/_/g, "-")}`;
                parent.append(
                    $el
                        .addClass(`pat-select2 mosaic-menu ${menu_id}`)
                        .attr("data-pat-select2", JSON.stringify({
                            "minimumResultsForSearch": -1,
                            "dropdownCssClass": menu_id,
                            "dropdownAutoWidth": true,
                        }))
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

        var elm_action_group;
        // Add formats to toolbar
        if (self.mosaic.options.formats !== undefined) {
            for (const action_group of self.mosaic.options.formats) {
                actions.primary_actions.append(
                    $(document.createElement("fieldset")).addClass(
                        "d-flex d-grid gap-2 btn-group mosaic-button-group mosaic-button-group-" +
                            normalizeClass(action_group.name)
                    )
                );
                elm_action_group = actions.primary_actions.children(
                    ".mosaic-button-group-" + action_group.name.replace(/_/g, "-")
                );
                for (const action of action_group.actions) {
                    if (action.favorite) {
                        // Add control
                        self.AddControl(elm_action_group, action);
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
            for (const action_group of self.mosaic.options.tiles) {
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
                for (const tile of action_group.tiles) {
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
            for (const action_group of self.mosaic.options.formats) {
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
                for (const action of action_group.actions) {
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
