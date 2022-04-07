// Layout Mosaic pattern.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import _ from "underscore";
import Base from "@patternslib/patternslib/src/core/base";
import utils from "mockup/src/core/utils";
import Modal from "mockup/src/pat/modal/modal";

import SelectLayoutTemplate from "./templates/select_layout.xml";
import SaveLayoutTemplate from "./templates/save_layout.xml";
import ManageLayoutsTemplate from "./templates/manage_layouts.xml";
import DeleteLayoutTemplate from "./templates/delete_layout.xml";

export default Base.extend({
    name: "layout",
    trigger: ".pat-layout",
    parser: "mockup",

    default: {
        url:"",
        type: "",
        ignore_context: false,
        tileheadelements: [],
        available_layouts: [],
        overlay_hide_fields: true,
    },

    // mosaic API
    document: null,
    loaded: false,
    saving: false,
    hasContentLayout: true,
    selectLayoutTemplate: _.template(SelectLayoutTemplate),
    saveLayoutTemplate: _.template(SaveLayoutTemplate),
    manageLayoutsTemplate: _.template(ManageLayoutsTemplate),
    deleteLayoutTemplate: _.template(DeleteLayoutTemplate),

    init: async function() {
        var self = this;

        import("../scss/mosaic.pattern.scss");

        // extend options
        self.options = $.extend(true, self.default, self.options.data, self.options);

        // main page
        self.document = window.document;

        // init actionManager
        const ActionManager = (await import("./mosaic.actions")).default;
        self.actionManager = new ActionManager(self);
        await self.actionManager.initActions();

        // init layoutManager
        const LayoutManager = (await import("./mosaic.layout")).default;
        self.layoutManager = new LayoutManager(self);

        var match;
        self.options.url = window.document.location.href;

        // Get the url of the page
        match = self.options.url.match(/^([\w#!:.?+=&%@!\-\/]+)\/edit$/);
        if (match) {
            self.options.url = match[1];
        }

        // Chop add
        match = self.options.url.match(
            /^([\w#:.?=%@!\-\/]+)\/\+\+add\+\+([\w#!:.?+=&%@!\-\/]+)$/
        );
        if (match) {
            self.options.url = match[1];
            self.options.type = match[2];
            self.options.ignore_context = true;
        }

        const contentLayout = self.getSelectedContentLayout();
        if (contentLayout) {
            self.applyLayout(contentLayout);
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
                    self._init($content);
                }

                // XXX There is a case where you can have an extraneous mid-edit tile
                var $helper = $(".mosaic-helper-tile-new");
                if ($helper.length > 0) {
                    $helper.parents(".mosaic-grid-row").remove();
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

        const Panel = (await import("./mosaic.panel")).default;

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

        // Init app tiles
        const Tile = (await import("./mosaic.tile")).default;

        self.panels.find("[data-tile]").each(function () {
            if (Tile.validTile(this)) {
                var tile = new Tile(self, $(this).parent());
                tile.initializeContent();
            }
        });

        // initialize layout events
        await self.layoutManager.initialize_panels();
    },

    _init: async function (content) {
        var self = this;
        await self._initPanels(content);

        // Init overlay
        const Overlay = (await import("./mosaic.overlay")).default;
        self.overlay = new Overlay(self.options, self.panels);
        self.overlay.initialize();

        // Add toolbar div below menu
        $("body").prepend(
            $(document.createElement("div")).addClass(
                "mosaic-toolbar bg-light position-fixed top-0 start-0 end-0 p-2 border-bottom shadow-sm"
            )
        );

        const Toolbar = (await import("./mosaic.toolbar")).default;

        // Init toolbar
        self.toolbar = new Toolbar(self, $(".mosaic-toolbar"));
        self.toolbar.initToolbar();

        // Add blur to the rest of the content
        $("*", self.document).each(function () {
            // Local variables
            var obj;

            obj = $(this);

            // Check if block element
            if (obj.css("display") === "block" || obj.css("display") === "flex") {
                // Check if panel or toolbar
                if (
                    !obj.hasClass("mosaic-panel") &&
                    !obj.hasClass("mosaic-toolbar") &&
                    !obj.hasClass("mosaic-notifications") &&
                    !obj.hasClass("mosaic-modal-wrapper") &&
                    obj.attr("id") !== "edit-zone"
                ) {
                    // Check if inside panel or toolbar
                    if (obj.parents(".mosaic-panel, .mosaic-toolbar").length === 0) {
                        // Check if parent of a panel or toolbar
                        if (obj.find(".mosaic-panel, .mosaic-toolbar").length === 0) {
                            // Check if parent has a child who is a
                            // panel or a toolbar
                            if (
                                obj.parent().find(".mosaic-panel, .mosaic-toolbar")
                                    .length !== 0
                            ) {
                                // Add blur class
                                obj.addClass("mosaic-blur");
                            }
                        }
                    }
                }
            }
        });

        // on enabling, add class, disable toolbar classes, hide toolbar
        $(".pat-toolbar").hide();
        var $body = $("body");
        $body.addClass("mosaic-enabled");
        $body[0].className.split(" ").forEach(function (className) {
            if (className.indexOf("plone-toolbar") !== -1) {
                $body.removeClass(className);
            }
        });

        self.initialized();
    },

    applyLayout: function (layoutPath, callback) {
        var self = this;
        if (callback === undefined) {
            callback = function () {};
        }
        utils.loading.show();
        $.ajax({
            url: $("body").attr("data-portal-url") + "/" + layoutPath,
            cache: false,
        })
            .done(async function (layoutHtml) {
                var $content = self.getDomTreeFromHtml(layoutHtml);
                self.setSelectedContentLayout(layoutPath);
                if (self.loaded) {
                    // initialize panels
                    await self._initPanels($content);
                } else {
                    self._init($content);
                }
            })
            .fail(function (xhr, type, status) {
                // use backup layout
                if (status === "Not Found") {
                    window.alert(
                        "Specified layout can not be found. Loading default layout."
                    );
                } else {
                    window.alert(
                        "Error loading layout specified for this content. Falling back to basic layout."
                    );
                }
                self.applyLayout("++contentlayout++default/basic.html");
            })
            .always(function () {
                utils.loading.hide();
            });
    },

    _hasCustomLayouts: function () {
        if (this.options.user_layouts.length > 0) {
            return true;
        }
        return (
            _.filter(this.options.available_layouts, function (layout) {
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
                    self.options
                )
            ),
            content: null,
            buttons: ".plone-btn",
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
                        .done(function (data) {
                            modal.hide();
                            callback(data);
                            if (
                                replacement &&
                                self.getSelectedContentLayout() ===
                                    "++contentlayout++" + layout.path
                            ) {
                                self.applyLayout("++contentlayout++" + replacement);
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
            buttons: ".plone-btn",
        });

        modal.on("shown", function () {
            $(".delete-layout", modal.$modal)
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    var layout_id = $(this).attr("data-layout");
                    _.each(
                        self.options.available_layouts.concat(
                            self.options.user_layouts
                        ),
                        function (l) {
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
                        }
                    );
                });
        });
        modal.show();
    },

    selectLayout: function (initial) {
        var self = this;
        if (initial !== undefined && initial) {
            // check if there is only 1 available layout and auto select
            // if that is the case.
            if (self.options.available_layouts.length === 1) {
                var layout = self.options.available_layouts[0];
                var layoutPath = "++contentlayout++" + layout.directory + "/" + layout.file;
                self.applyLayout(layoutPath);
                return;
            }
        }
        if (self.options.available_layouts.length === 0) {
            // use backup layout
            self.applyLayout("++contentlayout++default/basic.html");
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
                    self.options
                )
            ),
            content: null,
            buttons: ".plone-btn",
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
                .on("click", function (e) {
                    e.preventDefault();
                    var layout;
                    var layout_id = $(this).attr("data-value");
                    _.each(
                        self.options.available_layouts.concat(
                            self.options.user_layouts
                        ),
                        function (l) {
                            if (l.path === layout_id) {
                                layout = l;
                            }
                        }
                    );
                    var layoutPath = "++contentlayout++" + layout.path;
                    modal.hide();
                    self.applyLayout(layoutPath);
                });
        });
        modal.show();
    },

    saveLayout: function (initial) {
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
                    self.options
                )
            ),
            content: null,
            buttons: ".plone-btn",
        });
        modal.on("shown", function () {
            $(".plone-btn:visible", modal.$modal)
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
                        .done(function (result) {
                            if (result.success) {
                                self.options.available_layouts =
                                    result.available_layouts;
                                self.options.user_layouts = result.user_layouts;
                                self.applyLayout(result.layout);
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

    getDomTreeFromHtml: function (content) {
        // Remove doctype and replace html, head and body tag since the are
        // stripped when converting to jQuery object
        content = content.replace(/<!DOCTYPE[\w\s\- .\/\":]+>/, "");
        content = content.replace(/<html>/, '<div class="temp_html_tag">');
        content = content.replace(/<\/html>/, "</div>");
        content = content.replace(/<html\s/, '<div class="temp_html_tag" ');
        content = content.replace(/<\/html\s/, "</div ");
        content = content.replace(/<head>/, '<div class="temp_head_tag">');
        content = content.replace(/<\/head>/, "</div>");
        content = content.replace(/<head\s/, '<div class="temp_head_tag" ');
        content = content.replace(/<\/head\s/, "</div ");
        content = content.replace(/<body>/, '<div class="temp_body_tag">');
        content = content.replace(/<\/body>/, "</div>");
        content = content.replace(/<body\s/, '<div class="temp_body_tag" ');
        content = content.replace(/<\/body\s/, "</div ");
        return $($(content)[0]);
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
    },

    queue: function (queueName, callback) {
        if (typeof callback === "undefined") {
            callback = queueName;
            queueName = "fx"; // 'fx' autoexecutes by default
        }
        $(window).queue(queueName, callback);
    },

});
