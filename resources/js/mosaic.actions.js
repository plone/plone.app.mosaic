// This plugin is used to register and execute actions.
import $ from "jquery";
import logging from "@patternslib/patternslib/src/core/logging";
import mosaic_utils from "./utils";
import Modal from "@plone/mockup/src/pat/modal/modal";
import utils from "@plone/mockup/src/core/utils";

const log = logging.getLogger("pat-mosaic/actions");

class ActionManager {
    constructor(mosaic) {
        this.mosaic = mosaic;
        this.actions = []; // Array with all the actions
        this.shortcuts = []; // Lookup array for shortcuts
    }

    registerAction(name, options) {
        // Extend default settings
        options = {
            // Handler for executing the action
            exec: function () {},

            // Shortcut can be any key + ctrl/shift/alt or a combination of
            // those
            shortcut: {
                ctrl: false,
                alt: false,
                shift: false,
                key: "",
            },

            // Method to see if the actions should be visible based on the
            // current tile state
            visible: function () {
                return true;
            },

            ...options,
        };

        // Add action to manager
        this.actions[name] = options;

        // Check if shortcut is defined
        if (options.shortcut.key !== "") {
            // Set keyCode and charCode
            options.shortcut.charCode = options.shortcut.key.toUpperCase().charCodeAt(0);
            options.shortcut.action = name;

            // Set shortcut
            this.shortcuts.push(options.shortcut);
        }
    }

    execAction(action, source) {
        if (!(action in this.actions)) {
            log.error(`Action ${action} not in "${this.actions}"`);
            return;
        }
        return this.actions[action].exec(source);
    }

    getPrefixedClassName(name) {
        if (name.indexOf("-") > -1) {
            // dash-spaced-class-name
            return "mosaic-" + name;
        } else {
            // camelCaseClassName
            return "mosaic" + name.charAt(0).toUpperCase() + name.slice(1);
        }
    }

    async initActions() {
        var self = this;
        var mosaic = self.mosaic;

        // Register generic re-usable toggle tile class format action
        self.registerAction("tile-toggle-class", {
            exec: function () {
                var name;
                if (arguments.length > 0 && arguments[0].value) {
                    name = self.getPrefixedClassName(arguments[0].value);
                    $(".mosaic-selected-tile", mosaic.document).toggleClass(name);
                }
            },
        });

        // Register generic re-usable toggle tile class format action
        self.registerAction("tile-remove-format", {
            exec: function () {
                var i, j, group, action, name;
                for (i = 0; i < mosaic.options.formats.length; i++) {
                    group = mosaic.options.formats[i];
                    for (j = 0; j < group.actions.length; j++) {
                        action = group.actions[j];
                        if (action.category === "tile") {
                            name = self.getPrefixedClassName(action.name);
                            $(".mosaic-selected-tile", mosaic.document).removeClass(
                                name,
                            );
                        }
                    }
                }
            },
        });

        // Register generic re-usable toggle row class format action
        self.registerAction("row-toggle-class", {
            exec: function () {
                var name;
                if (arguments.length > 0 && arguments[0].value) {
                    name = self.getPrefixedClassName(arguments[0].value);
                    $(".mosaic-selected-tile", mosaic.document)
                        .parents(".mosaic-grid-row")
                        .first()
                        .toggleClass(name);
                }
            },
        });

        // Register generic re-usable toggle row class format action
        self.registerAction("row-remove-format", {
            exec: function () {
                var i, j, group, action, name;
                for (i = 0; i < mosaic.options.formats.length; i++) {
                    group = mosaic.options.formats[i];
                    for (j = 0; j < group.actions.length; j++) {
                        action = group.actions[j];
                        if (action.category === "row") {
                            name = self.getPrefixedClassName(action.name);
                            $(".mosaic-selected-tile", mosaic.document)
                                .parents(".mosaic-grid-row")
                                .first()
                                .removeClass(name)
                                .removeClass(action.name);
                        }
                    }
                }
            },
        });

        // Register tile align block action
        self.registerAction("tile-align-block", {
            exec: function () {
                // Remove left and right align classes
                $(".mosaic-selected-tile", mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .removeClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: "b",
            },
        });

        // Register tile align left action
        self.registerAction("tile-align-left", {
            exec: function () {
                // Remove right align class, add left align class
                $(".mosaic-selected-tile", mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .addClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: "l",
            },
        });

        // Register tile align right action
        self.registerAction("tile-align-right", {
            exec: function () {
                // Remove left align class, add right align class
                $(".mosaic-selected-tile", mosaic.document)
                    .removeClass("mosaic-tile-align-left")
                    .addClass("mosaic-tile-align-right");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: "r",
            },
        });

        // Register save action
        self.registerAction("save", {
            exec: function () {
                mosaic.saving = true;
                self.blurSelectedTile();
                mosaic.toolbar.SelectedTileChange();
                mosaic.queue(function (next) {
                    mosaic.layoutManager.saveLayoutToForm();
                    mosaic.save();
                    mosaic.saving = false;
                    next();
                });
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: false,
                key: "s",
            },
        });

        // Register cancel action
        self.registerAction("cancel", {
            exec: function () {
                // Cancel form
                $("#form-buttons-cancel").trigger("click");
            },
        });

        // Register preview action
        self.registerAction("preview", {
            exec: function () {
                // Trigger validation => drafting sync
                $(
                    "#form-widgets-ILayoutAware-customContentLayout, " +
                        "[name='form.widgets.ILayoutAware.customContentLayout']",
                )
                    .trigger("focus")
                    .trigger("focusout");

                // Layout preview
                setTimeout(function () {
                    window.open(
                        mosaic.options.context_url + "/@@layout_preview",
                        "_blank",
                    );
                }, 1000);
            },
        });

        // Register html action
        self.registerAction("html", {
            exec: function () {
                // Local variables
                var tilecontent, text, height;

                // Get tile content div
                tilecontent = $(".mosaic-selected-tile", mosaic.document).children(
                    ".mosaic-tile-content",
                );

                // Check if not already html editable
                if (tilecontent.find(".mosaic-rich-text-textarea").length === 0) {
                    // Add new text area and set content
                    text = tilecontent.html();
                    height = tilecontent.height();
                    tilecontent.empty();
                    tilecontent.prepend(
                        $(mosaic.document.createElement("textarea"))
                            .addClass("mosaic-rich-text-textarea")
                            .html(text.trim())
                            .height(height),
                    );
                }
            },
        });

        // Register page properties action
        self.registerAction("properties", {
            exec: function () {
                mosaic.overlay.open("all");
            },
        });

        self.registerAction("layout", {
            /* layout drop down */
            exec: function () {
                var $container = $(".mosaic-button-group-layout");
                $container.toggleClass("active");
            },
            visible: function () {
                return true;
            },
        });

        // register customize layout button
        self.registerAction("customizelayout", {
            exec: function () {
                mosaic.setSelectedContentLayout(""); // clear selected layout, will use stored layout then
                $(".mosaic-toolbar-secondary-functions").removeClass("d-none");
                $(".mosaic-button-customizelayout").hide();
                $(".mosaic-button-savelayout").show();
                // go through each tile and add movable
                $(".mosaic-panel .mosaic-tile", mosaic.document).each(function () {
                    var $mosaic_tile = $(this).data("mosaic-tile");
                    $mosaic_tile.makeMovable();
                    $mosaic_tile.$el.mosaicAddDrag();
                });
                $(".mosaic-button-group-layout").removeClass("active");
            },
            visible: function () {
                return mosaic.hasContentLayout && mosaic.options.canChangeLayout;
            },
        });

        // register change layout button
        self.registerAction("changelayout", {
            exec: function () {
                var yes = mosaic.hasContentLayout;
                if (!yes) {
                    yes = confirm(
                        "Changing your layout will destroy all existing custom layout " +
                            "settings you have in place. Are you sure you want to continue?",
                    );
                }
                if (yes) {
                    mosaic.selectLayout();
                }
                $(".mosaic-button-group-layout").removeClass("active");
            },
            visible: function () {
                return mosaic.options.available_layouts.length > 0;
            },
        });

        // register change layout button
        self.registerAction("savelayout", {
            exec: function () {
                mosaic.saveLayout();
                $(".mosaic-button-group-layout").removeClass("active");
            },
            visible: function () {
                return true;
            },
        });

        // Register add tile action
        self.registerAction("add-tile", {
            exec: function () {
                // Open overlay
                var m = new Modal(".mosaic-toolbar", {
                    modalSizeClass: "modal-lg",
                    ajaxUrl:
                        mosaic.options.context_url +
                        "/@@add-tile?form.button.Create=Create",
                });
                m.show();
            },
        });

        // Register format action
        self.registerAction("format", {
            exec: function (source) {
                var val = $(source).val();
                var action = $(source).find(`[value="${val}"]`).data("action");
                self.execAction(action, source);
                // reset selector
                $(source).select2("val", "none");
            },
        });

        // Register page-insert action
        self.registerAction("insert", {
            exec: function (source) {
                // Local variables
                var tile_config, tile_type;

                // Check if value selected
                if ($(source).val() === "none") {
                    return false;
                } else {
                    tile_type = $(source).val();
                }

                // Deselect tiles
                self.blurSelectedTile();

                // Set actions
                mosaic.toolbar.SelectedTileChange();

                // Get tile config
                for (const tile_group of mosaic.options.tiles) {
                    for (const tile of tile_group.tiles) {
                        if (tile.name === tile_type) {
                            tile_config = tile;
                        }
                    }
                }

                // Create new app tile
                if (tile_config.tile_type === "textapp") {
                    // an app tile
                    var uid = mosaic_utils.generate_uid();
                    var tileUrl =
                        mosaic.options.context_url + "/@@" + tile_type + "/" + uid;
                    var html =
                        "<html><body>" +
                        mosaic.layoutManager.getDefaultValue(tile_config) +
                        "</body></html>";
                    mosaic.layoutManager.addAppTileHTML(tile_type, html, tileUrl);
                } else if (tile_config.tile_type === "app") {
                    // Load add form form selected tiletype
                    utils.loading.show();

                    const openAddFormInModal = function (html) {
                        let initial = true;
                        const m = new Modal(self.mosaic.panels[0], {
                            html: html,
                            modalSizeClass: "modal-lg",
                            position: "center top",
                            buttons:
                                '.formControls > button[type="submit"], .actionButtons > button[type="submit"]',
                        });
                        m.on("after-render", () => {
                            /* Remove field errors since the user has not actually
                                    been able to fill out the form yet
                                */
                            var $mContent = m.$modalContent;
                            if (initial) {
                                $(".field.error", $mContent).removeClass("error");
                                $(
                                    ".fieldErrorBox,.portalMessage,.alert,.invalid-feedback",
                                    $mContent,
                                ).remove();
                            }
                            $('button[name*="cancel"]', $mContent)
                                .off("click")
                                .on("click", function () {
                                    m.hide();
                                });
                            log.debug("after-render");
                        });
                        m.on("formActionSuccess", (event, response, state, xhr) => {
                            log.debug("TileAddForm ActionSuccess");
                            var tileUrl = xhr.getResponseHeader("X-Tile-Url");
                            if (tileUrl && initial) {
                                mosaic.layoutManager.addAppTileHTML(
                                    tile_type,
                                    response,
                                    tileUrl,
                                );
                                initial = false;
                            }
                            m.hide();
                        });
                        m.show();
                    };

                    $.ajax({
                        type: "GET",
                        url:
                            mosaic.options.context_url +
                            "/@@add-tile?tiletype=" +
                            tile_type +
                            "&form.button.Create=Create",
                        success: function (value) {
                            utils.loading.hide();

                            // Read form
                            const $value = $(value);
                            let action_url = $value.find("#add_tile").attr("action");
                            const authenticator = $value
                                .find('[name="_authenticator"]')
                                .val();

                            // Auto-submit add-form when all required fields are filled
                            if (
                                $("form .required", $value).filter(function () {
                                    var val = $(this)
                                        .parents(".field")
                                        .first()
                                        .find("input, select, textarea")
                                        .not('[type="hidden"]')
                                        .last()
                                        .val();
                                    return val === null || val.length === 0;
                                }).length > 0
                            ) {
                                openAddFormInModal(value);
                            } else if (action_url) {
                                $("form", $value).ajaxSubmit({
                                    type: "POST",
                                    url: action_url,
                                    data: {
                                        "buttons.save": "Save",
                                        "_authenticator": authenticator,
                                    },
                                    success: function (value, state, xhr) {
                                        var tileUrl =
                                            xhr.getResponseHeader("X-Tile-Url");
                                        if (tileUrl) {
                                            mosaic.layoutManager.addAppTileHTML(
                                                tile_type,
                                                value,
                                                tileUrl,
                                            );
                                        } else {
                                            openAddFormInModal(value);
                                        }
                                    },
                                });
                            }
                        },
                    });
                } else {
                    // Add tile
                    mosaic.layoutManager.addTile(
                        tile_type,
                        mosaic.layoutManager.getDefaultValue(tile_config),
                    );
                }

                // reset menu
                $(source).select2("val", "none");

                // Normal exit
                return true;
            },
        });

        // Handle keypress event, check for shortcuts
        $(document).on("keypress", function (e) {
            // Action name
            var action = "";

            // Loop through shortcuts
            $(mosaic.actionManager.shortcuts).each(function () {
                // Check if shortcut matched
                if (
                    (e.ctrlKey === this.ctrl ||
                        (navigator.userAgent.toLowerCase().indexOf("macintosh") !== -1 &&
                            e.metaKey === this.ctrl)) &&
                    (e.altKey === this.alt || e.altKey === undefined) &&
                    e.shiftKey === this.shift &&
                    e.key.toUpperCase().charCodeAt(0) === this.charCode
                ) {
                    // Found action
                    action = this.action;
                }
            });

            // Check if shortcut found
            if (action !== "") {
                // Exec actions
                mosaic.actionManager.actions[action].exec();

                // Prevent other actions
                return false;
            }

            // Normal exit
            return true;
        });
    }

    blurSelectedTile() {
        this.mosaic.document.querySelectorAll(".mosaic-selected-tile").forEach((el) => {
            $(el).data("mosaic-tile").blur();
        });
    }

    mosaicExecAction() {
        // Loop through matched elements
        return this.each(function () {
            // Check if actions specified
            if ($(this).data("action") !== "") {
                var mgr = $.mosaic.actionManager;

                // Exec actions
                mgr.actions[$(this).data("action")].exec(this);
            }
        });
    }
}

export default ActionManager;
