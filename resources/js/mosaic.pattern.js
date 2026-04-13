// Layout Mosaic pattern.
import $ from "jquery";
import _ from "underscore";
import Base from "@patternslib/patternslib/src/core/base";
import utils from "@plone/mockup/src/core/utils";
import Modal from "@plone/mockup/src/pat/modal/modal";
import logging from "@patternslib/patternslib/src/core/logging";

import Overlay from "./mosaic.overlay";
import Panel from "./mosaic.panel";
import Tile from "./mosaic.tile";
import Toolbar from "./mosaic.toolbar";

import SelectLayoutTemplate from "./templates/select_layout.xml";
import SaveLayoutTemplate from "./templates/save_layout.xml";
import ManageLayoutsTemplate from "./templates/manage_layouts.xml";
import DeleteLayoutTemplate from "./templates/delete_layout.xml";

const log = logging.getLogger("pat-mosaic");

export default Base.extend({
    name: "layout",
    trigger: ".pat-layout",
    parser: "mockup",

    default: {
        url: "",
        type: "",
        ignore_context: false,
        tileheadelements: [],
        available_layouts: [],
        overlay_hide_fields: true,
        disable_edit_bar: true,
    },

    // mosaic API
    document: null,
    loaded: false,
    saving: false,
    saving_tile: false,
    hasContentLayout: true,
    selectLayoutTemplate: _.template(SelectLayoutTemplate),
    saveLayoutTemplate: _.template(SaveLayoutTemplate),
    manageLayoutsTemplate: _.template(ManageLayoutsTemplate),
    deleteLayoutTemplate: _.template(DeleteLayoutTemplate),

    init: async function () {
        const self = this;
        self._debugStartTime = performance.now();
        self.debug = new URLSearchParams(window.location.search).has("debug");
        self._debugTimings = [];

        import("../scss/mosaic.pattern.scss");

        // extend options
        self.options = {
            ...self.default,
            ...self.options,
        };

        let match;
        self.options.url = window.document.location.href;

        // Get the url of the page
        match = self.options.url.match(/^([\w#!:.?+=&%@!\-\/]+)\/edit(.*)$/);
        if (match) {
            self.options.url = match[1];
        }

        // Chop add
        match = self.options.url.match(
            /^([\w#:.?=%@!\-\/]+)\/\+\+add\+\+([\w#!:.?+=&%@!\-\/]+)$/,
        );
        if (match) {
            self.options.url = match[1];
            self.options.type = match[2];
            self.options.ignore_context = true;
        }

        log.debug(self.options);

        // main page
        self.document = window.document;

        // init actionManager and layoutManager in parallel
        const [{ default: ActionManager }, { default: LayoutManager }] = await Promise.all([
            import("./mosaic.actions"),
            import("./mosaic.layout"),
        ]);
        self.actionManager = new ActionManager(self);
        self.actionManager.initActions();
        self.layoutManager = new LayoutManager(self);

        const contentLayout = self.getSelectedContentLayout();
        if (contentLayout) {
            await self.applyLayout(contentLayout);
        } else {
            var contentRaw = $(self.options.customContentLayout_field_selector).val();
            if (!contentRaw) {
                self.selectLayout(true);
            } else {
                var $content = self.getDomTreeFromHtml(contentRaw);
                if ($content.attr("id") === "no-layout") {
                    self.selectLayout(true);
                } else {
                    $("body").addClass("mosaic-layout-customized");
                    self.hasContentLayout = false;
                    await self._init($content);
                }
            }
        }
    },

    initialized: function () {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        utils.loading.hide();
    },

    getSelectedContentLayout: function () {
        return $(this.options.contentLayout_field_selector).val();
    },

    setSelectedContentLayout: function (value) {
        var self = this;
        if (value) {
            self.hasContentLayout = true;
            // Need to hide these buttons when not in custom content layout mode
            $(".mosaic-toolbar-secondary-functions", self.document).addClass("d-none");
            $("body").removeClass("mosaic-layout-customized");
        } else {
            $("body").addClass("mosaic-layout-customized");
            self.hasContentLayout = false;
        }
        return $(self.options.contentLayout_field_selector).attr("value", value);
    },

    _initPanels: async function ($content) {
        var self = this;
        self.options.layout = $content.attr("data-layout");

        // Drop panels within panels (only the top level panels are editable)
        $("[data-panel] [data-panel]", self.document).removeAttr("data-panel");

        $content.find("[data-panel]").each(function () {
            var panel = new Panel(this);
            panel.initialize($content);
        });
        // Pre-fill new panels from the layout
        $("[data-panel]", self.document).each(function () {
            var panel = new Panel(this);
            panel.prefill();
        });

        self.panels = $(".mosaic-panel", self.document);

        // initialize layoutManager
        await self.layoutManager.initialize();
    },

    _init: async function (content) {
        var self = this;

        await self._initPanels(content);

        // Init overlay
        self.overlay = new Overlay(self.options, self.panels);
        self.overlay.initialize();

        // Init toolbar
        self.toolbar = new Toolbar(self);
        await self.toolbar.initToolbar();

        if (self.options.disable_edit_bar) {
            // on enabling: hide toolbar, add mosaic class, disable body toolbar classes
            document.getElementById("edit-bar").style.display = "none";
            // somehow there was a problem filtering the classes with el.classList.forEach()
            // converting it to a list and filtering it does the trick
            document.body.className = [...document.body.classList].filter(cls => !cls.startsWith("plone-toolbar")).join(" ");
        }

        // Add blur to the rest of the content.
        // Recursively walk the DOM tree, pruning subtrees that can be
        // blurred entirely or are excluded. This avoids the original
        // querySelectorAll("*") + getComputedStyle() on 500-2000+ elements
        // and only visits the "spine" leading to excluded elements (~50-100).
        const blurExcludeSelectors = ".mosaic-toolbar, .mosaic-panel, .mosaic-notifications, .modal-wrapper, .modal-backdrop, .alert, .tox, #edit-zone, #edit-bar, #global_statusmessage";
        const applyBlur = (parent) => {
            for (const child of parent.children) {
                if (child.matches(blurExcludeSelectors)) continue;
                if (child.querySelector(blurExcludeSelectors)) {
                    // Contains excluded content — recurse to blur siblings
                    applyBlur(child);
                } else {
                    // No excluded content inside — blur entire subtree
                    child.classList.add("mosaic-blur");
                }
            }
        };
        applyBlur(document.body);

        document.body.classList.add("mosaic-enabled");
        self.initialized();

        if (self.debug) {
            // Switch all panels to advanced mode to show tile labels
            document.querySelectorAll(".mosaic-panel").forEach(function (panel) {
                panel.classList.add("mosaic-advanced");
            });
            self._renderDebugOverlay();
        }
    },

    _renderDebugOverlay: function () {
        var self = this;
        var totalTime = (performance.now() - self._debugStartTime).toFixed(1);
        var timings = self._debugTimings.slice().sort((a, b) => b.duration - a.duration);

        var el = document.createElement("div");
        el.id = "mosaic-debug";
        el.style.cssText = "position:fixed;bottom:10px;right:10px;z-index:99999;" +
            "background:rgba(0,0,0,0.88);color:#0f0;font:12px/1.5 monospace;" +
            "padding:12px 16px;border-radius:8px;max-height:50vh;overflow:auto;" +
            "pointer-events:auto;min-width:340px;";

        var html = "<div style='font-size:14px;font-weight:bold;margin-bottom:8px;color:#fff'>" +
            "Mosaic Debug</div>" +
            "<div>Total init: <b>" + totalTime + " ms</b></div>" +
            "<div>Tiles: <b>" + timings.length + "</b></div>" +
            "<hr style='border-color:#444;margin:8px 0'>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            "<tr style='color:#aaa'><th style='text-align:left;padding:2px 8px 2px 0'>Tile</th>" +
            "<th style='text-align:right;padding:2px 0'>ms</th></tr>";

        timings.forEach(function (t) {
            var color = t.duration > 200 ? "#f44" : t.duration > 50 ? "#fa0" : "#0f0";
            html += "<tr><td style='padding:2px 8px 2px 0;white-space:nowrap;max-width:250px;" +
                "overflow:hidden;text-overflow:ellipsis'>" + self._escapeHtml(t.name) + "</td>" +
                "<td style='text-align:right;color:" + color + "'>" + t.duration.toFixed(1) + "</td></tr>";
        });

        html += "</table>";
        el.innerHTML = html;
        document.body.appendChild(el);
    },

    _escapeHtml: function (str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    },

    applyLayout: async function (layoutPath) {
        var self = this;
        utils.loading.show();

        try {
            var response = await fetch(
                $("body").attr("data-portal-url") + "/" + layoutPath,
                { cache: "no-cache" }
            );
            if (!response.ok) {
                throw new Error(response.status === 404 ? "Not Found" : response.statusText);
            }
            var layoutHtml = await response.text();
            var $content = self.getDomTreeFromHtml(layoutHtml);
            self.setSelectedContentLayout(layoutPath);
            if (self.loaded) {
                await self._initPanels($content);
            } else {
                await self._init($content);
            }
            self.toolbar.SelectedTileChange();
        } catch (err) {
            if (err.message === "Not Found") {
                window.alert(
                    `Specified layout can not be found: ${layoutPath}. Loading default layout.`,
                );
            } else {
                window.alert(
                    `Error loading layout specified for this content: ${layoutPath}, "${err.message}". Falling back to basic layout.`,
                );
            }
            if (layoutPath !== "++contentlayout++default/basic.html") {
                await self.applyLayout("++contentlayout++default/basic.html");
            }
        } finally {
            utils.loading.hide();
        }
    },

    _hasCustomLayouts: function () {
        if (this.options.user_layouts.length > 0) {
            return true;
        }
        return (
            this.options.available_layouts.filter(function (layout) {
                return layout.path.indexOf("custom/") !== -1;
            }).length > 0
        );
    },

    _deleteLayout: function (layout, existing, callback) {
        var self = this;
        var $el = $("<div/>").appendTo("body");
        var modal = new Modal($el, {
            html: self.deleteLayoutTemplate(
                $.extend(
                    {},
                    true,
                    {
                        existing: existing,
                        layout_deleting: layout,
                        selected:
                            self.getSelectedContentLayout() ===
                            "++contentlayout++" + layout.path,
                    },
                    self.options,
                ),
            ),
            content: null,
        });

        modal.on("shown", function () {
            $("button.delete:visible", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    utils.loading.show();
                    var replacement = $("#layoutField", modal.$modal).val();
                    $.ajax({
                        url:
                            $("body").attr("data-base-url") +
                            "/@@manage-layouts-from-editor",
                        data: {
                            action: "deletelayout",
                            layout: layout.path,
                            replacement: replacement,
                            _authenticator: utils.getAuthenticator(),
                        },
                    })
                        .done(async function (data) {
                            modal.hide();
                            callback(data);
                            if (
                                replacement &&
                                self.getSelectedContentLayout() ===
                                "++contentlayout++" + layout.path
                            ) {
                                await self.applyLayout(
                                    "++contentlayout++" + replacement,
                                );
                            }
                        })
                        .fail(function () {
                            window.alert("Error deleting layout");
                        })
                        .always(function () {
                            utils.loading.hide();
                        });
                });
            $("button.cancel:visible", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    modal.hide();
                });
        });
        modal.show();
    },

    deleteLayout: function (layout, callback) {
        var self = this;
        utils.loading.show();
        $.ajax({
            url: $("body").attr("data-base-url") + "/@@manage-layouts-from-editor",
            data: {
                action: "existing",
                layout: layout.path,
            },
        })
            .done(function (data) {
                self._deleteLayout(layout, data.data, callback);
            })
            .fail(function () {
                window.alert("Error loading data for existing assignments");
            })
            .always(function () {
                utils.loading.hide();
            });
    },

    manageCustomLayouts: function () {
        var self = this;
        var $el = $("<div/>").appendTo("body");
        var modal = new Modal($el, {
            html: self.manageLayoutsTemplate($.extend({}, true, {}, self.options)),
            content: null,
        });

        modal.on("shown", function () {
            $(".delete-layout", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    var layout_id = $(this).attr("data-layout");
                    self.options.available_layouts
                        .concat(self.options.user_layouts)
                        .forEach(function (l) {
                            if (l.path === layout_id) {
                                return self.deleteLayout(l, function (data) {
                                    // callback for when the delete is complete and we need to reload data...
                                    // reload it...
                                    self.options.available_layouts =
                                        data.available_layouts;
                                    self.options.user_layouts = data.user_layouts;
                                    modal.hide();
                                    self.manageCustomLayouts();
                                });
                            }
                        });
                });
        });
        modal.show();
    },

    selectLayout: async function (initial) {
        var self = this;
        if (initial !== undefined && initial) {
            // check if there is only 1 available layout and auto select
            // if that is the case.
            if (self.options.available_layouts.length === 1) {
                var layout = self.options.available_layouts[0];
                var layoutPath =
                    "++contentlayout++" + layout.directory + "/" + layout.file;
                await self.applyLayout(layoutPath);
                return;
            }
        }
        if (self.options.available_layouts.length === 0) {
            // use backup layout
            await self.applyLayout("++contentlayout++default/basic.html");
            return;
        }
        var $el = $("<div/>").appendTo("body");
        var modal = new Modal($el, {
            html: self.selectLayoutTemplate(
                $.extend(
                    {},
                    true,
                    {
                        hasCustomLayouts: self._hasCustomLayouts(),
                        portal_url: $("body").attr("data-portal-url"),
                    },
                    self.options,
                ),
            ),
            content: null,
            modalSizeClass: "modal-lg",
            position: "left top",
        });
        modal.on("shown", function () {
            $(".manage-custom-layouts a", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    modal.hide();
                    self.manageCustomLayouts();
                });
            $("li a", modal.$modal)
                .off("click")
                .on("click", async function (e) {
                    e.preventDefault();
                    var layoutPath;
                    var layout_id = $(this).attr("data-value");
                    for (const l of self.options.available_layouts.concat(
                        self.options.user_layouts,
                    )) {
                        if (l.path === layout_id) {
                            layoutPath = "++contentlayout++" + l.path;
                        }
                    }
                    if (!layoutPath) {
                        alert("Layout does not exist!");
                        return;
                    }
                    modal.hide();
                    await self.applyLayout(layoutPath);
                });
        });
        modal.show();
    },

    saveLayout: function () {
        var self = this;
        var $el = $("<div/>").appendTo("body");
        var modal = new Modal($el, {
            html: self.saveLayoutTemplate(
                $.extend(
                    {},
                    true,
                    {
                        hasCustomLayouts: self._hasCustomLayouts(),
                    },
                    self.options,
                ),
            ),
            content: null,
        });
        modal.on("shown", function () {
            $("button:visible", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    var layoutName = $("#layoutNameField", modal.$modal).val();
                    if (!layoutName) {
                        return;
                    }
                    utils.loading.show();
                    e.preventDefault();
                    var globalLayout = "false";
                    var $el = $("#globalLayout", modal.$modal);
                    if ($el.length > 0 && $el[0].checked) {
                        globalLayout = "true";
                    }
                    $.ajax({
                        url:
                            $("body").attr("data-base-url") +
                            "/@@manage-layouts-from-editor",
                        method: "POST",
                        data: {
                            action: "save",
                            _authenticator: utils.getAuthenticator(),
                            global: globalLayout,
                            name: layoutName,
                            layout: self.layoutManager.getPageContent(true),
                        },
                    })
                        .done(async function (result) {
                            if (result.success) {
                                self.options.available_layouts =
                                    result.available_layouts;
                                self.options.user_layouts = result.user_layouts;
                                await self.applyLayout(result.layout);
                            }
                        })
                        .fail(function () {
                            window.alert("Error saving layout");
                        })
                        .always(function () {
                            utils.loading.hide();
                            modal.hide();
                        });
                });
        });
        modal.show();
    },

    save: function () {
        log.debug("Save document...")
        const editForm = this.el.closest("form");

        if (!editForm) {
            alert("Could not save! Please reload...");
        }

        // do not war about unloading when saving
        editForm["pattern-formunloadalert"]._suppressed = true;

        log.debug("GOOD BYE!");
        this.document.getElementById("form-buttons-save").click();
    },

    getDomTreeFromHtml: function (content) {
        // Use DOMParser for efficient HTML parsing instead of regex replacements
        var doc = new DOMParser().parseFromString(content, "text/html");

        // Build a structure compatible with existing code that uses temp_*_tag classes
        var wrapper = document.createElement("div");
        wrapper.className = "temp_html_tag";

        // Copy html element attributes (e.g. data-layout)
        for (var attr of doc.documentElement.attributes) {
            wrapper.setAttribute(attr.name, attr.value);
        }

        var headWrapper = document.createElement("div");
        headWrapper.className = "temp_head_tag";
        while (doc.head.firstChild) {
            headWrapper.appendChild(doc.head.firstChild);
        }

        var bodyWrapper = document.createElement("div");
        bodyWrapper.className = "temp_body_tag";
        // Copy body attributes (e.g. data-layout, data-panel)
        for (var attr of doc.body.attributes) {
            bodyWrapper.setAttribute(attr.name, attr.value);
        }
        while (doc.body.firstChild) {
            bodyWrapper.appendChild(doc.body.firstChild);
        }

        wrapper.appendChild(headWrapper);
        wrapper.appendChild(bodyWrapper);
        return $(wrapper);
    },

    removeHeadTags: function (url) {
        if (!url || url === "undefined") {
            return;
        }
        var self = this;

        // Local variables
        var tile_type_id, html_id, headelements, i;

        // Calc delete url
        url = url.split("?")[0];
        url = url.split("@@");
        tile_type_id = url[1].split("/");
        url =
            url[0] +
            "@@delete-tile?type=" +
            tile_type_id[0] +
            "&id=" +
            tile_type_id[1] +
            "&confirm=true";
        html_id = tile_type_id[0].replace(/\./g, "-") + "-" + tile_type_id[1];

        // Remove head elements
        headelements = self.options.tileheadelements[html_id];
        if (headelements) {
            for (i = 0; i < headelements.length; i += 1) {
                $(headelements[i], self.document).remove();
            }
        }
        self.options.tileheadelements[html_id] = [];
    },

    addHeadTags: function (url, dom) {
        // Local variables
        var self = this;
        var tile_type_id, html_id;

        // Calc url
        url = url.split("?")[0];
        url = url.split("@@");
        tile_type_id = url[1].split("/");
        html_id = tile_type_id[0].replace(/\./g, "-") + "-" + tile_type_id[1];
        self.options.tileheadelements[html_id] = [];

        // Get head items
        dom.find(".temp_head_tag")
            .children()
            .each(function () {
                // Add element
                self.options.tileheadelements[html_id].push(this);

                // Add head elements
                $("head", self.document).append(this);
            });
    }

});
