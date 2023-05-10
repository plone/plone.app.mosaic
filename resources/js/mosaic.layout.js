// This plugin is used to create a mosaic layout.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import logging from "@patternslib/patternslib/src/core/logging";
import events from "@patternslib/patternslib/src/core/events";
import Tile from "./mosaic.tile";
import "./mosaic.overlay";

const log = logging.getLogger("pat-mosaic/layout");

export default class LayoutManager {

    constructor(mosaic) {
        this.mosaic = mosaic;
    }

    layout = {
        widthClasses: [
            "col",
            "col-1",
            "col-2",
            "col-3",
            "col-4",
            "col-5",
            "col-6",
            "col-7",
            "col-8",
            "col-9",
            "col-10",
            "col-11",
            "col-12",
        ],
        resizeClasses: [
            "mosaic-resize-1",
            "mosaic-resize-2",
            "mosaic-resize-3",
            "mosaic-resize-4",
            "mosaic-resize-5",
            "mosaic-resize-6",
            "mosaic-resize-7",
            "mosaic-resize-8",
            "mosaic-resize-9",
            "mosaic-resize-10",
            "mosaic-resize-11",
            "mosaic-resize-12",
        ],
        resizeHandleClasses: [
            "mosaic-resize-handle-1",
            "mosaic-resize-handle-2",
            "mosaic-resize-handle-3",
            "mosaic-resize-handle-4",
            "mosaic-resize-handle-5",
            "mosaic-resize-handle-6",
            "mosaic-resize-handle-7",
            "mosaic-resize-handle-8",
            "mosaic-resize-handle-9",
            "mosaic-resize-handle-10",
            "mosaic-resize-handle-11",
            "mosaic-resize-handle-12",
        ],
    }

    /* css helpers */
    getWidthClass(e) {
        for (const cls of this.layout.widthClasses) {
            if ($(e).hasClass(cls)) {
                return cls;
            }
        }
        // Fallback
        return this.layout.widthClasses[0];
    }

    getResizeHandleClassId(e) {
        // Loop through resize handle classes
        for (let idx=0; idx <  this.layout.resizeHandleClasses.length; idx++) {
            if ($(e).hasClass(this.layout.resizeHandleClasses[idx])) {
                return idx;
            }
        }
        // Fallback
        return 1;
    };

    addAppTile(type, url /*, id */) {
        var self = this;
        // Close overlay
        if (self.mosaic.overlay.modal.$modal) {
            self.mosaic.overlay.modal.hide();
        }

        // Get value
        $.ajax({
            type: "GET",
            url: url,
            success: async function (value) {
                // Get dom tree
                value = self.mosaic.getDomTreeFromHtml(value);

                // Add head tags
                self.mosaic.addHeadTags(url, value);

                // Add tile
                await self.addTile(type, value.find(".temp_body_tag").html(), url);
            },
        });
    }

    async addAppTileHTML(type, response, url) {
        var value;
        var self = this;

        value = self.mosaic.getDomTreeFromHtml(response);
        self.mosaic.addHeadTags(url, value);
        await self.addTile(type, value.find(".temp_body_tag").html(), url);
    }

    editAppTile(url) {
        var self = this;
        // Close overlay
        self.mosaic.overlay.close();

        // Focus on current window
        window.parent.focus();

        // Get new value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {
                // Get dom tree
                value = self.mosaic.getDomTreeFromHtml(value);

                // Remove head tags
                self.mosaic.removeHeadTags(url);

                // Add head tags
                self.mosaic.addHeadTags(url, value);

                // Update tile
                var $tile = $(
                    ".mosaic-selected-tile .mosaic-tile-content",
                    self.mosaic.document
                );
                $tile.html(value.find(".temp_body_tag").html()); // jshint ignore:line
                $tile.attr("data-tileUrl", url.replace(/&/gim, "&amp;"));
            },
        });
    }

    async addTile(type, value, tileUrl) {
        var self = this;
        // Set dragging state
        self.mosaic.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Add helper
        const add_helper = document.createElement("div");
        add_helper.classList.add("mosaic-grid-row");
        add_helper.innerHTML =
            `<div class="mosaic-grid-cell col">
                <div class="movable removable mosaic-tile mosaic-${type}-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile">
                    <div class="mosaic-tile-content" data-tileUrl="${tileUrl && tileUrl.replace(/&/gim, "&amp;")}">
                        ${value}
                    </div>
                </div>
            </div>`;
        self.mosaic.panels[0].append(add_helper);

        // Set helper min size
        var helper = self.mosaic.panels.find(".mosaic-helper-tile-new");

        // Get max width
        var width = 0;
        self.mosaic.panels.each(function () {
            if ($(this).width() > width) {
                width = $(this).width();
            }
        });

        // Set width
        if (helper.width() < width / 4) {
            helper.width(width / 4);
        } else {
            helper.width(helper.width());
        }

        var tile = new Tile(self.mosaic, helper);
        await tile.initialize();
        tile.cacheHtml();
        tile.scanRegistry();
    }

    getDefaultValue(tile_config) {
        var self = this;
        var start, end;

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

        switch (tile_config.tile_type) {
            case "field":
                switch (tile_config.widget) {
                    case "z3c.form.browser.text.TextWidget":
                    case "z3c.form.browser.text.TextFieldWidget":
                        var textval = $("#" + tile_config.id, self.mosaic.document)
                            .find("input")
                            .attr("value");
                        return `${start}${textval}${end}`;
                    case "z3c.form.browser.textarea.TextAreaWidget":
                    case "z3c.form.browser.textarea.TextAreaFieldWidget":
                    case "z3c.form.browser.textlines.TextLinesWidget":
                    case "z3c.form.browser.textlines.TextLinesFieldWidget":
                        var lines = $("#" + tile_config.id, self.mosaic.document)
                            .find("textarea")
                            .val()
                            .replace('\\n', "<br/>");
                        return `${start}${lines}${end}`;
                    case "plone.app.z3cform.widget.RichTextFieldWidget":
                    case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                    case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                    case "plone.app.widgets.dx.RichTextWidget":
                        return $("#" + tile_config.id).find("textarea").val()
                    default:
                        return (
                            '<div class="discreet">Placeholder for field:<br/><b>' +
                            tile_config.label +
                            "</b></div>"
                        );
                }
            default:
                return tile_config.default_value;
        }
    }

    getPageContent(exportLayout) {
        var self = this;

        var getLayoutRow = function (obj) {
            var body = "";

            // Check if not an empty row
            if ($(obj).hasClass("mosaic-empty-row") === false &&
                $(obj).find(".mosaic-tile").length >= 0) {
                // Add row open tag
                classNames = $(obj).attr("class");
                body += '      <div class="' + classNames + '">\n';

                // Loop through rows
                $(obj)
                    .children(".mosaic-grid-cell")
                    .each(function () {
                        // Add cell start tag
                        body += '        <div class="' + $(this).attr("class") + '">\n'; // jshint ignore:line

                        $(this)
                            .children()
                            .each(function () {
                                if ($(this).hasClass("mosaic-tile")) {
                                    body += $(this).data("mosaic-tile").getHtmlBody(exportLayout);
                                } else if ($(this).hasClass("mosaic-innergrid-row")) {
                                    body += getLayoutRow(this);
                                }
                            });

                        // Add cell end tag
                        body += "        </div>\n";
                    });

                // Add row close tag
                body += "      </div>\n";
            }
            return body;
        };

        // Content
        var content, position = 1, size = 12, body = "", classNames = "";

        // Add body tag
        body += "  <body>\n";

        // Loop through panels
        $("[data-panel]", self.mosaic.document).each(function () {
            // Add open panel tag
            body += '    <div data-panel="' + $(this).data("panel") + '"';
            body += '         data-max-columns="' + $(this).data("max-columns") + '">\n';

            $(this)
                .children()
                .each(function () {
                    if ($(this).hasClass("mosaic-grid-row")) {
                        body += getLayoutRow(this);
                    }
                });

            // Add close panel tag
            body += "    </div>\n";
        });

        // Add close tag
        body += "  </body>\n";

        content =
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="' +
            self.mosaic.options.layout +
            '">\n'; // jshint ignore:line
        content += body;
        content += "</html>\n";
        return content;
    }

    saveLayoutToForm() {
        var self = this;
        var $customLayout = $(
            "#form-widgets-ILayoutAware-customContentLayout, " +
            "[name='form.widgets.ILayoutAware.customContentLayout']"
        );

        if (self.mosaic.hasContentLayout) {
            $customLayout.val("");
        } else {
            $customLayout.val(self.getPageContent());
        }
    }

    init_events() {
        var self = this;
        var DocumentKeyup = function (e) {
            // Check if alt
            if (e.keyCode === 18) {
                var date = new Date();
                var enabled = $(".mosaic-panel", self.mosaic.document).data("advanced-enabled");
                var elapsed = date.getTime() - enabled;
                if (elapsed > 400) {
                    $(".mosaic-panel", self.mosaic.document).removeClass("mosaic-advanced");
                }
            }
            // Check if ctrl
            if (e.keyCode === 17) {
                $(".mosaic-panel", self.mosaic.document).removeClass("inner-subcolumn");
            }
        };

        // Keydown handler
        var DocumentKeydown = function (e) {
            const _document = self.mosaic.document;
            // Tab key
            if (e.keyCode === 9) {
                // blur all active tiles. and set focus
                for(const tile of _document.querySelectorAll(".mosaic-selected-tile")) {
                    tile["mosaic-tile"].blur();
                }
                // focus new tile
                var focused_tile = document.activeElement.closest(".mosaic-tile");
                if(focused_tile) {
                    focused_tile["mosaic-tile"].focus();
                }
            }
            // Check if alt
            if (e.keyCode === 18) {
                if ($(".mosaic-panel", _document).hasClass("mosaic-advanced")) {
                    $(".mosaic-panel", _document).removeClass("mosaic-advanced");
                } else {
                    var date = new Date();
                    $(".mosaic-panel", _document).addClass("mosaic-advanced");
                    $(".mosaic-panel", _document).data(
                        "advanced-enabled",
                        date.getTime()
                    );
                }
            }
            // Check if ctrl
            if (e.keyCode === 17) {
                $(".mosaic-panel", _document).addClass("inner-subcolumn");
            }

            // Check if esc
            if (e.keyCode === 27) {
                // Check if dragging
                var original_tile = _document.querySelectorAll(".mosaic-original-tile");
                if (original_tile.length > 0) {
                    original_tile.forEach(tile => {
                        tile.classList.add("mosaic-drag-cancel");
                        if (tile.classList.contains("mosaic-helper-tile-new")) {
                            // dismiss dragging tile
                            tile.remove();
                            // Remove dragging class from content
                            self.mosaic.panels.removeClass(
                                "mosaic-panel-dragging mosaic-panel-dragging-new"
                            );
                            // Hide all dividers
                            $(".mosaic-selected-divider", self.mosaic.document).removeClass(
                                "mosaic-selected-divider"
                            );
                        }
                    });
                // Deselect tile
                } else {
                    $(".mosaic-selected-tile", _document).each(function () {
                        $(this).trigger("blur");
                    });
                }

                // Find resize helper
                $(".mosaic-resize-handle-helper", _document).each(function () {
                    // Remove resizing state
                    $(this).parents("[data-panel]").removeClass("mosaic-panel-resizing");
                    $(this).parent().removeClass("mosaic-row-resizing");
                    $(this).parent().children(".mosaic-resize-placeholder").remove();

                    // Remove helper
                    $(this).remove();
                });

                // Hide overlay
                if (self.mosaic.overlay.modal.$modal) {
                    self.mosaic.overlay.modal.hide();
                }
            }
        };

        // Bind event and add to array
        events.add_event_listener(self.mosaic.document, "keydown", "pat-layout--keydown", DocumentKeydown);
        events.add_event_listener(self.mosaic.document, "keyup", "pat-layout--keyup", DocumentKeyup);

        // Add deselect
        const DocumentMousedown = function (e) {
            // Get element
            let elm;
            if (e.target) {
                elm = e.target;
            } else if (e.srcElement) {
                elm = e.srcElement;
            }

            // Find resize helper
            var new_tile = $(".mosaic-helper-tile-new", self.mosaic.document);
            if (new_tile.length > 0) {
                new_tile.each(function () {
                    // Handle drag end
                    $(this).mosaicHandleDragEnd();
                });
            }

            // If clicked inside TinyMCE or Modal exit
            if ($(elm).parents(".mce-content-body, .tox, .modal-wrapper").length > 0) {
                return;
            }

            // If clicked outside a tile
            if ($(elm).parents(".mosaic-tile").length === 0) {
                // Check if outside toolbar
                if ($(elm).parents(".mosaic-toolbar").length === 0) {
                    // Deselect tiles
                    self.mosaic.document.querySelectorAll(".mosaic-selected-tile").forEach(function(el) {
                        el.classList.remove("mosaic-selected-tile");
                    });

                    // Set actions
                    self.mosaic.toolbar.SelectedTileChange();
                }
            }
        };

        // Bind event and add to array
        events.add_event_listener(self.mosaic.document, "mousedown", "pat-layout--mousedown", DocumentMousedown)

        // Handle mouse move event: when holding down mouse left button and dragging the handler left or right.
        const DocumentMousemove = function (e) {

            // Find resize helper
            $(".mosaic-helper-tile-new", self.mosaic.document).each(function () {
                // Get offset
                const offset = $(this).parent().offset();

                // Get mouse x
                $(this).css("top", e.pageY + 3 - offset.top);
                $(this).css("left", e.pageX + 3 - offset.left);
            });

            // Find resize helper - there is actually only one
            $(".mosaic-resize-handle-helper", self.mosaic.document).each(function () {

                var cur_snap_offset;

                // Get helper
                var helper = $(this);

                // Get row
                var row = helper.parent();
                var resize_handle_index = helper.data("resize_handle_index");

                // Get mouse x
                var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

                // Get mouse percentage
                var mouse_percentage = Math.round(
                    (mouse_x / helper.data("row_width")) * 100
                );

                // Get closest snap location
                var snap = 8;
                var snap_offset = 8;

                var grid_percent = GetGridPercentList();

                grid_percent.forEach(function (perc) {
                    cur_snap_offset = Math.abs(perc - mouse_percentage);
                    if (cur_snap_offset < snap_offset) {
                        snap = perc;
                        snap_offset = cur_snap_offset;
                    }
                });

                var snap_size = GetBootstrapColByPercent(snap);

                var column_sizes = helper.data("column_sizes");
                var col_size_before = 0;
                var col_size_after = 0;
                for (var i = 0; i < column_sizes.length; i++) {
                    if (i < resize_handle_index) {
                        col_size_before += column_sizes[i] ? column_sizes[i] : 2;
                    }
                    if (i > resize_handle_index) {
                        col_size_after += column_sizes[i] ? column_sizes[i] : 2;
                    }
                }
                var col_size = snap_size - col_size_before;
                var col_size_max = 12 - col_size_before - col_size_after;
                // col_size should not be larger than max size and not less than 1
                col_size =
                    col_size > col_size_max ? col_size_max : col_size < 1 ? 1 : col_size;

                if (helper.data("nr_of_columns") > 0) {
                    var col_size_sum = 0;
                    var set_resize_handler = false;
                    var resize_css_classes = self.layout.resizeClasses.join(" ");
                    var width_css_classes = self.layout.widthClasses.join(" ");

                    // Loop through columns
                    row.children(".mosaic-resize-placeholder").each(function (index) {
                        if (index === resize_handle_index) {
                            // set new col_size for index
                            column_sizes[index] = col_size;
                            var col_size_class = GetWidthClassByColSize(col_size);
                            $(this)
                                .removeClass(width_css_classes)
                                .addClass(col_size_class)
                                .find(".info")
                                .html(col_size);
                            set_resize_handler = true;
                        }

                        // move other resize placeholders accordingly
                        $(this)
                            .removeClass(resize_css_classes)
                            .addClass(`mosaic-resize-${col_size_sum}`);

                        col_size_sum += column_sizes[index];

                        if(set_resize_handler) {
                            // trick to move handle helper too
                            $(".mosaic-resize-handle-helper", row)
                                .removeClass(resize_css_classes)
                                .addClass(`mosaic-resize-${col_size_sum}`);
                            set_resize_handler = false;
                        }
                    });

                    // Set new size
                    $(this).data("column_sizes", column_sizes);
                }
            });
        };

        // Bind event and add to array
        events.add_event_listener(self.mosaic.document, "mousemove", "pat-layout--mousemove", DocumentMousemove);
        events.add_event_listener(self.mosaic.document, "dragover", "pat-layout--dragover", DocumentMousemove);

        // Handle mouse up event
        // When resizing is done on mouse up event apply the changes to the div elements
        const DocumentMouseup = function () {
            // Find resize helper
            $(".mosaic-resize-handle-helper", self.mosaic.document).each(function () {
                var resize_handle_index = $(this).data("resize_handle_index");

                // Cleanup original row
                $(this).parent().parent().mosaicCleanupRow();

                // Get panel
                var panel = $(this).parents("[data-panel]");

                // Get column sizes
                var column_sizes = $(this).data("column_sizes");

                // Set column sizes
                $(this)
                    .parent()
                    .children(".mosaic-grid-cell")
                    .each(function (i) {
                        $(this)
                            .removeClass(self.layout.widthClasses.join(" "))
                            .addClass(GetWidthClassByColSize(column_sizes[i]));

                        var can_reset = $(this).hasClass("col");
                        if (!can_reset && i === resize_handle_index) {
                            $(this)
                                .children(".mosaic-tile")
                                .first()
                                .children(".mosaic-tile-side-tools")
                                .each(function () {
                                    var $tileSideTools = $(this);

                                    $tileSideTools
                                        .children(".mosaic-tile-label.reset")
                                        .remove();

                                    $tileSideTools.append(
                                        $(self.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-label reset")
                                            .append(
                                                AddResetAnchor(
                                                    $tileSideTools,
                                                    column_sizes[i]
                                                )
                                            )
                                    );
                                });
                        }
                    });

                // Remove resizing state
                panel.removeClass("mosaic-panel-resizing");
                $(this).parent().removeClass("mosaic-row-resizing");
                $(this).parent().children(".mosaic-resize-placeholder").remove();

                // Set resize handles
                $(this).parent().mosaicSetResizeHandles();
                var $tile = panel.find(".mosaic-selected-tile");
                if ($tile.length > 0) {
                    $tile.data("mosaic-tile").select();
                }

                // Remove helper
                $(this).remove();
            });
        };

        // Bind event
        events.add_event_listener(self.mosaic.document, "mouseup", "pat-layout--mouseup", DocumentMouseup);

        // Handle mousemove on tile
        const TileMousemove = function (e) {
            // only if dragging
            if ($(this).parents("[data-panel]").hasClass("mosaic-panel-dragging") === false) {
                return;
            }

            // Hide all dividers
            $(".mosaic-selected-divider", self.mosaic.document).removeClass(
                "mosaic-selected-divider"
            );

            // Don't show dividers if above original or floating tile
            if (
                $(this).hasClass("mosaic-original-tile") === false &&
                $(this).hasClass("mosaic-tile-align-left") === false &&
                $(this).hasClass("mosaic-tile-align-right") === false
            ) {
                // Get direction
                var dir = $(this).mosaicGetDirection(e);
                var divider = $(this).children(".mosaic-divider-" + dir);

                // Check if left or right divider
                if (dir === "left" || dir === "right") {
                    var row = divider.parent().parent().parent();
                    var cols = row.children(".mosaic-grid-cell").filter((idx, el) => {
                        // filter out original tile to enable moving tiles
                        // inside row with max-columns tiles
                        return ($(el).find(".mosaic-original-tile").length === 0);
                    });

                    if (cols.length >= $(".mosaic-panel").data("max-columns") ) {
                        // This row already up to the max amount of columns allowed for this layout
                        // do not allow new items to be dropped alingside any elements in this row.
                        return;
                    }

                    // If row has multiple columns
                    if (row.children(".mosaic-grid-cell").length > 1) {
                        divider.height(row.height() + 5);
                        divider.css(
                            "top",
                            row.offset().top - divider.parent().offset().top - 5
                        );
                    } else {
                        divider.height(divider.parent().height() + 5);
                        divider.css("top", -5);
                    }
                }

                // Show divider
                divider.addClass("mosaic-selected-divider");
            }
        };

        // Bind events
        self.mosaic.document.querySelectorAll(".mosaic-tile").forEach(tile => {
            events.add_event_listener(tile, "mousemove", "pat-layout--mousemove-tile", TileMousemove);
            events.add_event_listener(tile, "dragover", "pat-layout--dragover-tile", TileMousemove);
            events.add_event_listener(tile, "click", "pat-layout--click-tile", function (e) {
                if ($(".mosaic-helper-tile-new", self.mosaic.document).length === 0) {
                    // only if not dropping tile
                    if($(this).data("mosaic-tile")) {
                        $(this).data("mosaic-tile").select();
                    }
                }
            });

        });

        const applyCustomCss = function (e) {
            if ($(e.target).attr("id") === "custom-css-input-box") {
                return;
            }
            $.each($("div.mosaic-set-custom-css"), function () {
                var parent = $(this).parent();
                var base_css = "mosaic-grid-row";
                if (parent.hasClass("mosaic-innergrid-row")) {
                    base_css = "mosaic-grid-row mosaic-innergrid-row";
                }
                var classes = $(this).find("input#custom-css-input-box").val();
                base_css += " " + classes;
                parent.attr("class", base_css);
                $(this).remove();
            });
        };

        const CustomCSSOnDblClick = function (e) {
            // Only do this for "mosaic-grid-row" if advanced mode is enabled
            var target = $(e.target);
            var obj = target.parents("[data-panel]");
            if (obj.hasClass("mosaic-advanced") && target.hasClass("mosaic-grid-row")) {
                // Check we don't have an input field already
                if ($(target).find(".mosaic-set-custom-css").length > 0) {
                    return;
                }

                // We are in advance mode
                var custom_classes = [];
                $.each(target.attr("class").split(" "), function () {
                    if (
                        this !== undefined &&
                        this !== "mosaic-grid-row" &&
                        this !== "mosaic-innergrid-row"
                    ) {
                        custom_classes.push(this);
                    }
                });
                var input = $("<input type='text' id='custom-css-input-box'></input>").val(
                    custom_classes.join(" ")
                );
                var div = $("<div></div>")
                    .addClass("mosaic-set-custom-css")
                    .append($("<label>Custom CSS for this row:</label>"))
                    .append(input);
                target.append(div);
            }
        };
        self.mosaic.document.querySelectorAll(".mosaic-grid-row").forEach(gridrow => {
            events.add_event_listener(gridrow, "dblclick", "pat-layout--dblclick-gridrow", CustomCSSOnDblClick);
        })
        events.add_event_listener(self.mosaic.document, "click", "pat-layout--click", applyCustomCss);
    }

    initialize_panels() {
        var self = this;

        self.initJQueryHelpers();
        self.init_events();

        // Loop through matched elements
        var total = self.mosaic.panels.length;

        for(var i=0; i < total; i++) {
            // Get current object
            var obj = $(self.mosaic.panels[i]);

            // Add icons and dividers
            obj.find(".mosaic-tile").each(async function () {
                var tile = new Tile(self.mosaic, this)
                await tile.initialize();
            });
            obj.find(".mosaic-tile").mosaicAddDrag();
            obj.mosaicAddEmptyRows();
            obj.children(".mosaic-grid-row").mosaicSetResizeHandles();
            if (i === total - 1) {
                // Get biggest panel
                var width = 0;
                var index = 0;
                self.mosaic.panels.each(function (j) {
                    if ($(this).width() > width) {
                        width = $(this).width();
                        index = j;
                    }
                });

                // Select first tile in biggest panel
                var $tile = self.mosaic.panels.eq(index).find(".mosaic-tile:first");
                if ($tile.length > 0) {
                    $tile.data("mosaic-tile").select();
                }
            }

            obj.find(".mosaic-innergrid-row").each(function () {
                $(this).mosaicAddMouseMoveInnergridRow();
                $(this).mosaicSetResizeHandles();
                var that = $(this);
                ["top", "bottom"].forEach(function (pos, idx) {
                    that.append(
                        $(self.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider mosaic-divider-" + pos)
                    );
                });
            });
        };
    }

    initJQueryHelpers() {

        var self = this;
        var mosaic_doc = self.mosaic.document;

        $.fn.mosaicAddMouseMoveEmptyRow = function () {
            // Loop through matched elements
            return this.each(function () {
                // Mouse move event
                $(this).on("mousemove", function (/* e */) {
                    // Get layout object
                    var obj = $(this).parents("[data-panel]");

                    // Check if dragging
                    if (obj.hasClass("mosaic-panel-dragging")) {
                        // Hide all dividers
                        $(".mosaic-selected-divider", mosaic_doc).removeClass(
                            "mosaic-selected-divider"
                        );
                        $(this).children("div").addClass("mosaic-selected-divider");
                    }
                });
            });
        };

        /**
         * Add mouse move handler to inner grid rows
         *
         * @id jQuery.mosaicAddMouseMoveInnergridRow
         * @return {Object} jQuery object
         */
        $.fn.mosaicAddMouseMoveInnergridRow = function () {
            // Loop through matched elements
            return this.each(function () {
                // Mouse move event
                $(this).mousemove(function (e) {
                    // Get layout object
                    var obj = $(this).parents("[data-panel]");

                    // Check if dragging
                    if (obj.hasClass("mosaic-panel-dragging")) {
                        // Hide all dividers
                        $(".mosaic-selected-divider", mosaic_doc).removeClass(
                            "mosaic-selected-divider"
                        );

                        // Get direction
                        var dir = $(this).mosaicGetDirection(e);
                        var divider = $(this).children(".mosaic-divider-" + dir);

                        // Show divider
                        divider.addClass("mosaic-selected-divider");
                    }
                });
            });
        };

        /**
         * Add empty rows
         *
         * @id jQuery.mosaicAddEmptyRows
         * @return {Object} jQuery object
         */
        $.fn.mosaicAddEmptyRows = function () {
            // Loop through matched elements
            return this.each(function () {
                // Loop through rows
                $(this)
                    .find(".mosaic-grid-row:not(.mosaic-innergrid-row)")
                    .each(function () {
                        $(this).before(
                            $(mosaic_doc.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append(
                                    $(mosaic_doc.createElement("div"))
                                        .addClass("mosaic-grid-cell col")
                                        .append(
                                            $(mosaic_doc.createElement("div")).append(
                                                $(mosaic_doc.createElement("div"))
                                                    .addClass("mosaic-tile-outer-border")
                                            )
                                        )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                        if ($(this).nextAll(".mosaic-grid-row").length === 0) {
                            $(this).after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-row mosaic-empty-row")
                                    .append(
                                        $(mosaic_doc.createElement("div"))
                                            .addClass("mosaic-grid-cell col")
                                            .append(
                                                $(mosaic_doc.createElement("div")).append(
                                                    $(mosaic_doc.createElement("div"))
                                                        .addClass("mosaic-tile-outer-border")
                                                )
                                            )
                                    )
                                    .mosaicAddMouseMoveEmptyRow()
                            );
                        }
                    });

                if ($(this).find(".mosaic-grid-row:not(.mosaic-innergrid-row)").length === 0) {
                    $(this).append(
                        $(mosaic_doc.createElement("div"))
                            .addClass("mosaic-grid-row mosaic-empty-row")
                            .append(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell col")
                                    .append(
                                        $(mosaic_doc.createElement("div")).append(
                                            $(mosaic_doc.createElement("div"))
                                                .addClass("mosaic-tile-outer-border")
                                        )
                                    )
                            )
                            .mosaicAddMouseMoveEmptyRow()
                    );
                }
            });
        };

        /**
         * Add draggable to matched elements
         *
         * @id jQuery.mosaicAddDrag
         * @return {Object} jQuery object
         */
        $.fn.mosaicAddDrag = function () {
            // Loop through matched elements
            return this.each(function () {
                var tile = $(this);

                var DragMove = function (event) {
                    var helper = $(".mosaic-helper-tile", mosaic_doc);
                    var offset = helper.parents("[data-panel]").offset();
                    if(offset) {
                        helper.css("top", event.pageY + 3 - offset.top);
                        helper.css("left", event.pageX + 3 - offset.left);
                    }
                };

                var DragStop = function () {
                    var helper = $(".mosaic-helper-tile", mosaic_doc);
                    $(mosaic_doc)
                        .off("mousemove", DragMove)
                        .off("mouseup", DragStop);

                    // Handle drag end
                    helper.mosaicHandleDragEnd();
                    helper.remove();
                };

                return tile.each(function () {
                    tile.find("div.mosaic-drag-handle")
                        .off("mousedown")
                        .on("mousedown", function (event) {
                            var downX = event.pageX;
                            var downY = event.pageY;
                            var DragCheckMove = function (event) {
                                if (
                                    Math.max(
                                        Math.abs(downX - event.pageX),
                                        Math.abs(downY - event.pageY)
                                    ) >= 1
                                ) {
                                    // Add dragging class to content area
                                    self.mosaic.panels.addClass("mosaic-panel-dragging");
                                    $(".mosaic-selected-tile", mosaic_doc)
                                        .removeClass("mosaic-selected-tile")
                                        .children(".mosaic-tile-content")
                                        .trigger("blur");

                                    var originaltile = $(event.target).parents(".mosaic-tile");
                                    originaltile.addClass("mosaic-original-tile");

                                    var clone = originaltile.clone(true);
                                    clone.css({
                                            "width": originaltile.width(),
                                            "max-height": "50%",
                                            "position": "absolute",
                                            "opacity": 0.5,
                                        })
                                        .addClass("mosaic-helper-tile");
                                    originaltile.parents("[data-panel]").append(clone);

                                    $(mosaic_doc).on("mousemove", DragMove);
                                    $(mosaic_doc).on("mouseup", DragStop);
                                    $(mosaic_doc).off("mousemove", DragCheckMove);
                                }
                            };
                            $(mosaic_doc).on("mousemove", DragCheckMove);
                            $(mosaic_doc).on("mouseup", function () {
                                $(mosaic_doc).off("mousemove", DragCheckMove);
                            });
                        });
                });
            });
        };

        /**
         * Event handler for drag end - add new tile
         *
         * @id jQuery.mosaicHandleDragEnd
         * @return {Object} jQuery object
         */
        $.fn.mosaicHandleDragEnd = function () {
            // Get layout object
            var obj = $(this).parents("[data-panel]");

            // Remove dragging class from content
            self.mosaic.panels.removeClass(
                "mosaic-panel-dragging mosaic-panel-dragging-new"
            );

            // Get direction
            var divider = $(".mosaic-selected-divider", mosaic_doc);
            var drop = divider.parent();
            var dir = "";
            for(const _dir of ["top", "bottom", "left", "right"]) {
                if (divider.hasClass("mosaic-divider-" + _dir)) {
                    dir = _dir;
                }
            };
            divider.removeClass("mosaic-selected-divider");

            // True if new tile is inserted
            var new_tile = $(".mosaic-helper-tile-new", mosaic_doc).length > 0;
            var original_tile = $(".mosaic-original-tile", mosaic_doc);
            // get original row here, because tile might be moved
            var original_row = original_tile.closest(".mosaic-grid-row");

            // If divider is not found or not sane drop, act like esc is pressed
            if (divider.length === 0 || drop.hasClass("mosaic-helper-tile")) {
                original_tile.addClass("mosaic-drag-cancel");
            }

            const fixup_classes = (_t) => {
                _t.removeClass("mosaic-drag-cancel");
                _t.removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left");
                _t.css({ width: "", left: "", top: "" });
                if(!new_tile) {
                    _t.addClass("mosaic-new-tile");
                }
            }

            if (
                // Check if esc is pressed
                original_tile.hasClass("mosaic-drag-cancel") ||

                // Not dropped on tile and empty row
                (drop.hasClass("mosaic-tile") === false &&
                 drop.hasClass("mosaic-innergrid-row") === false &&
                 drop.hasClass("mosaic-empty-row") === false) ||

                // Check if max columns rows is reached
                (drop.parent().parent().children(".mosaic-grid-cell").length >=
                 obj.data("max-columns") &&
                 (dir === "left" || dir === "right"))
            ) {
                fixup_classes(original_tile);

            // Dropped on empty row
            } else if (drop.hasClass("mosaic-empty-row")) {
                // Replace empty with normal row class
                drop.removeClass("mosaic-empty-row")
                    .attr(
                        "class",
                        original_tile.parents(".mosaic-grid-row").first().attr("class")
                    )
                    .off("mousemove");

                // Clean cell
                drop.children(".mosaic-grid-cell").children("div").remove();

                fixup_classes(original_tile);

                // Add tile to empty row
                drop.children(".mosaic-grid-cell").append(original_tile);

            // Dropped on row or below an inner grid
            } else {
                /* When the layout object has the special class (Assigned in line 82), wrap
                the tile in a div.mosaic-grid-cell so it would create an inner column */
                fixup_classes(original_tile);

                if (obj.hasClass("inner-subcolumn")) {
                    var original_tile = $(mosaic_doc.createElement("div"))
                        .addClass("mosaic-grid-row mosaic-innergrid-row")
                        .append(
                            $(mosaic_doc.createElement("div"))
                                .addClass("mosaic-grid-cell col")
                                .append(
                                    $(mosaic_doc.createElement("div")).append(
                                        $(mosaic_doc.createElement("div")).addClass(
                                            "mosaic-innergrid-outer-border"
                                        )
                                    )
                                )
                                .append(original_tile)
                        )
                        .mosaicAddMouseMoveInnergridRow();
                    for(const pos of ["top", "bottom"]) {
                        original_tile.append(
                            $(mosaic_doc.createElement("div"))
                                .addClass("mosaic-divider mosaic-divider-" + pos)
                        );
                    };
                }

                // If top
                if (dir === "top") {
                    // Add tile before
                    drop.before(original_tile);

                // If bottom
                } else if (dir === "bottom") {
                    // Add tile after
                    drop.after(original_tile);

                // If left
                } else if (dir === "left" || dir === "right") {
                    var _col = drop.parent();
                    var _row = _col.parent();
                    var _children_count = _row.children(".mosaic-grid-cell").length;

                    // Check if only 1 column in the row
                    if (_children_count.length === 1) {
                        // Put tiles above dropped tile in a new row above
                        var prev_elms = drop.prevAll();
                        if (prev_elms.length > 0) {
                            _row.before(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-row")
                                    .append(
                                        $(mosaic_doc.createElement("div"))
                                            .addClass("mosaic-grid-cell col")
                                            .append(
                                                $(prev_elms.get().reverse())
                                                    .clone(true)
                                                    .mosaicAddDrag()
                                            )
                                    )
                                );
                            prev_elms.remove();
                        }

                        // Put tiles below dropped tile in a new row below
                        var next_elms = drop.nextAll();
                        if (next_elms.length > 0) {
                            _row.after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-row")
                                    .append(
                                        $(mosaic_doc.createElement("div"))
                                            .addClass("mosaic-grid-cell col")
                                            .append(next_elms.clone(true).mosaicAddDrag())
                                    )
                            );
                            next_elms.remove();
                        }

                        // Resize current column
                        _col.removeClass(self.layout.widthClasses.join(" "))
                            .addClass("col");

                        // Create column with dragged tile in it
                        if (dir === "left") {
                            drop.parent().before(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell col")
                                    .append(original_tile)
                            );
                        } else {
                            drop.parent().after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell col")
                                    .append(original_tile)
                            );
                        }

                        // Add resize handles
                        _row.mosaicSetResizeHandles();

                    // Dropped inside column
                    } else {

                        // Create new column
                        if (dir === "left") {
                            _col.before(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell")
                                    .append(original_tile)
                            );
                        } else {
                            _col.after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell")
                                    .append(original_tile)
                            );
                        }

                        // Resize columns
                        _row.mosaicSetColumnSizes();

                        // Add resize handles
                        _row.mosaicSetResizeHandles();
                    }
                }
            }

            // Remove remaining empty rows
            self.mosaic.panels.find(".mosaic-grid-row:not(:has(.mosaic-tile))").remove();
            self.mosaic.panels.find(".mosaic-empty-row").remove();

            // Cleanup original row
            original_row.mosaicCleanupRow();

            // Add empty rows
            self.mosaic.panels.mosaicAddEmptyRows();

            // re-initialize events
            self.init_events();

            // Select new tile and make it draggables
            if (new_tile && original_tile.length > 0) {
                original_tile.mosaicAddDrag();
                original_tile.data("mosaic-tile").initializeContent();
                original_tile.data("mosaic-tile").focus();
            }
        };

        /**
         * Set the sizes of the column
         *
         * @id jQuery.mosaicSetColumnSizes
         * @return {Object} jQuery object
         */
        $.fn.mosaicSetColumnSizes = function () {
            // Loop through matched elements
            return this.each(function () {
                // Resize columns in the row
                var column_sizes = [];
                var $gridCells = $(this).children(".mosaic-grid-cell")
                var nr_of_columns = $gridCells.length;
                var width_css_classes = self.layout.widthClasses.join(" ");

                // This will reset the width classes - it will automatically set the widths

                $gridCells
                    .each(function (idx) {
                        $(this).removeClass(width_css_classes);

                        var col_size = Math.floor(12 / nr_of_columns);
                        var col_size_last = 12 - col_size * (nr_of_columns - 1);

                        for (var j = 0; j < nr_of_columns; j++) {
                            if (j === nr_of_columns - 1) {
                                col_size = col_size_last;
                            }
                            if (idx === j) {
                                column_sizes.push(col_size);
                                $(this).addClass("col");
                            }
                        }
                    });

                $(this).data("column_sizes", column_sizes);
            });
        };

        /**
         * Add new resize handlers
         *
         * @id jQuery.mosaicSetResizeHandles
         * @return {Object} jQuery object
         */
        $.fn.mosaicSetResizeHandles = function () {
            // Loop through matched elements
            return this.each(function () {
                // Remove resize handles
                $(this).children(".mosaic-resize-handle").remove();

                // Check number of columns
                var grid_cells = $(this).children(".mosaic-grid-cell")
                var nr_of_columns = grid_cells.length;

                if (nr_of_columns <= 12) {
                    var column_sizes = [];
                    var zero_count = 0;
                    var col_sum = 0;

                    for (let i = 0; i < nr_of_columns; i++) {
                        var col_size = GetColSizeByColClass(
                            self.getWidthClass(grid_cells[i])
                        );
                        column_sizes.push(col_size);
                        col_sum = col_sum + col_size;
                        if (col_size === 0) {
                            zero_count = zero_count + 1;
                        }
                    }

                    var zero_col = 0;
                    if (zero_count) {
                        zero_col = (12 - col_sum) / zero_count;
                    }

                    var resize_col_size = 0;
                    col_size = 0;

                    for (let i = 0; i < nr_of_columns; i++) {
                        col_size = column_sizes[i] ? column_sizes[i] : zero_col;
                        resize_col_size = resize_col_size + col_size;

                        $(this).append(
                            $(mosaic_doc.createElement("div"))
                                .addClass(
                                    `mosaic-resize-handle mosaic-resize-handle-${(i + 1)}`
                                    + ` mosaic-resize-${resize_col_size}`
                                )
                                .data("resize_handle_index", i)
                        );

                        // set counted size to cell data
                        $(grid_cells[i]).data("col_size", col_size);
                    }
                }

                // Mouse down handler on resize handle
                $(this)
                    .children(".mosaic-resize-handle")
                    .off("mousedown")
                    .on("mousedown", function (/* e */) {
                        var $currRow = $(this).parent();
                        var $mosaicGridCellChildren = $currRow.children(".mosaic-grid-cell");
                        var nr_of_columns = $mosaicGridCellChildren.length;

                        if(nr_of_columns > 12) {
                            return;
                        }
                        var col_size_sum = 0;
                        var column_sizes = [];

                        $mosaicGridCellChildren.each(function (index) {
                            var col_size = $(this).data("col_size"); // get computed size of the column
                            column_sizes.push(col_size);

                            var placeholder = $(mosaic_doc.createElement("div"))
                                .addClass(
                                    `mosaic-resize-placeholder col-${col_size} mosaic-resize-${col_size_sum}`
                                )
                                .append(
                                    $(mosaic_doc.createElement("div"))
                                        .addClass(
                                            "mosaic-resize-placeholder-inner-border"
                                        )
                                        .append(
                                            $(mosaic_doc.createElement("div"))
                                                .addClass("info")
                                                .html(col_size)
                                        )
                                );

                            // Add placeholder
                            $currRow.append(placeholder);

                            // summarize column sizes for placeholder classes
                            col_size_sum += col_size;
                        });

                        // Get resize handle index
                        var resize_handle_index = self.getResizeHandleClassId(this);

                        // Add helper
                        $currRow
                            .append(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
                                    .addClass(`mosaic-resize-${column_sizes[resize_handle_index]}`)
                                    .data("row_width", $currRow.width())
                                    .data("nr_of_columns", nr_of_columns)
                                    .data("column_sizes", column_sizes)
                                    .data("resize_handle_index", resize_handle_index)
                            );

                        // Set resizing state
                        $(this).parents("[data-panel]").addClass("mosaic-panel-resizing");
                        $currRow.addClass("mosaic-row-resizing");
                        $(".mosaic-selected-tile", mosaic_doc)
                            .children(".mosaic-tile-content")
                            .trigger("blur");

                        // Prevent drag event
                        return false;
                    });
            });
        };

        /**
         * Cleanup row after tiles added or removed from the row
         *
         * @id jQuery.mosaicCleanupRow
         * @return {Object} jQuery object
         */
        $.fn.mosaicCleanupRow = function () {
            // Loop through matched elements
            return this.each(function () {
                // Get original row
                var original_row = $(this);

                // Remove empty columns
                original_row.children(".mosaic-grid-cell").each(function () {
                    if ($(this).children().length === 0) {
                        $(this).remove();

                        // Resize columns
                        original_row.mosaicSetColumnSizes();
                    }
                });

                // Remove row if no tiles inside
                if (original_row.find(".mosaic-tile").length === 0) {
                    var del_row = original_row;

                    // Check if next row available
                    if (original_row.nextAll(".mosaic-grid-row").length > 0) {
                        original_row = original_row.next(".mosaic-grid-row");

                        // Check if prev row available
                    } else if (original_row.prevAll(".mosaic-grid-row").length > 0) {
                        original_row = original_row.prev(".mosaic-grid-row");

                        // This is the last row
                    } else {
                        original_row.remove();
                        return;
                    }

                    // Remove current row
                    del_row.remove();
                }

                // Set resize handles
                original_row.mosaicSetResizeHandles();
            });
        };

        /**
         * Get the direction based on the tile size and relative x and y coords of the cursor
         *
         * @id jQuery.mosaicGetDirection
         * @param {Object} e Event object
         * @return {String} Direction of the cursor relative to the tile
         */
        $.fn.mosaicGetDirection = function (e) {
            // Calculate x, y, width and height
            var width = parseFloat($(this).width());
            var height = parseFloat($(this).height());
            var x = parseFloat(e.pageX - $(this).offset().left - width / 2);
            var y = parseFloat(e.pageY - $(this).offset().top - height / 2);
            var halfwidth = width / 2;
            var halfheight = height / 2;

            // If left of center
            if (x < 0) {
                // If above center
                if (y < 0) {
                    if (x / y < (-1 * halfwidth) / (-1 * halfheight)) {
                        return "top";
                    } else {
                        return "left";
                    }
                    // Below center
                } else {
                    if (x / y < (-1 * halfwidth) / halfheight) {
                        return "left";
                    } else {
                        return "bottom";
                    }
                }

                // Right of center
            } else {
                // If above center
                if (y < 0) {
                    if (x / y < (1 * halfwidth) / (-1 * halfheight)) {
                        return "right";
                    } else {
                        return "top";
                    }
                    // Below center
                } else {
                    if (x / y < halfwidth / halfheight) {
                        return "bottom";
                    } else {
                        return "right";
                    }
                }
            }
        };
    }
}


var AddResetAnchor = function ($tileSideTools, cols) {
    var reset = document.createElement("a");
    var cols_str = typeof cols === "undefined" ? "" : " (" + cols + ")";
    reset.href = "javascript:";
    reset.textContent = "Reset" + cols_str;
    $(reset).on("click", { el: $tileSideTools }, function (e) {
        e.preventDefault();

        e.data.el
            .parent()
            .parent()
            .removeClass(
                "col-1 col-2 col-3 col-4 col-5 col-6 col-7 col-8 col-9 col-10 col-11 col-12"
            )
            .addClass("col");

        e.data.el.parent().parent().parent().mosaicSetResizeHandles();

        $(e.target).parent().remove();
    });
    return reset;
};

/**
 * Get a list of percentage steps for each column in the grid
 *
 * @id GetGridPercentList
 * @return {Array} List of percent steps of the width class
 */
function GetGridPercentList() {
    var low = 0,
        high = 100,
        grid = 12,
        grid_percent = [];
    var step = 100 / grid;
    var a = low,
        b = high - 1; /* fix the last step in the loop: -1 */
    while (a < b) {
        grid_percent.push(Math.round((a += step)));
    }

    return grid_percent;
}

/**
 * Get the name of the width class of the given integer
 *
 * @id GetWidthClassByColSize
 * @param {Integer} col_size Bootstrap col width id
 * @return {String} Classname of the width class of the given integer
 */
function GetWidthClassByColSize(col_size) {
    if (col_size) {
        return "col-" + col_size;
    }

    // Fallback
    return "col";
}

/**
 * Get the name of the position class of the given integer
 *
 * @id GetColSizeByColClass
 * @param {String} Classname of the position class
 * @return {Integer} col_size Bootstrap col width id
 */
function GetColSizeByColClass(col_class, prefix) {
    prefix = prefix || "col-";
    return parseInt(col_class.replace(prefix, "")) || 0;
}

/**
 * Get the bootstrap col width id by width size
 *
 * @id GetBootstrapColByPercent
 * @param {Integer} width Percentage of the column position
 * @return {Integer} Bootstrap col width id of the given integer
 */
function GetBootstrapColByPercent(width) {
    var grid_percent = GetGridPercentList();

    for (let idx=0; idx < grid_percent.length; idx++) {
        if (width === grid_percent[idx]) {
            return idx + 1;
        }
    }

    // Fallback
    return 12;
}
