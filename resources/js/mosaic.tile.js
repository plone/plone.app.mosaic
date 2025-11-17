import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import utils from "@plone/mockup/src/core/utils";
import mosaic_utils from "./utils";
import events from "@patternslib/patternslib/src/core/events";
import logging from "@patternslib/patternslib/src/core/logging";
import Modal from "@plone/mockup/src/pat/modal/modal";
import Registry from "@patternslib/patternslib/src/core/registry";

// show debug log by add "loglevel=DEBUG" to the URL_QUERYSTRING
const log = logging.getLogger("pat-mosaic/tile");

var _TILE_TYPE_CACHE = {};
var _TILE_CONFIG_CACHE = {};

const COPYABLE_TILE_TYPES = [
    "app",
    "textapp",
]

var OMIT_SETTINGS_TILE_TYPES = [
    "RichTextFieldWidget",
    "RichTextWidget",
    "TextAreaFieldWidget",
    "TextAreaWidget",
    "TextFieldWidget",
    "TextLinesFieldWidget",
    "TextLinesWidget",
    "TextWidget",
    "WysiwygFieldWidget",
    "WysiwygWidget",
];
var TILE_TYPE_MAPPING = new Map([
    // zope.schema.TextLine
    ["z3c.form.browser.text.TextWidget", "textline"],
    ["z3c.form.browser.text.TextFieldWidget", "textline"],
    ["plone.app.z3cform.widgets.text.TextWidget", "textline"],
    // zope.schema.Text
    ["z3c.form.browser.textarea.TextAreaWidget", "textarea"],
    ["z3c.form.browser.textarea.TextAreaFieldWidget", "textarea"],
    ["z3c.form.browser.textlines.TextLinesWidget", "textarea"],
    ["z3c.form.browser.textlines.TextLinesFieldWidget", "textarea"],
    ["plone.app.z3cform.widgets.text.TextAreaWidget", "textarea"],
    // plone.textfield.RichText
    ["plone.app.z3cform.widget.RichTextFieldWidget", "richtext"],
    ["plone.app.z3cform.widgets.richtext.RichTextFieldWidget", "richtext"],
    ["plone.app.z3cform.widgets.richtext.RichTextWidget", "richtext"],
    ["plone.app.z3cform.wysiwyg.widget.WysiwygWidget", "richtext"],
    ["plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget", "richtext"],
    ["plone.app.widgets.dx.RichTextWidget", "richtext"],
]);

// so we don't get spammed with missing tile warnings
var _missing_tile_configs = [];

/* Tile class */
class Tile {
    _initialized = false;

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
        if (el.jquery) {
            el = el[0];
        }
        if (!el.classList.contains(".mosaic-tile")) {
            self.el = el.closest(".mosaic-tile");
        } else {
            self.el = el
        }
        self.$el = $(self.el);
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
    async serialize() {
        // return JSON serialized dict of saved tile data
        var edit_url = this.getEditUrl();
        let data = {};
        await fetch(
            edit_url,
            {
                method: "GET",
            })
            .then(response => {
                return response.text();
            })
            .then(html => {
                const parser = new DOMParser();
                // Parse the HTML string into a document
                const doc = parser.parseFromString(html, 'text/html');
                // read the form
                const form_data = new FormData(doc.querySelector("form"));

                form_data.forEach((val, key) => {
                    data[key] = val;
                });
            });
        return data;
    }
    async deserialize(data) {
        // saves a JSON object
        var edit_url = this.getEditUrl();
        var url_params = new URLSearchParams(data);
        // add save button to trigger tile saving
        url_params.append("buttons.save", "Save");

        await fetch(
            edit_url,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset: utf-8"
                },
                body: url_params.toString(),
            })
            .then(response => {
                if (!response.ok) {
                    log.warn("Could not deserialize data!");
                }
            });
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
                tile_url = tile_url
                    .replace("X-Tile-Persistent=yes", "")
                    .replace("&&", "&");
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
        if (classNames in _TILE_TYPE_CACHE) {
            return _TILE_TYPE_CACHE[classNames];
        }
        var tiletype = "";
        if (classNames === undefined) {
            return;
        }
        for (const cls of classNames.split(" ")) {
            let classname = cls.match(/^mosaic-([\w.\-]+)-tile$/);
            if (classname !== null) {
                if (
                    classname[1] !== "selected" &&
                    classname[1] !== "new" &&
                    classname[1] !== "read-only" &&
                    classname[1] !== "helper" &&
                    classname[1] !== "original" &&
                    classname[1] !== "edited"
                ) {
                    tiletype = classname[1];
                }
            }
        }

        if (!tiletype) {
            log.error(
                `Could not find tile type on element ${self.$el} with classes: ${classNames}`,
            );
        }

        _TILE_TYPE_CACHE[classNames] = tiletype;
        return tiletype;
    }
    getConfig() {
        var tiletype = this.getType();

        if (tiletype in _TILE_CONFIG_CACHE) {
            return _TILE_CONFIG_CACHE[tiletype];
        }

        // Get tile config
        for (const tile_group of this.mosaic.options.tiles) {
            for (const tile of tile_group.tiles) {
                if (tile.name === tiletype) {
                    // Set settings value
                    if (tile.tile_type === "field") {
                        const widget = tile.widget.split(".").pop();
                        tile.settings = !OMIT_SETTINGS_TILE_TYPES.includes(widget);
                    }
                    // bail out here
                    _TILE_CONFIG_CACHE[tiletype] = tile;
                    return tile;
                }
            }
        }

        // dive out of here, something could went wrong finding tile config
        // this could be a static tile, so it has no config
        if (_missing_tile_configs.indexOf(tiletype) === -1) {
            log.warn(
                "Could not load tile config for tile type: " +
                tiletype +
                " falling back to b/w compatible tile type.",
            );
            _missing_tile_configs.push(tiletype);
        }
        var tile_config = {
            tile_type: "app",
            name: tiletype,
            label: "Unknown",
            read_only: true,
            favorite: false,
            settings: false,
            weight: 0,
            rich_text: false,
        };
        if (this.deprecatedHTMLTiles.includes(tiletype)) {
            // deprecated html tile type, provide b/w compat config
            tile_config.category = "structure";
            tile_config.read_only = false;
            tile_config.label = tiletype;
            tile_config.tile_type = "text";
            tile_config.rich_text = true;
        }
        _TILE_CONFIG_CACHE[tiletype] = tile_config;
        return tile_config;
    }

    getHtmlBody(exportLayout) {
        const tiletype = this.getType();
        const removeClasses = [
            "mosaic-new-tile",
            "mosaic-helper-tile",
            "mosaic-original-tile",
            "mosaic-selected-tile",
            "mosaic-edited-tile",
        ]
        const classes = Array.from(this.el.classList).filter(cls => {
            return !removeClasses.includes(cls);
        });

        // Get tile config
        var tile_config = this.getConfig();

        let body = `<div class="${classes.join(' ')}">\n<div class="mosaic-tile-content">\n`;

        // Predefine vars
        switch (tile_config.tile_type) {
            case "text":
                body += `${this.$el.children('.mosaic-tile-content .mce-content-body').html()}\n`;
                break;
            case "app":
            case "textapp":
                var url = this.getUrl();
                if (exportLayout) {
                    // we want to provide default value here for exporting this layout
                    var data =
                        this.$el
                            .children(".mosaic-tile-content .mce-content-body")
                            .html() + "\n";
                    // convert to url valid value
                    if (url.indexOf("?") === -1) {
                        url += "?";
                    } else {
                        url += "&";
                    }
                    url += "content=" + encodeURI(data);
                }
                body += `<div data-tile="${url}"></div>\n`;
                break;
            case "field":
                // Calc url
                var tile_url = `./@@plone.app.standardtiles.field?field=${tiletype}`;

                // ability to provide a few additional settings for field tiles
                // can be useful in formatting field tiles in python
                // subfield is meant for relation fields
                var subfield = this.getValueFromClasses(classes, "mosaic-subfield-");
                if (subfield) {
                    tile_url += `&subfield=${subfield}`;
                }
                var format = this.getValueFromClasses(classes, "mosaic-format-");
                if (format) {
                    tile_url += `&format=${format}`;
                }

                body += `<div data-tile="${tile_url}"></div>\n`;

                // Update field values if type is rich text
                this.save();
                break;
        }

        body += "</div>\n</div>\n";

        return body;
    }

    isRichText(tile_config) {
        if (tile_config === undefined) {
            tile_config = this.getConfig();
        }
        if (this.$el.hasClass("mosaic-read-only-tile") || tile_config.read_only) {
            return false;
        }
        if (
            (tile_config.tile_type === "text" && tile_config.rich_text) ||
            (tile_config.tile_type === "textapp" && tile_config.rich_text) ||
            (tile_config.tile_type === "app" && tile_config.rich_text) ||
            (tile_config.tile_type === "field" &&
                TILE_TYPE_MAPPING.get(tile_config.widget) === "richtext")
        ) {
            return true;
        } else {
            return false;
        }
    }
    async initialize() {
        var self = this;

        if (self._initialized) {
            // only initialize once
            return;
        }

        if (!self.el.parentElement) {
            // This is in case, when mosaic markup is copied into
            // richtext tiles ... do not parse those nested tiles!
            return;
        }

        var tile_config = self.getConfig();

        if (tile_config) {
            // check read only
            if (tile_config.read_only) {
                self.el.classList.add("mosaic-read-only-tile");
            }

            // check copy support
            if (COPYABLE_TILE_TYPES.includes(tile_config.tile_type)) {
                self.el.classList.add("copyable");
            }

            var side_tools = $(self.mosaic.document.createElement("div")).addClass(
                "mosaic-tile-control mosaic-tile-side-tools",
            );

            self.$el.prepend(
                side_tools.append(
                    $(self.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-label content")
                        .html(tile_config.label),
                ),
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
                        .hide(),
                );
            }
        }

        self.makeMovable();
        await self.initializeButtons();

        // available divider/tiledrop positions
        let divider_pos = ["top", "bottom"];

        if (!self.el.closest(".mosaic-grid-row").classList.contains("mosaic-fixed-row")) {
            // if not fixed grid row, add left/right dividers too
            // otherwise, tiles can only be added to top/bottom
            divider_pos.push(...["right", "left"]);
        }

        for (const pos of divider_pos) {
            const divider = self.mosaic.document.createElement("div");
            divider.classList.add("mosaic-divider", `mosaic-divider-${pos}`);
            self.el.prepend(divider);
        }

        // convenience: store Tile instance on dom and jquery
        self.el["mosaic-tile"] = self;
        self.$el.data("mosaic-tile", self);

        self._initialized = true;
        log.debug(`Initialized ${tile_config.id || tile_config.name}`);
    }

    resetClicked(e) {
        e.preventDefault();
        var self = this;

        self.$el
            .parent()
            .removeClass(
                "col-1 col-2 col-3 col-4 col-5 col-6 col-7 col-8 col-9 col-10 col-11 col-12",
            )
            .addClass("col");

        $(e.target).closest(".reset").remove();

        // Get original row
        var $originalRow = self.$el.parent().parent();

        // Cleanup original row
        $originalRow.mosaicCleanupRow();
        $originalRow.mosaicSetResizeHandles();
    }

    async initializeButtons() {
        var buttons = [];
        var tile_config = this.getConfig();

        // remove existing
        const btns_node = this.el.querySelectorAll(".mosaic-tile-buttons");
        for (const btn_node of btns_node) {
            btn_node.remove();
        }

        var _addButton = async ({ label = "", name = "", icon_name = "", onclick = null, onmousedown = null, css_class = "", title = "", disabled = false }) => {
            const btn = document.createElement("button");
            btn.classList.add("btn", "btn-sm", `btn-${name === "confirm" ? "danger" : "secondary"}`, "mosaic-btn-" + name);
            if (css_class) {
                btn.classList.add(...css_class.split(" "));
            }
            if (label) {
                btn.textContent = label;
            }
            if (title) {
                btn.setAttribute("title", title);
            }
            try {
                // get plone icons from utils
                const icon = await utils.resolveIcon(icon_name);
                btn.innerHTML = icon + btn.innerHTML;
                btn.querySelector("svg").classList.add("plone-icon", "me-1");
            } catch (err) {
                log.warn(`could not find button icon "${name}" (${err})`);
            }
            if (onclick != undefined) {
                btn.addEventListener("click", onclick.bind(this));
            }
            if (onmousedown != undefined) {
                btn.addEventListener("mousedown", onmousedown.bind(this));
            }
            if (disabled) {
                btn.disabled = true;
            }
            buttons.push(btn);
            return btn;
        };

        // Add move icon
        await _addButton({ name: "move", icon_name: "arrows-move", onmousedown: this.moveTile, disabled: !this.el.classList.contains("movable"), title: "Click and drag to move tile" });

        // Add copy icon
        await _addButton({ name: "copy", icon_name: "copy", onmousedown: this.copyTile, disabled: !this.el.classList.contains("copyable"), title: "Click and drag to copy tile" });

        // Add settings icon
        if (
            tile_config &&
            tile_config.settings &&
            !this.el.classList.contains(".mosaic-read-only-tile")
        ) {
            await _addButton({ label: "Edit", name: "settings", icon_name: "sliders", onclick: this.settingsClicked, title: "Edit settings" });
        }

        if (!this.mosaic.hasContentLayout) {
            // delete
            await _addButton({ label: "Delete", name: "delete", icon_name: "trash3", onclick: this.deleteClicked, title: "Delete tile" });

            // confirm delete
            var confirmBtn = await _addButton({
                label: "Confirm delete",
                name: "confirm",
                icon_name: "check-circle",
                onclick: this.confirmClicked,
            });
            confirmBtn.style.display = "none";

            // cancel delete
            var cancelBtn = await _addButton({ label: "Cancel", name: "cancel", icon_name: "x-circle", onclick: this.cancelClicked });
            cancelBtn.style.display = "none";
        }

        if (buttons.length > 0) {
            var $btns = $("<div />").addClass("mosaic-tile-control mosaic-tile-buttons");
            for (const btn of buttons) {
                $btns.append($(btn));
            }
            this.$el.prepend($btns);
        }
    }

    moveTile(e) {
        e.preventDefault();
        // reuse drag handle to move tile
        this.el.closest(".mosaic-tile").querySelector(".mosaic-drag-handle").dispatchEvent(new MouseEvent("mousedown", {
            view: window,
            bubbles: true,
        }));
    }

    copyTile(e) {
        e.preventDefault();
        // add copy class to mosaic-panel and reuse drag handle to copy tile
        this.el.closest(".mosaic-panel").classList.add("mosaic-panel-dragging-copy");
        this.moveTile(e);
    }

    cancelClicked(e) {
        e.preventDefault();
        this.el.querySelectorAll(".mosaic-btn-cancel, .mosaic-btn-confirm").forEach(btn => {
            btn.style.display = "none";
        });
        this.el.querySelectorAll(".mosaic-btn-settings, .mosaic-btn-delete").forEach(btn => {
            btn.style.display = "block";
        });
    }
    deleteClicked(e) {
        e.preventDefault();
        this.el.querySelectorAll(".mosaic-btn-delete, .mosaic-btn-settings").forEach(btn => {
            btn.style.display = "none";
        });
        this.el.querySelectorAll(".mosaic-btn-cancel, .mosaic-btn-confirm").forEach(btn => {
            btn.style.display = "block";
        });
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

                const data = new URLSearchParams({
                    "buttons.delete": "Delete",
                    "_authenticator": utils.getAuthenticator(),
                });

                fetch(
                    self.getDeleteUrl(),
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset: utf-8",
                            "X-Requested-With": "XMLHttpRequest",  // do not redirect to nextUrl after deleting
                        },
                        body: data.toString(),
                    })
                    .then(response => {
                        if (!response.ok) {
                            alert(`Could not delete tile ${tile_url}: ${response.statusText}`);
                            return;
                        }
                        return response.json();
                    })
                    .catch((err) => {
                        log.warn(`Error while delete tile ${tile_url}: ${err}`);
                    });
            }
        }

        // If we have a tinymce instance initialized we have to destroy it
        const tile_content = el.querySelector(".mosaic-tile-content");

        if (tile_content["pattern-tinymce"]) {
            tile_content["pattern-tinymce"].destroy();
        }

        // Remove empty rows
        this.mosaic.panels.find(".mosaic-empty-row").remove();

        // Get original row
        var $originalRow = this.$el.parent().parent();

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
                onSuccess: (event, response, state, xhr) => {
                    var tileUrl = xhr.getResponseHeader("X-Tile-Url");
                    if (!tileUrl) {
                        return;
                    }
                    var value = self.mosaic.getDomTreeFromHtml(response);
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
                },
            },
            backdropOptions: {
                closeOnClick: false,
            },
            ajaxUrl: tile_url,
            modalSizeClass: "modal-lg",
            position: "center top",
        });
        modal.$el.off("after-render");
        modal.on("after-render", function () {
            if (self.mosaic.hasContentLayout) {
                // not a custom layout, make sure the form knows
                $("form", modal.$modal).append(
                    $('<input type="hidden" name="X-Tile-Persistent" value="yes" />'),
                );
            }
        });
        modal.show();
    }
    makeMovable() {
        // If the tile is movable
        if (
            this.$el.hasClass("movable") &&
            this.mosaic.options.canChangeLayout &&
            !this.mosaic.hasContentLayout
        ) {
            // Add drag handle
            this.$el.prepend(
                $(this.mosaic.document.createElement("div")).addClass(
                    "mosaic-tile-control mosaic-drag-handle",
                ),
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
    async initializeContent(created, is_copy) {
        var self = this;

        var base = self.mosaic.document.body.dataset.basUrl || null;
        if (!base) {
            base = $("head > base", self.mosaic.document).attr("href");
        }
        var href = this.getUrl();

        // Get tile type
        var tile_config = this.getConfig();

        if (tile_config.tile_type === "field") {
            // Check if a field tile
            let fieldhtml = "";
            let fieldval = "";
            let start = "<div>";
            let end = "</div>";
            let innereditable = false;

            // Wrap title and description fields for proper styles
            // and make the inner node editable
            if (tile_config.name === "IDublinCore-title") {
                start = '<h1 class="documentFirstHeading" contenteditable="true">';
                end = "</h1>";
                innereditable = true;
            } else if (tile_config.name === "IDublinCore-description") {
                start = '<p class="documentDescription lead" contenteditable="true">';
                end = "</p>";
                innereditable = true;
            }

            let contenteditable = false;
            let wysiwyg = false;

            const tile_widget_type = TILE_TYPE_MAPPING.get(tile_config.widget);

            if (tile_widget_type === "textline") {
                fieldval = $("#" + tile_config.id)
                    .find("input")
                    .attr("value");
                fieldhtml = `${start}${fieldval}${end}`;
                contenteditable = true;
            } else if (tile_widget_type === "textarea") {
                fieldval = $("#" + tile_config.id)
                    .find("textarea")
                    .val()
                    .split("\n");
                fieldhtml = `${start}${fieldval.join("<br/>")}${end}`;
                contenteditable = true;
            } else if (tile_widget_type === "richtext") {
                fieldhtml = document.querySelector(`#${tile_config.id} textarea`).value;
                wysiwyg = true;
            } else {
                fieldhtml = (
                    `<div class="text-bg-secondary">` +
                    `Placeholder for field:<br/>` +
                    `<b>${tile_config.label}</b>` +
                    `</div>`
                );
            }

            await self.fillContent({
                html: !is_copy ? fieldhtml : null,
                editable: !tile_config.read_only && contenteditable && !innereditable,
                wysiwyg: wysiwyg,
            });

        } else if (tile_config) {
            // Get data from app tile
            self.$el.addClass("mosaic-tile-loading");
            let url = base ? [base, href].join("/").replace(/\/+\.\//g, "/") : href;
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
            fetch(
                url,
                {
                    method: "GET",

                })
                .then(response => {
                    if (!response.ok) {
                        alert(`error loading tile ${tile_config.label} (${tile_config.name}).`)
                        return;
                    }
                    return response.text();
                })
                .then(async html => {
                    self.$el.removeClass("mosaic-tile-loading");
                    let value = self.mosaic.getDomTreeFromHtml(html);

                    // Add head tags
                    self.mosaic.addHeadTags(href, value);
                    var tileHtml = value.find(".temp_body_tag").html();
                    var tiletype = self.getType();

                    await self.fillContent({
                        html: !is_copy ? tileHtml : null,
                        url: original_url,
                        wysiwyg: tiletype === "plone.app.standardtiles.html",
                        created: created,
                    });
                });
        }
    }

    async fillContent({ html, url, editable, wysiwyg, created }) {
        // need to replace the data-tile node here
        var $el = this.getDataTileEl();
        if (html != null) {
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
            if (editable) {
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
        }
        if (wysiwyg) {
            await this.setupWysiwyg(created);
        }
        this.cacheHtml(html);
        await this.scanRegistry();
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
    async scanRegistry() {
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
        log.debug("select ↓", this);
        if (
            !this.el.classList.contains("mosaic-selected-tile") &&
            !this.el.classList.contains("mosaic-read-only-tile")
        ) {
            // un-select existing with stored Tile instance on element
            this.mosaic.document
                .querySelectorAll(".mosaic-selected-tile")
                .forEach(async el => await el["mosaic-tile"].blur());
            // select current tile
            this.focus();
        }
    }
    async blur() {
        log.debug("blur ↓", this);
        this.el.classList.remove("mosaic-selected-tile");
        await this.save();
    }
    async focus() {
        log.debug("focus ↓", this);
        this.el.classList.add("mosaic-selected-tile");
        this.$el.find(".mce-content-body").trigger("focus");
        await this.initializeButtons();
    }
    async save() {
        log.debug("save ↓", this);
        var self = this;
        var tiletype = self.getType();
        var tile_config = self.getConfig();

        if (!tile_config || tile_config.read_only === true) {
            return;
        }

        if (tile_config.tile_type === "field") {
            // save contenteditable schema field values.
            // NOTE: the other field values are saved via "settings" modal
            // already. No action needed here.
            const el = self.mosaic.document.querySelector(
                `.mosaic-${tiletype}-tile [contenteditable]`,
            );
            const wrapper_el = self.mosaic.document.querySelector(`#${tile_config.id}`);

            if (!el || !wrapper_el) {
                return;
            }

            const tile_widget_type = TILE_TYPE_MAPPING.get(tile_config.widget);
            const value =
                tile_widget_type === "richtext"
                    ? el.innerHTML
                    : el.innerText.replace(/^\s+|\s+$/g, "");

            const form_el =
                tile_widget_type === "textline"
                    ? wrapper_el.querySelector("input")
                    : wrapper_el.querySelector("textarea");
            form_el.value = value;
            if (form_el["pattern-tinymce"]) {
                form_el["pattern-tinymce"].instance.tiny.setContent(value);
            }

        } else if (tile_config.tile_type === "textapp") {
            // save app tiles with plone.app.blocks
            var edit_url = self.getEditUrl();
            if (!edit_url) {
                log.debug(`no url found for tile ${tile_config.name}: ${edit_url} -> not saving.`);
                return;
            }
            var currentData = self.getHtmlContent();
            if (currentData === (self.el.lastSavedData || "")) {
                // no changes
                log.debug(`no changes in ${tile_config.name} -> not saving.`);
                return;
            }

            self.mosaic.saving_tile = true;
            utils.loading.show();

            // Normalize internal resolveuid links before saving.
            // In some editing contexts the editor can produce links that include
            // the portal/site name (e.g. "/Plone/resolveuid/<uid>") or even the
            // full absolute portal URL. Storing those absolute URLs can break the
            // resolveuid transform when the viewing site URL differs from the
            // editing URL. Convert such occurrences to a relative "../resolveuid/...".
            let normalizedData = currentData.replace(/(["'])[^'"]+\/resolveuid\//g, '$1../resolveuid/');

            var data = {
                "_authenticator": utils.getAuthenticator(),
                "buttons.save": "Save",
            };
            data[tile_config.name + ".content"] = normalizedData;

            // save tile
            const body = new URLSearchParams(data);

            try {
                const response = await fetch(edit_url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset: utf-8",
                    },
                    body: body.toString(),
                });

                if (!response.ok) {
                    log.error(`Could not save tile: ${response.statusText}`);
                } else {
                    // store normalized data as lastSavedData so subsequent diffs match
                    self.el.lastSavedData = normalizedData;
                    log.debug(`successfully saved ${tile_config.name} with data "${normalizedData}"`);
                }
            } catch (error) {
                log.error(`Error while save tile ${tile_config.name}: ${error}`);
            }

            self.mosaic.saving_tile = false;
            utils.loading.hide();
        }

    }

    async setupWysiwyg(created) {
        var self = this;

        // Get element
        var $content = self.$el.find(".mosaic-tile-content");

        if (!$content.length) {
            return;
        }

        // Generate random id to make sure TinyMCE is unique
        var random_id = mosaic_utils.generate_uid();
        var id = "mosaic-rich-text-init-" + random_id;
        $content.attr("id", id);

        // Get tiletype
        var tiletype = self.getType();
        if (this.deprecatedHTMLTiles.includes(tiletype)) {
            // these tiles are deprecated but we still need to be able to edit
            // them... Yes this is a bit ugly but I think it is probably the best
            // way right now.
            tiletype = "plone.app.standardtiles.html";
        }

        if (
            created &&
            $content.text() === "" &&
            tiletype === "plone.app.standardtiles.html"
        ) {
            // fill with default value if empty
            const config = self.getConfig();
            $content.html(config?.default_value);
        }

        // deep copy the options to get correct tiny settings!
        var tiny_options = JSON.parse(JSON.stringify(self.mosaic.options.tinymce));

        // we have to set the pat-tinymce inline options explicitly
        // to false otherwise our editable mosaic tile content gets hidden
        // if the site has inline mode globally activated
        // see tinymce--implementation.js in mockup
        tiny_options["inline"] = false;

        // always show inline TinyMCE in mosaic editor
        tiny_options["tiny"]["inline"] = true;
        tiny_options["tiny"]["toolbar_mode"] = "scrolling";
        tiny_options["tiny"]["menubar"] = false;
        tiny_options["tiny"]["selector"] = `#${id}`;
        tiny_options["tiny"]["placeholder"] = "\u2026";

        // remove "content_css" from config
        delete tiny_options["tiny"]["content_css"];

        const tiny_instance = new Registry.patterns["tinymce"]($content, tiny_options);
        // wait until ready.
        await events.await_pattern_init(tiny_instance);
        self.tinymce = tiny_instance.instance.tiny;

        // Set editor class
        $content.addClass("mosaic-rich-text-initialized");
    }
}

export default Tile;
