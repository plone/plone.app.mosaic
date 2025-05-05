// This plugin is used to create a mosaic layout.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import logging from "@patternslib/patternslib/src/core/logging";
import events from "@patternslib/patternslib/src/core/events";
import Tile from "./mosaic.tile";
import mosaic_utils from "./utils";

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
            // 5-column support
            "mosaic-resize-2.4",
            "mosaic-resize-4.8",
            "mosaic-resize-7.2",
            "mosaic-resize-9.6",
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
    };

    /* css helpers */
    getWidthClass(e) {
        for (const cls of this.layout.widthClasses) {
            if (e.classList.contains(cls)) {
                return cls;
            }
        }
        // Fallback
        return this.layout.widthClasses[0];
    }

    getResizeHandleClassId(e) {
        // Loop through resize handle classes
        let handleIdx = 0;
        this.layout.resizeHandleClasses.forEach((cls, idx) => {
            if (e.classList.contains(cls)) {
                handleIdx = idx;
            }
        })
        return handleIdx;
    }

    async addAppTileHTML(type, response, url) {
        let value = this.mosaic.getDomTreeFromHtml(response);
        this.mosaic.addHeadTags(url, value);
        await this.addTile(type, value.find(".temp_body_tag").html(), url);
    }

    async addTile(type, value, tileUrl) {
        var self = this;
        // Set dragging state
        self.mosaic.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Add helper
        const add_helper = document.createElement("div");
        add_helper.classList.add("mosaic-grid-row");
        add_helper.innerHTML = (
            `<div class="mosaic-grid-cell col">` +
            `<div class="movable removable mosaic-tile mosaic-${type}-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile">` +
            `<div class="mosaic-tile-content" data-tileUrl="${tileUrl && tileUrl.replace(/&/gim, "&amp;")}">` +
            value +
            `</div>` +
            `</div>` +
            `</div>`
        );
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
        await tile.scanRegistry();
    }

    async copyTile(orig_tile) {
        const orig_tile_inst = orig_tile[0]["mosaic-tile"];
        const tile_type = orig_tile_inst.getType();

        // remove class
        orig_tile.removeClass("mosaic-original-tile");
        const orig_parent = orig_tile.closest(".mosaic-grid-row");
        // create copy tile helper
        const copy_tile_id = mosaic_utils.generate_uid();
        let $copy_tile_helper = $(
            `<div class="mosaic-grid-cell col">` +
            `<div class="movable removable copyable mosaic-tile mosaic-${tile_type}-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile">` +
            `<div class="mosaic-tile-content" data-tileUrl="./@@${tile_type}/${copy_tile_id}">` +
            orig_tile_inst.getHtmlContent() +
            `</div>` +
            `</div>` +
            `</div>`);
        orig_parent.append($copy_tile_helper);

        var tile = new Tile(this.mosaic, $copy_tile_helper.find(".mosaic-tile"));
        await tile.initialize();
        // save copied content
        await tile.save();

        if (tile.getConfig().tile_type == "app") {
            // copy the data from original tile too
            const orig_tile_data = await orig_tile_inst.serialize();
            await tile.deserialize(orig_tile_data);
        }

        tile.cacheHtml();
        await tile.scanRegistry();

        return tile.$el;
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

        if (tile_config.tile_type == "field") {
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
                        .replace("\\n", "<br/>");
                    return `${start}${lines}${end}`;
                case "plone.app.z3cform.widget.RichTextFieldWidget":
                case "plone.app.z3cform.widgets.richtext.RichTextFieldWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                case "plone.app.widgets.dx.RichTextWidget":
                    return $("#" + tile_config.id)
                        .find("textarea")
                        .val();
                default:
                    return `<div class="text-bg-secondary">Placeholder for field:<br/><b>${tile_config.label}</b></div>`;
            }
        } else {
            return tile_config.default_value;
        }
    }

    getPageContent(exportLayout) {
        var getLayoutRow = (obj) => {
            let body = "";

            // if empty return
            if (!obj.querySelectorAll(".mosaic-tile").length) {
                return body;
            }

            // Add row open tag
            body += `<div class="${obj.getAttribute('class')}">\n`;

            // Loop through cells
            for (const cell of obj.children) {
                if (!cell.classList.contains("mosaic-grid-cell")) {
                    continue;
                }

                body += `<div class="${cell.getAttribute('class')}">\n`;

                for (const child of cell.children) {
                    if (child.classList.contains("mosaic-innergrid-row")) {
                        body += getLayoutRow(child);
                    }
                    if (child.classList.contains("mosaic-tile")) {
                        body += child["mosaic-tile"].getHtmlBody(exportLayout);
                    }
                };

                body += "</div>\n";
            };

            // Add row close tag
            body += "</div>";
            return body;
        };

        // Content
        let body = "<body>";

        // Loop through panels
        const panels = this.mosaic.document.querySelectorAll("[data-panel]");

        panels.forEach(panel => {
            body += `<div data-panel="${panel.dataset?.panel}" data-max-colums="${panel.dataset?.maxColumns || 6}">`
            for (const row of panel.children) {
                if (row.classList.contains("mosaic-empty-row")) {
                    continue;
                }
                body += getLayoutRow(row);
            };
            // Add close panel tag
            body += "</div>";
        });

        // Add close tag
        body += "</body>";

        return `<!DOCTYPE html><html data-layout="${this.mosaic.options.layout}">${body}</html>`;
    }

    async saveLayoutToForm() {
        var self = this;
        var $customLayout = $(
            "#form-widgets-ILayoutAware-customContentLayout, " +
            "[name='form.widgets.ILayoutAware.customContentLayout']",
        );

        if (self.mosaic.hasContentLayout) {
            $customLayout.val("");
        } else {
            $customLayout.val(await self.getPageContent());
        }
    }

    init_events() {
        var self = this;
        const _document = this.mosaic.document;
        const _panels = _document.querySelectorAll(".mosaic-panel");

        if (_panels.length == 0) {
            console.log("No mosaic panel found!");
            return
        }
        else if (_panels.length > 1) {
            console.log("More than one mosaic panels found -> initializing events only for first panel!");
        }

        const _panel = _panels[0];

        var DocumentKeyup = function (e) {
            // Check if alt
            if (e.keyCode === 18) {
                // check for copy mode
                if (_panel.classList.contains("mosaic-panel-dragging-copy")) {
                    _panel.classList.remove("mosaic-panel-dragging-copy");
                } else {
                    var date = new Date();
                    var elapsed = date.getTime() - parseInt(_panel["mosaic-advanced-enabled"]);
                    if (elapsed > 400) {
                        _panel.classList.remove("mosaic-advanced");
                    }
                }
            }
            // Check if ctrl
            if (e.keyCode === 17) {
                _panel.classList.remove("inner-subcolumn");
            }
        };

        // Keydown handler
        var DocumentKeydown = function (e) {
            // Tab key
            if (e.keyCode === 9) {
                // blur all active tiles. and set focus
                _document.querySelectorAll(".mosaic-selected-tile").forEach(async (tile) => {
                    await $(tile).data("mosaic-tile").blur();
                });
                // focus new tile
                var focused_tile = document.activeElement.closest(".mosaic-tile");
                if (focused_tile) {
                    $(focused_tile).data("mosaic-tile").focus();
                }
            }
            // Check if alt
            if (e.keyCode === 18) {
                // pressing alt during existing tile dragging checks for possible copy mode
                // see mosaic.tile.js -> COPYABLE_TILE_TYPES
                const orig_tile = _panel.querySelector(".mosaic-original-tile");
                if (
                    _panel.classList.contains("mosaic-panel-dragging") &&
                    !_panel.classList.contains("mosaic-panel-dragging-new")
                ) {
                    const cpy_class = orig_tile?.classList.contains("copyable") ? "copy" : "unique";
                    _panel.classList.add(`mosaic-panel-dragging-${cpy_class}`);
                }
                else if (_panel.classList.contains("mosaic-advanced")) {
                    _panel.classList.remove("mosaic-advanced");
                } else {
                    _panel.classList.add("mosaic-advanced");
                    _panel["mosaic-advanced-enabled"] = (new Date()).getTime();
                }
            }
            // Check if ctrl
            if (e.keyCode === 17) {
                _panel.classList.add("inner-subcolumn");
            }

            // Check if esc
            if (e.keyCode === 27) {
                // Check if dragging
                var original_tile = _panel.querySelectorAll(".mosaic-original-tile");
                if (original_tile.length > 0) {
                    original_tile.forEach((tile) => {
                        tile.classList.add("mosaic-drag-cancel");
                        if (tile.classList.contains("mosaic-helper-tile-new")) {
                            // original row
                            const $orig_row = $(tile).parent().parent();
                            // dismiss dragging tile and cleanup row
                            $(tile).remove();
                            $orig_row.mosaicCleanupRow();
                            // Remove dragging class from content
                            _panel.classList.remove(
                                "mosaic-panel-dragging", "mosaic-panel-dragging-new",
                            );
                            // Hide all dividers
                            _document.querySelectorAll(".mosaic-selected-divider").forEach(divider => {
                                divider.classList.remove("mosaic-selected-divider");
                            });
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
            }
        };

        // Bind event and add to array
        events.add_event_listener(
            _document,
            "keydown",
            "pat-layout--keydown",
            DocumentKeydown,
        );
        events.add_event_listener(
            _document,
            "keyup",
            "pat-layout--keyup",
            DocumentKeyup,
        );

        // Add deselect
        const DocumentMousedown = function (e) {
            // Get element
            let elm;
            if (e.target) {
                elm = e.target;
            } else if (e.srcElement) {
                elm = e.srcElement;
            }

            // Find new tile helper
            var new_tile = $(".mosaic-helper-tile-new", self.mosaic.document);
            if (new_tile.length > 0) {
                new_tile.each(function () {
                    // Handle drag end
                    $(this).mosaicHandleDragEnd();
                });
                return;
            }

            // If clicked inside TinyMCE or Modal exit
            if ($(elm).parents(".mce-content-body, .tox, .modal-wrapper").length > 0) {
                return;
            }

            // If clicked outside a tile
            if ($(elm).parents(".mosaic-tile").length === 0) {
                // Deselect tiles
                self.mosaic.document
                    .querySelectorAll(".mosaic-selected-tile:not(.mosaic-tile-loading)")
                    .forEach(async (el) => {
                        await $(el).data("mosaic-tile").blur();
                    });
                // Check if outside toolbar
                if ($(elm).parents(".mosaic-toolbar").length === 0) {
                    // Set actions
                    self.mosaic.toolbar.SelectedTileChange();
                }
            }
        };

        // Bind event and add to array
        events.add_event_listener(
            self.mosaic.document,
            "mousedown",
            "pat-layout--mousedown-document",
            DocumentMousedown,
        );

        // Handle mouse move event: when holding down mouse left button and dragging the handler left or right.
        const DocumentMousemove = function (e) {
            // Get new tile helper
            var $new_tile_helper = $(".mosaic-helper-tile-new", self.mosaic.document);

            if ($new_tile_helper.length) {
                // Get offset
                const offset = $new_tile_helper.parent().offset();
                // Get mouse x
                $new_tile_helper.css("top", e.pageY + 3 - offset.top);
                $new_tile_helper.css("left", e.pageX + 3 - offset.left);

            }

            // Get resize handle helper
            var $helper = $(".mosaic-resize-handle-helper", self.mosaic.document);

            if ($helper.length) {
                // Get row
                var $row = $helper.parent();
                var resize_handle_index = $helper.data("resize_handle_index");

                // Get mouse x
                var mouse_x = parseFloat(
                    e.pageX - // current mouseX
                    $row.offset().left - // current row position left
                    parseInt(getComputedStyle($row[0]).paddingLeft) - // calculated padding (eg fluid-background-row)
                    4 // centered handler
                );

                // Get mouse percentage
                var mouse_percentage = Math.round(
                    (mouse_x / $helper.data("row_width")) * 100
                );

                // Get closest snap location
                var snap = 8;
                var snap_offset = 8;
                var cur_snap_offset;
                var grid_percent = GetGridPercentList();

                grid_percent.forEach(function (perc) {
                    cur_snap_offset = Math.abs(perc - mouse_percentage);
                    if (cur_snap_offset < snap_offset) {
                        snap = perc;
                        snap_offset = cur_snap_offset;
                    }
                });

                var snap_size = GetBootstrapColByPercent(snap);

                var column_sizes = $helper[0]["column_sizes"];
                // sum of all column sizes
                var column_sizes_sum = column_sizes.reduce((a, b) => a + b, 0);
                // sum of sizes before helper index
                var col_size_before = column_sizes.slice(0, resize_handle_index).reduce((a, b) => a + b, 0);
                // sum of sizes after helper index excluding last column (which is elastic)
                var col_size_after = column_sizes.slice(resize_handle_index + 1, -1).reduce((a, b) => a + b, 0);
                // calculate maximum size of current column
                if (resize_handle_index == (column_sizes.length - 1)) {
                    // if last column, we can drag to full width (12)
                    var col_size_max = 12 - col_size_before - col_size_after;
                } else {
                    // if not last column, we respect last elastic column (min-size: 1)
                    // with its fixed right margin
                    var col_size_max = column_sizes_sum - col_size_before - col_size_after - 1;
                }
                var new_column_size = snap_size - col_size_before;
                // limit to maximum of col_sizes_sum and minimum of 1
                new_column_size = new_column_size > col_size_max ? col_size_max : new_column_size < 1 ? 1 : new_column_size;
                let new_column_sizes = [];

                column_sizes.forEach((width, i) => {
                    if (i === resize_handle_index) {
                        // set new size for current column
                        new_column_sizes.push(new_column_size);
                    } else if (i === (column_sizes.length - 1)) {
                        // calculate elastic size for last column
                        var _before = new_column_sizes.reduce((a, b) => a + b);
                        var _last_size = column_sizes_sum - _before;
                        // _last_size cannot be lower than 1
                        new_column_sizes.push(_last_size < 1 ? 1 : _last_size);
                    } else {
                        new_column_sizes.push(width);
                    }
                })

                log.debug("------------------resize-handle(move)--------------------")
                log.debug(`mouse_x: ${mouse_x}`);
                log.debug(`mouse_percentage: ${mouse_percentage}`);
                log.debug(`resize_handle_index: ${resize_handle_index}`);
                log.debug(`column_sizes: ${column_sizes}`);
                log.debug(`column_sizes_sum: ${column_sizes_sum}`);
                log.debug(`cur_snap_offset: ${cur_snap_offset}`);
                log.debug(`snap: ${snap}`);
                log.debug(`snap_size: ${snap_size}`);
                log.debug(`col_size_before: ${col_size_before}`);
                log.debug(`col_size_after: ${col_size_after}`);
                log.debug(`col_size_max: ${col_size_max}`);
                log.debug(`new_column_size: ${new_column_size}`);
                log.debug(`new_column_sizes: ${new_column_sizes}`);

                var col_size_sum = 0;
                var resize_css_classes = self.layout.resizeClasses.join(" ");
                var width_css_classes = self.layout.widthClasses.join(" ");

                $row.children(".mosaic-resize-placeholder").each(function (idx) {
                    var col_size = column_sizes[idx];
                    var col_size_class = GetWidthClassByColSize(col_size);

                    // placeholder width and position
                    $(this)
                        .removeClass(`${width_css_classes} ${resize_css_classes}`)
                        .addClass(`${col_size_class} mosaic-resize-${col_size_sum}`)
                        .find(".info")
                        .html(col_size);

                    col_size_sum += col_size;

                    if (idx === resize_handle_index) {
                        // move resize handle helper
                        $helper
                            .removeClass(resize_css_classes)
                            .addClass(`mosaic-resize-${col_size_sum}`);
                    }
                });

                // Set new size
                $helper[0]["column_sizes"] = new_column_sizes;
            }

        };

        // Bind event and add to array
        events.add_event_listener(
            self.mosaic.document,
            "mousemove",
            "pat-layout--mousemove",
            DocumentMousemove,
        );
        events.add_event_listener(
            self.mosaic.document,
            "dragover",
            "pat-layout--dragover",
            DocumentMousemove,
        );

        // Handle mouse up event
        // When resizing is done on mouse up event apply the changes to the div elements
        const DocumentMouseup = function () {
            // Find resize helper
            $(".mosaic-resize-handle-helper", self.mosaic.document).each(function () {

                var resize_handle_index = $(this).data("resize_handle_index");

                // Cleanup original row
                $(this).parent().parent().mosaicCleanupRow();

                // Get panel
                var panel = $(this).closest("[data-panel]");

                // Get column sizes
                var column_sizes = $(this)[0]["column_sizes"];
                var css_width_classes = self.layout.widthClasses.join(" ");

                // Set column sizes
                $(this)
                    .parent()
                    .children(".mosaic-grid-cell")
                    .each(function (i) {
                        $(this)
                            .removeClass(css_width_classes)
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
                                                    column_sizes[i],
                                                ),
                                            ),
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
        events.add_event_listener(
            self.mosaic.document,
            "mouseup",
            "pat-layout--mouseup",
            DocumentMouseup,
        );

        // Handle mousemove on tile
        const TileMousemove = function (e) {

            // only if dragging
            if (
                $(this).parents("[data-panel]").hasClass("mosaic-panel-dragging") ===
                false
            ) {
                return;
            }

            // Hide all dividers
            $(".mosaic-selected-divider", self.mosaic.document).removeClass(
                "mosaic-selected-divider",
            );

            // Don't show dividers if above original or floating tile
            // but not in copy mode
            if (
                (!$(this).parents("[data-panel]").hasClass("mosaic-panel-dragging-copy") &&
                    $(this).hasClass("mosaic-original-tile")) ||
                $(this).hasClass("mosaic-tile-align-left") ||
                $(this).hasClass("mosaic-tile-align-right")
            ) {
                return;
            }

            // Get direction
            var dir = $(this).mosaicGetDirection(e);
            var divider = $(this).children(".mosaic-divider-" + dir);

            // Check if left or right divider
            if (dir === "left" || dir === "right") {
                var row = divider.closest(".mosaic-grid-row");
                var cols = row.children(".mosaic-grid-cell").filter((idx, el) => {
                    // filter out original tile to enable moving tiles
                    // inside row with max-columns tiles
                    return $(el).find(".mosaic-original-tile").length === 0;
                });

                if (cols.length >= $(".mosaic-panel").data("max-columns")) {
                    // This row already up to the max amount of columns allowed for this layout
                    // do not allow new items to be dropped alingside any elements in this row.
                    return;
                }

                // If row has multiple columns
                if (row.children(".mosaic-grid-cell").length > 1) {
                    divider.height(row.height() + 5);
                    divider.css(
                        "top",
                        row.offset().top - divider.parent().offset().top - 5,
                    );
                } else {
                    divider.height(divider.parent().height() + 5);
                    divider.css("top", -5);
                }
            }

            // Show divider
            divider.addClass("mosaic-selected-divider");
        };

        // Bind events
        self.mosaic.document.querySelectorAll(".mosaic-tile").forEach((tile) => {
            events.add_event_listener(
                tile,
                "mousemove",
                "pat-layout--mousemove-tile",
                TileMousemove,
            );
            events.add_event_listener(
                tile,
                "dragover",
                "pat-layout--dragover-tile",
                TileMousemove,
            );
            events.add_event_listener(
                tile,
                "click",
                "pat-layout--select-tile",
                () => {
                    if ($(".mosaic-helper-tile-new", self.mosaic.document).length > 0) {
                        // only if not dropping tile
                        return;
                    }
                    tile["mosaic-tile"].select();
                },
            );
        });

        const applyCustomCss = function (e) {
            if (e.target.id === "custom-css-input-box") {
                return;
            }
            self.mosaic.document.querySelectorAll(".mosaic-set-custom-css").forEach(el => {
                const row = el.parentNode;
                let base_css = "mosaic-grid-row";
                if (row.classList.contains("mosaic-innergrid-row")) {
                    base_css += "mosaic-innergrid-row";
                }
                const customCss = el.querySelector("#custom-css-input-box").value;
                if (customCss) {
                    base_css += ` ${customCss}`;
                }
                row.setAttribute("class", base_css);
                // re-apply handles if we add/remove "mosaic-fixed-row"
                $(row).mosaicSetResizeHandles();
                el.remove();
            })
        };

        const CustomCSSOnDblClick = function (e) {
            // Only do this for "mosaic-grid-row" if advanced mode is enabled
            const target = e.target;
            const panel = target.closest("[data-panel]");
            if (panel.classList.contains("mosaic-advanced") && target.classList.contains("mosaic-grid-row")) {
                // Check we don't have an input field already
                if (target.querySelector(".mosaic-set-custom-css")) {
                    return;
                }

                // We are in advance mode
                var custom_classes = Array.from(target.classList).filter(cls => {
                    return ["mosaic-grid-row", "mosaic-innergrid-row"].indexOf(cls) == -1;
                });

                const row_input = document.createElement("div");
                row_input.classList.add("mosaic-set-custom-css");
                row_input.innerHTML = `<label>Custom CSS for this row</label><input type="text" id="custom-css-input-box" value="${custom_classes.join(' ')}"></input>`;
                target.append(row_input);
                events.add_event_listener(
                    row_input,
                    "keyup",
                    "pat-layout--apply-custom-css",
                    applyCustomCss,
                );
            }
        };
        self.mosaic.document.querySelectorAll(".mosaic-grid-row").forEach((gridrow) => {
            events.add_event_listener(
                gridrow,
                "dblclick",
                "pat-layout--dblclick-gridrow",
                CustomCSSOnDblClick,
            );
        });
        events.add_event_listener(
            self.mosaic.document,
            "click",
            "pat-layout--click",
            applyCustomCss,
        );
    }

    async initialize_panels() {
        var self = this;

        self.initJQueryHelpers();
        self.init_events();

        // determine biggest panel during loop
        let biggestPanel = null;
        let width = 0;

        for (const panel of self.mosaic.panels) {
            // Get jQuery object
            const $panel = $(panel);

            // Add icons and dividers
            for (const tileNode of panel.querySelectorAll(".mosaic-tile")) {
                var tile = new Tile(self.mosaic, tileNode);
                await tile.initialize();
                $(tileNode).mosaicAddDrag();
            }

            $panel.mosaicAddEmptyRows();
            $panel.children(".mosaic-grid-row").mosaicSetResizeHandles();

            const pWidth = panel.offsetWidth;
            if (pWidth && pWidth > width) {
                width = pWidth;
                biggestPanel = panel;
            }

            $panel.find(".mosaic-innergrid-row").mosaicSetResizeHandles();
        }

        // Select first tile in biggest panel
        if (biggestPanel) {
            const firstTile = biggestPanel.querySelector(".mosaic-tile:first-child");
            if (firstTile) {
                firstTile["mosaic-tile"].select();
            }
        }

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
                            "mosaic-selected-divider",
                        );
                        $(this).children("div").addClass("mosaic-selected-divider");
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

            const create_empty_row = (add_class) => {
                return $(mosaic_doc.createElement("div"))
                    .addClass(`mosaic-grid-row mosaic-empty-row ${add_class}`)
                    .append(
                        $(mosaic_doc.createElement("div"))
                            .addClass("mosaic-grid-cell col")
                            .append(
                                $(mosaic_doc.createElement("div"))
                            )
                    )
                    .mosaicAddMouseMoveEmptyRow();
            }

            return this.each(() => {
                // first row is always an empty one
                $(this).prepend(create_empty_row(""))
                // Loop through rows
                $(this)
                    .find(".mosaic-grid-row:not(.mosaic-empty-row").each(function() {
                        const empty_row = create_empty_row(
                            $(this).hasClass("mosaic-innergrid-row") ? "mosaic-innergrid-row" : ""
                        );
                        $(this).after(empty_row);
                    })
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
                const tile = this;
                let drag_start_ts = 0;
                let drag_start = null;
                let drag_start_delay = 300;

                const DragMove = (event) => {
                    var helper = $(".mosaic-helper-tile", mosaic_doc);
                    var offset = helper.parents("[data-panel]").offset();
                    if (offset) {
                        helper.css("top", event.pageY + 3 - offset.top);
                        helper.css("left", event.pageX + 3 - offset.left);
                    }
                };

                const DragStop = () => {
                    clearTimeout(drag_start);

                    events.remove_event_listener(mosaic_doc, "pat-layout--dragmove")
                    events.remove_event_listener(mosaic_doc, "pat-layout--dragstop")

                    var curr_ts = (new Date()).getTime();

                    if ((curr_ts - drag_start_ts) < drag_start_delay) {
                        // skip within dragstart delay
                        return;
                    }

                    // Handle drag end
                    const helper = $(".mosaic-helper-tile", mosaic_doc);
                    helper.mosaicHandleDragEnd();
                    helper.remove();
                };

                const DragStart = (event) => {
                    // Add dragging class to content area
                    self.mosaic.panels.addClass("mosaic-panel-dragging");

                    $(".mosaic-selected-tile", mosaic_doc)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content")
                        .trigger("blur");

                    var originaltile = $(event.target).parents(
                        ".mosaic-tile",
                    );
                    originaltile.addClass("mosaic-original-tile");

                    var clone = originaltile.clone(true);
                    clone
                        .removeClass("mosaic-original-tile")
                        .css({
                            "width": originaltile.width(),
                            "max-height": "33%",
                            "position": "absolute",
                            "opacity": 0.5,
                        })
                        .addClass("mosaic-helper-tile");
                    originaltile.parents("[data-panel]").append(clone);

                    events.add_event_listener(
                        mosaic_doc,
                        "mousemove",
                        "pat-layout--dragmove",
                        DragMove,
                    )
                }

                const tile_drag_handle = tile.querySelector(".mosaic-drag-handle");

                events.add_event_listener(
                    tile_drag_handle,
                    "mousedown",
                    "pat-layout--startdrag",
                    (event) => {
                        if (event.button !== 0) {
                            // only left mouse down!
                            return;
                        }
                        // register dragstop
                        events.add_event_listener(mosaic_doc, "mouseup", "pat-layout--dragstop", DragStop);
                        // delayed dragstart
                        drag_start_ts = (new Date()).getTime();
                        drag_start = setTimeout(() => {
                            DragStart(event);
                        }, drag_start_delay);
                    }
                );

                const tile_move_btn = tile.querySelector(".mosaic-btn-move");
                if (tile_move_btn) {
                    events.add_event_listener(
                        tile_move_btn,
                        "mousedown",
                        "pat-layout--startmove",
                        (event) => {
                            if (event.button === 0) {
                                // only left mouse down starts dragging
                                DragStart(event);
                            }
                        }
                    );
                }
            });
        };

        /**
         * Event handler for drag end - add new tile
         *
         * @id jQuery.mosaicHandleDragEnd
         * @return {Object} jQuery object
         */
        $.fn.mosaicHandleDragEnd = async function () {
            // Get layout object
            var obj = $(this).parents("[data-panel]");
            let copy = obj.hasClass("mosaic-panel-dragging-copy");

            // Get direction
            const divider = mosaic_doc.querySelector(".mosaic-selected-divider");
            const drop = $(divider.parentElement);

            // get direction where to drop
            let dir = "";
            for (const _dir of ["top", "bottom", "left", "right"]) {
                if (divider.classList.contains(`mosaic-divider-${_dir}`)) {
                    dir = _dir;
                }
            }
            divider.classList.remove("mosaic-selected-divider");

            // True if new tile is inserted or copied
            var new_tile = $(".mosaic-helper-tile-new", mosaic_doc).length > 0;
            var original_tile = $(".mosaic-original-tile", mosaic_doc);
            // get original row here, because tile might be moved
            var original_row = original_tile.closest(".mosaic-grid-row");
            // check if we want to copy it (pressed ALT key -> see init_events)
            let dropped_tile = copy ? await self.copyTile(original_tile) : original_tile;

            // If divider is not found or not sane drop, act like esc is pressed
            if (divider.length === 0 || drop.hasClass("mosaic-helper-tile")) {
                dropped_tile.addClass("mosaic-drag-cancel");
            }

            // we have to remove left/right divider if we're dropped inside a fixed row
            const drop_row = divider.closest(".mosaic-grid-row");
            if (drop_row.classList.contains("mosaic-fixed-row")) {
                $(".mosaic-divider-left", dropped_tile).remove();
                $(".mosaic-divider-right", dropped_tile).remove();
            }

            const fixup_classes = (_t) => {
                _t.removeClass("mosaic-drag-cancel");
                _t.removeClass(
                    "mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left",
                );
                _t.css({ width: "", left: "", top: "" });
            };

            if (
                // Check if esc is pressed
                dropped_tile.hasClass("mosaic-drag-cancel") ||
                // Not dropped on tile and empty row
                (drop.hasClass("mosaic-tile") === false &&
                    drop.hasClass("mosaic-innergrid-row") === false &&
                    drop.hasClass("mosaic-empty-row") === false) ||
                // Check if max columns rows is reached
                (drop.parent().parent().children(".mosaic-grid-cell").length >=
                    obj.data("max-columns") &&
                    (dir === "left" || dir === "right"))
            ) {
                fixup_classes(dropped_tile);

            } else if (drop.hasClass("mosaic-empty-row")) {
                // Dropped on empty row

                // Replace empty with normal row class
                drop.removeClass("mosaic-empty-row")
                    .attr("class", original_row.attr("class"))
                    .off("mousemove");

                // Clean cell
                drop.children(".mosaic-grid-cell").children("div").remove();

                fixup_classes(dropped_tile);

                drop.children(".mosaic-grid-cell").append(dropped_tile);
            } else {
                // Dropped on row or below an inner grid

                fixup_classes(dropped_tile);

                // When the layout object has the special class (Assigned in line 369), wrap
                // the tile in a div.mosaic-innergrid-row so you can create nested columns
                if (obj.hasClass("inner-subcolumn")) {
                    dropped_tile = $(mosaic_doc.createElement("div"))
                        .addClass("mosaic-grid-row mosaic-innergrid-row")
                        .append(
                            $(mosaic_doc.createElement("div"))
                                .addClass("mosaic-grid-cell col")
                                .append(dropped_tile)
                        );
                    for (const pos of ["top", "bottom"]) {
                        dropped_tile.append(
                            $(mosaic_doc.createElement("div")).addClass(
                                "mosaic-divider mosaic-divider-" + pos,
                            ),
                        );
                    }
                }

                if (dir === "top") {
                    // If top add tile before
                    drop.before(dropped_tile);

                } else if (dir === "bottom") {
                    // If bottoma dd tile after
                    drop.after(dropped_tile);

                } else if (dir === "left" || dir === "right") {
                    // If left
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
                                                    .mosaicAddDrag(),
                                            ),
                                    ),
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
                                            .append(
                                                next_elms.clone(true).mosaicAddDrag(),
                                            ),
                                    ),
                            );
                            next_elms.remove();
                        }

                        // Resize current column
                        _col.removeClass(self.layout.widthClasses.join(" ")).addClass(
                            "col",
                        );

                        // Create column with dragged tile in it
                        if (dir === "left") {
                            drop.parent().before(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell col")
                                    .append(dropped_tile),
                            );
                        } else {
                            drop.parent().after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell col")
                                    .append(dropped_tile),
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
                                    .append(dropped_tile),
                            );
                        } else {
                            _col.after(
                                $(mosaic_doc.createElement("div"))
                                    .addClass("mosaic-grid-cell")
                                    .append(dropped_tile),
                            );
                        }

                        // Resize columns
                        _row.mosaicSetColumnSizes();

                        // Add resize handles
                        _row.mosaicSetResizeHandles();
                    }
                }
            }

            // Remove dragging class from content
            obj.removeClass(
                "mosaic-panel-dragging mosaic-panel-dragging-copy mosaic-panel-dragging-unique mosaic-panel-dragging-new inner-subcolumn",
            );

            // Remove remaining empty rows
            self.mosaic.panels.find(".mosaic-grid-row:not(:has(.mosaic-tile))").remove();
            self.mosaic.panels.find(".mosaic-empty-row").remove();

            // Cleanup original row
            original_row.mosaicCleanupRow();

            // Add empty rows
            self.mosaic.panels.mosaicAddEmptyRows();

            // re-initialize events
            self.init_events();

            // Select new tile and make it draggable
            if ((new_tile || copy) && dropped_tile.length > 0) {
                dropped_tile.mosaicAddDrag();
                if (!dropped_tile.data("mosaic-tile")) {
                    return;
                }
                await dropped_tile.data("mosaic-tile").initializeContent(new_tile, copy);
                dropped_tile.data("mosaic-tile").select();
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
                var $gridCells = $(this).children(".mosaic-grid-cell");
                var nr_of_columns = $gridCells.length;
                var width_css_classes = self.layout.widthClasses.join(" ");

                // This will reset the width classes - it will automatically set the widths

                $gridCells.each(function (idx) {
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

                if (["mosaic-fixed-row", "mosaic-empty-row"].filter(cls => this.classList.contains(cls)).length) {
                    // no resize handles for empty or fixed rows
                    return;
                }

                // Check number of columns
                var grid_cells = $(this).children(".mosaic-grid-cell");
                var nr_of_columns = grid_cells.length;

                if (nr_of_columns <= 12) {
                    var column_sizes = [];
                    var zero_count = 0;
                    var col_sum = 0;
                    var col_size = 0;

                    for (let i = 0; i < nr_of_columns; i++) {
                        col_size = GetColSizeByColClass(
                            self.getWidthClass(grid_cells[i]),
                        );
                        column_sizes.push(col_size);
                        col_sum = col_sum + col_size;
                        if (col_size === 0) {
                            zero_count = zero_count + 1;
                        }
                    }

                    // count "auto-size" columns with class ".col" and
                    // calculate width equally.
                    // NOTE: This requires extra logic in case of 5 columns.
                    // See the ".toFixed(1)" below because of floating point
                    // issues with 12 / 5 * 3
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
                                    `mosaic-resize-handle mosaic-resize-handle-${i + 1
                                    } mosaic-resize-${(nr_of_columns === 5) ? resize_col_size.toFixed(1).replace(".0", "") : resize_col_size}`,
                                )
                                .data("resize_handle_index", i),
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
                        if ($(".mosaic-helper-tile-new").length > 0) {
                            // do not resize when we place a new tile
                            return;
                        }
                        var $currRow = $(this).parent();
                        var $mosaicGridCellChildren = $currRow.children(".mosaic-grid-cell");

                        if ($mosaicGridCellChildren.length > 12) {
                            return;
                        }
                        var col_size_sum = 0;
                        var column_sizes = [];

                        $mosaicGridCellChildren.each(function () {
                            var col_size = $(this).data("col_size"); // get computed size of the column
                            column_sizes.push(col_size);

                            var placeholder = $(mosaic_doc.createElement("div"))
                                .addClass(
                                    `mosaic-resize-placeholder col-${col_size} mosaic-resize-${col_size_sum}`,
                                )
                                .append(
                                    $(mosaic_doc.createElement("div"))
                                        .addClass(
                                            "mosaic-resize-placeholder-inner-border",
                                        )
                                        .append(
                                            $(mosaic_doc.createElement("div"))
                                                .addClass("info")
                                                .html(col_size),
                                        ),
                                );

                            // Add placeholder
                            $currRow.append(placeholder);

                            // summarize column sizes for placeholder classes
                            col_size_sum += col_size;
                        });

                        // Get resize handle index
                        var resize_handle_index = self.getResizeHandleClassId(this);
                        // calculate resize helper position
                        var resize_handle_index_size = column_sizes.reduce((a, b, i) => i <= resize_handle_index ? a + b : a, 0);

                        // Add helper
                        var $helper = $("<div />")
                            .addClass(
                                "mosaic-resize-handle mosaic-resize-handle-helper"
                            )
                            .addClass(
                                `mosaic-resize-${resize_handle_index_size}`
                            )
                            .data("row_width", $currRow.width())
                            .data("resize_handle_index", resize_handle_index);

                        // save array as DOM attribute
                        $helper[0]["column_sizes"] = column_sizes;

                        $currRow.append($helper);

                        // Set resizing state
                        $(this)
                            .parents("[data-panel]")
                            .addClass("mosaic-panel-resizing");
                        $currRow.addClass("mosaic-row-resizing");
                        $(".mosaic-selected-tile", mosaic_doc)
                            .children(".mosaic-tile-content")
                            .trigger("blur");

                        log.debug("------------------resize-handle(click)--------------------")
                        log.debug(`resize_handle_index: ${resize_handle_index}`)
                        log.debug(`resize_handle_index_size: ${resize_handle_index_size}`)
                        log.debug(`row_width: ${$currRow.width()}`)
                        log.debug(`column_sizes: ${column_sizes}`)

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
            .closest(".mosaic-grid-cell")
            .removeClass(
                "col-1 col-2 col-3 col-4 col-5 col-6 col-7 col-8 col-9 col-10 col-11 col-12",
            )
            .addClass("col");

        e.data.el.closest(".mosaic-grid-row").mosaicSetResizeHandles();

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
    let cw_idx = 12;
    grid_percent.forEach((perc, idx) => {
        if (perc == width) {
            cw_idx = idx + 1;
        }
    })
    return cw_idx;
}
