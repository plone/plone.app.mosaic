import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import utils from "@plone/mockup/src/core/utils";
import mosaic_utils from "./utils";
import logging from "@patternslib/patternslib/src/core/logging";
import Modal from "@plone/mockup/src/pat/modal/modal";
import Registry from "@patternslib/patternslib/src/core/registry";
import "./mosaic.overlay";

const log = logging.getLogger("pat-mosaic/tile");

var _TILE_TYPE_CACHE = {};
const BUTTON_ICON_MAP = {
    delete: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">' +
        '<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>' +
        '</svg>',
    cancel: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">' +
        '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
        '<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>' +
        '</svg>',
    confirm: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">' +
        '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>' +
        '<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>' +
        '</svg>',
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">' +
        '<path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>' +
        '<path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>' +
        '</svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sliders" viewBox="0 0 16 16">' +
        '<path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3h9.05zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8h2.05zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1h9.05z"/>' +
        '</svg>'
}

// so we don't get spammed with missing tile warnings
var _missing_tile_configs = [];

/* Tile class */
class Tile {
    deprecatedHTMLTiles = [
        "table",
        "numbers",
        "bullets",
        "text",
        "subheading",
        "heading",
    ];

    constructor(mosaic, el) {
        var self = this;
        self.mosaic = mosaic;
        self.el = el;
        self.$el = $(el);
        if (!self.$el.is(".mosaic-tile")) {
            // XXX we need to get the outer-most container of the node here always
            self.$el = self.$el.parents(".mosaic-tile");
        }
        self.focusCheckCount = 0;
    }
    getDataTileEl() {
        return this.$el.find("[data-tile]");
    }
    getContentEl() {
        return this.$el.children(".mosaic-tile-content");
    }
    getHtmlContent() {
        return this.getContentEl().html();
    }
    getEditUrl() {
        var tile_url = this.getUrl();
        if (!tile_url) {
            return;
        }
        tile_url = tile_url.replace(/@@/, "@@edit-tile/");
        if (!tile_url) {
            return;
        }
        // Calc absolute edit url
        if (tile_url.match(/^\.\/.*/)) {
            tile_url = this.mosaic.options.context_url + tile_url.replace(/^\./, "");
        }
        return tile_url;
    }
    getDeleteUrl() {
        var tile_url = this.getUrl();
        // Calc delete url
        var url = tile_url.split("?")[0];
        url = url.split("@@");
        var tile_type_id = url[1].split("/");
        url = url[0] + "@@delete-tile/" + tile_type_id[0] + "/" + tile_type_id[1];
        // Calc absolute delete url
        if (url.match(/^\.\/.*/)) {
            url = this.mosaic.options.context_url + url.replace(/^\./, "");
        }
        return url;
    }
    getUrl() {
        var tile_url = this.$el.find(".tileUrl").html();
        if (!tile_url) {
            var $tileUrlEl = this.$el.find("[data-tileUrl]");
            if ($tileUrlEl.length > 0) {
                tile_url = $tileUrlEl.attr("data-tileUrl");
            }
        }
        if (!tile_url) {
            tile_url = this.$el.find("[data-tile]").attr("data-tile");
        }
        if (tile_url) {
            tile_url = tile_url.replace(this.mosaic.options.context_url, "./");
            tile_url = tile_url.replace(/^\.\/\//, "./");
            if (this.mosaic.hasContentLayout) {
                if (tile_url.indexOf("X-Tile-Persistent") === -1) {
                    if (tile_url.indexOf("?") === -1) {
                        tile_url += "?";
                    } else {
                        tile_url += "&";
                    }
                    tile_url += "X-Tile-Persistent=yes";
                }
            } else if (tile_url.indexOf("X-Tile-Persistent") !== -1) {
                tile_url = tile_url.replace("X-Tile-Persistent=yes", "").replace("&&", "&");
            }
            while (tile_url.indexOf("&_layouteditor=true") !== -1) {
                // clean out urls with _layouteditor in them
                tile_url = tile_url.replace("&_layouteditor=true", "");
            }
        }
        return tile_url;
    }
    getType() {
        // previously this.mosaic.getTileType
        var self = this;
        var classNames = self.$el.attr("class");
        if(classNames in _TILE_TYPE_CACHE) {
            return _TILE_TYPE_CACHE[classNames];
        }
        var tiletype = "";
        if(classNames === undefined) {
            return;
        }
        for(const cls of classNames.split(" ")) {
            let classname = cls.match(/^mosaic-([\w.\-]+)-tile$/);
            if (classname !== null) {
                if (classname[1] !== "selected" &&
                    classname[1] !== "new" &&
                    classname[1] !== "read-only" &&
                    classname[1] !== "helper" &&
                    classname[1] !== "original" &&
                    classname[1] !== "edited") {
                    tiletype = classname[1];
                }
            }
        }

        if (!tiletype) {
            log.error(
                `Could not find tile type on element ${self.$el} with classes: ${classNames}`
            );
        }

        _TILE_TYPE_CACHE[classNames] = tiletype;
        return tiletype;
    }
    getConfig() {
        var tile_config;
        var tiletype = this.getType();
        // Get tile config
        for (const tile_group of this.mosaic.options.tiles) {
            var found = false;
            for (const tile of tile_group.tiles) {
                // Set settings value
                if (tile.tile_type === "field") {
                    var widget = tile.widget.split(".");
                    widget = widget[widget.length - 1];
                    switch (widget) {
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
                            tile.settings = false;
                            break;
                        default:
                            tile.settings = true;
                    }
                }
                if (tile.name === tiletype) {
                    tile_config = tile;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }

        if (!tile_config) {
            // dive out of here, something went wrong finding tile config
            if (_missing_tile_configs.indexOf(tiletype) === -1) {
                log.error(
                    "Could not load tile config for tile type: " +
                    tiletype +
                    " falling back to b/w compatible tile type."
                );
                _missing_tile_configs.push(tiletype);
            }
            tile_config = {
                tile_type: "app",
                name: tiletype,
                label: "Unknown",
                read_only: true,
                favorite: false,
                settings: false,
                weight: 0,
                rich_text: false,
            };
            if (this.deprecatedHTMLTiles.indexOf(tiletype) !== -1) {
                // deprecated html tile type, provide b/w compat config
                tile_config.category = "structure";
                tile_config.read_only = false;
                tile_config.label = tiletype;
                tile_config.tile_type = "text";
                tile_config.rich_text = true;
            }
        }
        return tile_config;
    }
    getHtmlBody(exportLayout) {
        var body = "";
        // Get tile type
        var tiletype = "", classes = this.$el.attr("class").split(" ");

        tiletype = this.getType();
        classes = $(classes)
            .filter(function () {
                switch (this) {
                    case "mosaic-new-tile":
                    case "mosaic-helper-tile":
                    case "mosaic-original-tile":
                    case "mosaic-selected-tile":
                    case "mosaic-edited-tile":
                        return false;
                    default:
                        return true;
                }
            })
            .toArray();

        // Get tile config
        var tile_config = this.getConfig();

        // Predefine vars
        switch (tile_config.tile_type) {
            case "text":
                body += '<div class="' + classes.join(" ") + '">\n';
                body += '<div class="mosaic-tile-content">\n';
                body += this.$el.children(".mosaic-tile-content .mce-content-body").html() + "\n";
                body += "</div>\n";
                body += "</div>\n";
                break;
            case "app":
            case "textapp":
                var url = this.getUrl();
                if (exportLayout) {
                    // we want to provide default value here for exporting this layout
                    var data = this.$el.children(".mosaic-tile-content .mce-content-body").html() + "\n";
                    // convert to url valid value
                    if (url.indexOf("?") === -1) {
                        url += "?";
                    } else {
                        url += "&";
                    }
                    url += "content=" + encodeURI(data);
                }
                body += '<div class="' + classes.join(" ") + '">\n';
                body += '<div class="mosaic-tile-content">\n';
                body += '<div data-tile="' + url + '"></div>\n';
                body += "</div>\n";
                body += "</div>\n";
                break;
            case "field":
                body += '<div class="' + classes.join(" ") + '">\n';
                body += '<div class="mosaic-tile-content">\n';

                // Calc url
                var tile_url = "./@@plone.app.standardtiles.field?field=" + tiletype;

                // ability to provide a few additional settings for field tiles
                // can be useful in formatting field tiles in python
                // subfield is meant for relation fields
                var subfield = this.getValueFromClasses(classes, "mosaic-subfield-");
                if (subfield) {
                    tile_url += "&subfield=" + subfield;
                }
                var format = this.getValueFromClasses(classes, "mosaic-format-");
                if (format) {
                    tile_url += "&format=" + format;
                }

                body += '<div data-tile="' + tile_url + '"></div>\n';
                body += "</div>\n";
                body += "</div>\n";

                // Update field values if type is rich text
                this.saveForm();
                break;
        }
        return body;
    }
    isRichText(tile_config) {
        if(this.$el.hasClass("mosaic-read-only-tile")) {
            return false;
        }
        if (tile_config === undefined) {
            tile_config = this.getConfig();
        }
        if (
            tile_config && (
                (tile_config.tile_type === "text" && tile_config.rich_text) ||
                (tile_config.tile_type === "textapp" && tile_config.rich_text) ||
                (tile_config.tile_type === "app" && tile_config.rich_text) ||
                (tile_config.tile_type === "field" && !tile_config.read_only && (
                    tile_config.widget === "plone.app.z3cform.widget.RichTextFieldWidget" ||
                    tile_config.widget === "plone.app.z3cform.wysiwyg.widget.WysiwygWidget" ||
                    tile_config.widget === "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget" ||
                    tile_config.widget === "plone.app.widgets.dx.RichTextWidget"
                ))
            )
        ) {
            return true;
        } else {
            return false;
        }
    }
    async initialize() {
        var self = this;
        var tile_config = self.getConfig();

        // Check read only
        if (tile_config && tile_config.read_only) {
            // Set read only
            self.$el.addClass("mosaic-read-only-tile");
        }

        // Add border divs
        self.$el.prepend(
            $(self.mosaic.document.createElement("div"))
                .addClass("mosaic-tile-outer-border")
                .append(
                    $(self.mosaic.document.createElement("div")).addClass(
                        "mosaic-tile-inner-border"
                    )
                )
        );

        // Add label
        if (tile_config) {
            var side_tools = $(self.mosaic.document.createElement("div")).addClass(
                "mosaic-tile-control mosaic-tile-side-tools"
            );

            self.$el.prepend(
                side_tools.append(
                    $(self.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-label content")
                        .html(tile_config.label)
                )
            );

            var can_reset = self.$el.parent().hasClass("col");
            if (!can_reset) {
                var classes = self.$el.parent().attr("class").split(" ");
                var cols = self.getValueFromClasses(classes, "col-");
                var cols_str = typeof cols === "undefined" ? "" : " (" + cols + ")";

                var _addResetAnchor = function (click) {
                    var reset = document.createElement("a");
                    reset.href = "javascript:";
                    reset.textContent = "Reset" + cols_str;
                    $(reset).on("click", click);
                    return reset;
                };

                side_tools.append(
                    $(self.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-label reset")
                        .append(_addResetAnchor(self.resetClicked.bind(this)))
                        .hide()
                );
            }
        }

        self.makeMovable();
        self.initializeButtons();

        for(const pos of ["top", "bottom", "right", "left"]) {
            self.$el.prepend(
                $(self.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-" + pos)
            );
        };

        // convenience: store Tile instance on dom and jquery
        self.el["mosaic-tile"] = self;
        self.$el.data("mosaic-tile", self)
    }
    resetClicked(e) {
        e.preventDefault();
        var self = this;

        self.$el
            .parent()
            .removeClass(
                "col-1 col-2 col-3 col-4 col-5 col-6 col-7 col-8 col-9 col-10 col-11 col-12"
            )
            .addClass("col");

        $(e.target).closest(".reset").remove();

        // Get original row
        var $originalRow = self.$el.parent().parent();

        // Cleanup original row
        $originalRow.mosaicCleanupRow();
        $originalRow.mosaicSetResizeHandles();
    }
    initializeButtons() {
        var buttons = [];
        var tile_config = this.getConfig();

        // reinitialize buttons every time
        this.$el.find(".mosaic-tile-buttons").remove();

        var _addButton = function (label, name, click) {
            var btn = document.createElement("button");
            btn.className = `btn btn-sm btn-${name === "confirm" ? "danger" : "light"} mosaic-btn-${name}`;
            btn.textContent = label;
            buttons.push(btn);
            $(btn).on("click", click);
            if(!(name in BUTTON_ICON_MAP)) {
                log.warn(`could not find button icon "${name}"`);
            } else {
                $(btn).prepend(BUTTON_ICON_MAP[name] + " ");
            }
            return btn;
        };

        // Add settings icon
        if (tile_config &&
            tile_config.settings &&
            this.$el.hasClass("mosaic-read-only-tile") === false) {
            _addButton("Edit", "settings", this.settingsClicked.bind(this));
        }

        if (!this.mosaic.hasContentLayout) {
            _addButton("Delete", "delete", this.deleteClicked.bind(this));
            var confirmBtn = _addButton(
                "Confirm delete",
                "confirm",
                this.confirmClicked.bind(this)
            );
            $(confirmBtn).hide();
            var btn = _addButton("Cancel", "cancel", this.cancelClicked.bind(this));
            $(btn).hide();
        }

        if (buttons.length > 0) {
            var $btns = $("<div />").addClass(
                "mosaic-tile-control mosaic-tile-buttons"
            );
            for (const $btn of buttons) {
                $btns.append($btn);
            };
            this.$el.prepend($btns);
        }
    }
    cancelClicked(e) {
        e.preventDefault();
        $(".mosaic-btn-settings,.mosaic-btn-delete", this.$el).show();
        $(".mosaic-btn-cancel,.mosaic-btn-confirm", this.$el).hide();
    }
    deleteClicked(e) {
        e.preventDefault();
        $(".mosaic-btn-settings,.mosaic-btn-delete", this.$el).hide();
        $(".mosaic-btn-cancel,.mosaic-btn-confirm", this.$el).show();
    }
    confirmClicked(e) {
        e.preventDefault();

        var self = this;
        var el = self.el.jquery ? self.el[0] : self.el;
        var tileConfig = this.getConfig();

        // Check if app tile
        if (tileConfig.tile_type === "app" || tileConfig.tile_type === "textapp") {
            // Get url
            var tile_url = this.getUrl();

            if (tile_url && tile_url !== "undefined") {
                // Remove tags
                this.mosaic.removeHeadTags(tile_url);

                // Ajax call to remove tile
                this.mosaic.queue(function (next) {
                    $.ajax({
                        type: "POST",
                        url: self.getDeleteUrl(),
                        data: {
                            "buttons.delete": "Delete",
                            "_authenticator": utils.getAuthenticator(),
                        },
                    }).always(function () {
                        next();
                    });
                });
            }
        }

        // If we have a tinymce instance initialized we have to destroy it
        const tile_content = el.querySelector(".mosaic-tile-content");

        if(tile_content["pattern-tinymce"]) {
            tile_content["pattern-tinymce"].destroy();
        }

        // Remove empty rows
        this.mosaic.panels.find(".mosaic-empty-row").remove();

        // Get original row
        var $originalRow = this.$el.parent().parent();

        // Save tile value
        this.saveForm();

        // Remove current tile
        this.$el.remove();

        // Cleanup original row
        $originalRow.mosaicCleanupRow();

        // Add empty rows
        this.mosaic.panels.mosaicAddEmptyRows();

        // Set toolbar
        this.mosaic.toolbar.SelectedTileChange();
    }
    settingsClicked(e) {
        e.preventDefault();
        var self = this;

        // Get tile config
        var tile_config = self.getConfig();

        // Check if not application tile
        if (tile_config.tile_type !== "app") {
            self.mosaic.overlay.open("field", tile_config);
            return;
        }

        // Get url
        var tile_url = self.getEditUrl();

        // Open overlay
        var modal = new Modal(".mosaic-toolbar", {
            actionOptions: {
                isForm: true,
                onSuccess: (event, response, state, xhr, form) => {
                    var tileUrl = xhr.getResponseHeader("X-Tile-Url"), value = self.mosaic.getDomTreeFromHtml(response);
                    if (tileUrl) {
                        // Remove head tags
                        self.mosaic.removeHeadTags(tileUrl);

                        // Add head tags
                        self.mosaic.addHeadTags(tileUrl, value);
                        var tileHtml = value.find(".temp_body_tag").html();
                        self.fillContent({
                            html: tileHtml,
                            url: tileUrl,
                        });

                        // Close overlay
                        modal.hide();
                        modal = null;
                    }
                },
            },
            ajaxUrl: tile_url,
            modalSizeClass: "modal-lg",
            position: "center top",
        });
        modal.$el.off("after-render");
        modal.on("after-render", function (event) {
            if (self.mosaic.hasContentLayout) {
                // not a custom layout, make sure the form knows
                $("form", modal.$modal).append(
                    $('<input type="hidden" name="X-Tile-Persistent" value="yes" />')
                );
            }
        });
        modal.show();
    }
    makeMovable() {
        // If the tile is movable
        if (this.$el.hasClass("movable") &&
            this.mosaic.options.canChangeLayout &&
            !this.mosaic.hasContentLayout) {
            // Add drag handle
            this.$el.prepend(
                $(this.mosaic.document.createElement("div")).addClass(
                    "mosaic-tile-control mosaic-drag-handle"
                )
            );
        }
    }
    getValueFromClasses(classes, name) {
        var value;
        classes.forEach(function (className) {
            if (className.indexOf(name) !== -1) {
                value = className.replace(name, "");
            }
        });
        return value;
    }
    async initializeContent() {
        var self = this;

        // Local variables
        var url, start, end, fieldval, fieldhtml;

        var base = $("body", self.mosaic.document).attr("data-base-url");
        if (!base) {
            base = $("head > base", self.mosaic.document).attr("href");
        }
        var href = this.getUrl();

        // Get tile type
        var tile_config = this.getConfig();

        // Check if a field tile
        if (tile_config.tile_type === "field") {
            fieldhtml = "";

            // Wrap title and description fields for proper styles
            if (tile_config.name === "IDublinCore-title") {
                start = '<h1 class="documentFirstHeading">';
                end = "</h1>";
            } else if (tile_config.name === "IDublinCore-description") {
                start = '<p class="documentDescription">';
                end = "</p>";
            } else {
                start = "<div>";
                end = "</div>";
            }

            var contenteditable = false;
            var wysiwyg = false;

            switch (tile_config.widget) {
                case "z3c.form.browser.text.TextWidget":
                case "z3c.form.browser.text.TextFieldWidget":
                    fieldval = $("#" + tile_config.id)
                        .find("input")
                        .attr("value");
                    fieldhtml = `${start}${fieldval}${end}`;
                    contenteditable = true;
                    break;
                case "z3c.form.browser.textarea.TextAreaWidget":
                case "z3c.form.browser.textarea.TextAreaFieldWidget":
                case "z3c.form.browser.textlines.TextLinesWidget":
                case "z3c.form.browser.textlines.TextLinesFieldWidget":
                    fieldval = $("#" + tile_config.id)
                        .find("textarea")
                        .val()
                        .split("\n");
                    fieldhtml += start;
                    fieldhtml += fieldval.join("<br/>");
                    fieldhtml += end;
                    contenteditable = true;
                    break;
                case "plone.app.z3cform.widget.RichTextFieldWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                case "plone.app.widgets.dx.RichTextWidget":
                    fieldhtml = document.querySelectorAll(
                        `#${tile_config.id} textarea`
                    )[0].value
                    wysiwyg = true;
                    break;
                default:
                    fieldhtml =
                        '<div class="discreet">Placeholder ' +
                        "for field:<br/><b>" +
                        tile_config.label +
                        "</b></div>";
                    break;
            }
            self.fillContent({
                html: fieldhtml,
                editable: !tile_config.read_only && contenteditable,
                wysiwyg: wysiwyg,
            });
        // Get data from app tile
        } else if (tile_config) {
            self.$el.addClass("mosaic-tile-loading");
            url = base ? [base, href].join("/").replace(/\/+\.\//g, "/") : href;
            var original_url = url;
            // in case tile should be rendered differently for layout editor
            if (url.indexOf("?") === -1) {
                url += "?";
            } else {
                url += "&";
            }
            if (url.indexOf("_layouteditor") === -1) {
                url += "_layouteditor=true";
            }
            $.ajax({
                type: "POST",
                url: url,
                success: async function (value) {
                    self.$el.removeClass("mosaic-tile-loading");
                    // Get dom tree
                    value = self.mosaic.getDomTreeFromHtml(value);

                    // Add head tags
                    self.mosaic.addHeadTags(href, value);
                    var tileHtml = value.find(".temp_body_tag").html();
                    var tiletype = self.getType();

                    self.fillContent({
                        html: tileHtml,
                        url: original_url,
                        wysiwyg: (tiletype === "plone.app.standardtiles.html"),
                    });
                },
                error: function () {
                    self.$el.removeClass("mosaic-tile-loading");
                    log.error(
                        "Error getting data for the tile " +
                        tile_config.label +
                        "(" +
                        tile_config.name +
                        "). Please read documentation " +
                        "on how to correctly register tiles: https://pypi.python.org/pypi/plone.tiles"
                    );
                },
            });
        }
    }
    async fillContent({html, url, editable, wysiwyg}) {
        // need to replace the data-tile node here
        var $el = this.getDataTileEl();
        var $content;
        if ($el.length > 0) {
            // only available on initialization
            $el.parent().html(html);
            $content = this.getContentEl();
        } else {
            // otherwise, we use content to fill html
            $content = this.getContentEl();
            $content.html(html);
        }
        if(editable) {
            $content.attr("contenteditable", true);
        }
        if (url && $content.length > 0) {
            url = url.replace(/&/gim, "&amp;");
            // also need to fix duplicate &amp;
            while (url.indexOf("&amp;&amp;") !== -1) {
                url = url.replace("&amp;&amp;", "&amp;");
            }
            $content.attr("data-tileUrl", url);
        }
        if(wysiwyg) {
            await this.setupWysiwyg();
        }
        this.cacheHtml(html);
        this.scanRegistry();
    }
    cacheHtml(html) {
        /* Cache html on the tile element.
            This is only used by the scanRegistry method so
            we can reset the html of the html when running the pattern registry.
            */
        if (this.isRichText()) {
            return; // no patterns, ignore this
        }
        var $content = this.$el.children(".mosaic-tile-content");
        if ($content.length === 0) {
            return;
        }
        if (html === undefined) {
            html = $content.html();
        }
        $content[0]._preScanHTML = html;
    }
    scanRegistry() {
        /*
            A bit tricky here because tiles can contain patterns.
            Pay attention to the use of _preScanHTML.
            If we do not do this, tiles do not render correctly when
            adding, dragging and dropping.
        */
        var $el = this.$el.find(".mosaic-tile-content");
        if ($el.length === 0) {
            return;
        }
        if ($el[0]._preScanHTML) {
            /* reset html because transform has happened */
            $el.html($el[0]._preScanHTML);
        }
        Registry.scan($el);

        // also check the content of the tile and override link handling...
        $("a", $el).on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    select() {
        var self = this;
        if (
            self.$el.hasClass("mosaic-selected-tile") === false &&
            self.$el.hasClass("mosaic-read-only-tile") === false
        ) {
            // un-select existing with stored Tile instance on element
            self.mosaic.document.querySelectorAll(".mosaic-selected-tile").forEach(function(el) {
                $(el).data("mosaic-tile").blur();
            });
            // select current tile
            self.focus();
        }
    }
    blur() {
        this.$el.removeClass("mosaic-selected-tile");
        this.saveForm();
    }
    focus() {
        var self = this;
        self.$el.addClass("mosaic-selected-tile");
        self.$el.find(".mce-content-body").trigger("focus");
        self.initializeButtons();
    }
    saveForm() {
        var self = this;
        var tiletype = self.getType();
        var tile_config = self.getConfig();
        var value;
        if(!tile_config || tile_config.read_only === true) {
            return;
        }
        // Update field values if type is rich text
        if (tile_config.tile_type === "field") {
            switch (tile_config.widget) {
                case "z3c.form.browser.text.TextWidget":
                case "z3c.form.browser.text.TextFieldWidget":
                    var $el = $(
                        `.mosaic-panel .mosaic-${tiletype}-tile`,
                        self.mosaic.document
                    );
                    value = $el.find(".mosaic-tile-content > *").text();
                    $("#" + tile_config.id)
                        .find("input")
                        .val(value);
                    break;
                case "z3c.form.browser.textarea.TextAreaWidget":
                case "z3c.form.browser.textarea.TextAreaFieldWidget":
                case "z3c.form.browser.textlines.TextLinesWidget":
                case "z3c.form.browser.textlines.TextLinesFieldWidget":
                    value = "";
                    $(`.mosaic-panel .mosaic-${tiletype}-tile`, self.mosaic.document)
                        .find(".mosaic-tile-content > *")
                        .each(function () {
                            // use "this" here!
                            value += $(this).text();
                        });
                    value = value.replace(/^\s+|\s+$/g, "");
                    var textarea = document.querySelector(`#${tile_config.id} textarea`);
                    if(!textarea) {
                        log.error(`No textarea with id "${tile_condig.id}" found`)
                        break;
                    }
                    textarea.innerText = value;
                    break;
                case "plone.app.z3cform.widget.RichTextFieldWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                case "plone.app.widgets.dx.RichTextWidget":
                    var textarea = document.querySelector(`#${tile_config.id} textarea`);
                    if(!textarea) {
                        log.error(`No textarea with id "${tile_config.id}" found`);
                        break;
                    }
                    var value = this.tinymce ?
                        this.tinymce.getContent() :
                        $(`.mosaic-${tiletype}-tile .mosaic-tile-content`, self.mosaic.document).html();
                    textarea.innerText = value;
                    // get original tinymce from mockup initialization
                    textarea["pattern-tinymce"].instance.tiny.setContent(value);
                    break;
            }
        } else if (tile_config.tile_type === "textapp") {
            var edit_url = self.getEditUrl();
            if (edit_url) {
                var currentData = self.getHtmlContent();
                if (currentData === self.$el.data("lastSavedData")) {
                    // not dirty, do not save
                    return;
                }
                // we also need to prevent double saving, conflict errors
                if (self.$el.data("activeSave")) {
                    return;
                }
                utils.loading.show();
                self.$el.data("activeSave", true);
                var data = {
                    "_authenticator": utils.getAuthenticator(),
                    "buttons.save": "Save",
                };
                data[tile_config.name + ".content"] = currentData;
                // need to save tile
                self.mosaic.queue(function (next) {
                    $.ajax({
                        url: edit_url,
                        method: "POST",
                        data: data,
                    }).always(function () {
                        self.$el.data("lastSavedData", currentData);
                        self.$el.data("activeSave", false);
                        utils.loading.hide();
                        next();
                    });
                });
            }
        }
    }
    async setupWysiwyg() {
        var self = this;

        // Get element
        var $content = self.$el.find(".mosaic-tile-content");

        if(!$content.length) {
            return;
        }

        // Generate random id to make sure TinyMCE is unique
        var random_id = mosaic_utils.generate_uid();
        var id = "mosaic-rich-text-init-" + random_id;
        $content.attr("id", id);

        // Get tiletype
        var tiletype = self.getType();
        if (this.deprecatedHTMLTiles.indexOf(tiletype) !== -1) {
            // these tiles are deprecated but we still need to be able to edit
            // them... Yes this is a bit ugly but I think it is probably the best
            // way right now.
            tiletype = "plone.app.standardtiles.html";
        }

        // Define placeholder updater
        var _placeholder = function () {
            var $inside = $content.find("p > *");
            if (($inside.length === 0 || ($inside.length === 1 && $inside.is("br"))) &&
                $content.text().replace(/^\s+|\s+$/g, "").length === 0) {
                $content.addClass("mosaic-tile-content-empty");
                if ($content.find("p").length === 0) {
                    $content.empty().append("<p></p>");
                }
            } else {
                $content.removeClass("mosaic-tile-content-empty");
            }
        };

        // Init inline TinyMCE with deactivated menubar
        const TinyMCE = (
            await import("@plone/mockup/src/pat/tinymce/tinymce")
        ).default;

        // deep copy the options to get correct tiny settings!
        var tiny_options = JSON.parse(JSON.stringify(self.mosaic.options.tinymce));
        tiny_options["tiny"]["inline"] = true;
        tiny_options["tiny"]["menubar"] = false;
        tiny_options["tiny"]["selector"] = `#${id}`;
        tiny_options["tiny"]["placeholder"] = _placeholder;

        const tiny_instance = new TinyMCE($content, tiny_options);
        await tiny_instance.init()
        self.tinymce = tiny_instance.instance.tiny;

        // Set editor class
        $content.addClass("mosaic-rich-text-initialized");
    }
}


export default Tile;
