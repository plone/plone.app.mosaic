/**
 * This plugin is used to create a mosaic layout.
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

/* global window: false, tinyMCE: false */
/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define([
    'jquery',
    'mockup-patterns-modal'
], function($, modal) {
    'use strict';

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the layout namespace
    $.mosaic.layout = {
        widthClasses: ['mosaic-width-quarter', 'mosaic-width-third',
                       'mosaic-width-half', 'mosaic-width-two-thirds',
                       'mosaic-width-three-quarters', 'mosaic-width-full'],
        positionClasses: ['mosaic-position-leftmost', 'mosaic-position-quarter',
                          'mosaic-position-third', 'mosaic-position-half',
                          'mosaic-position-two-thirds',
                          'mosaic-position-three-quarters']
    };

    /**
    * Create a new instance of a mosaic layout.
    *
    * @constructor
    * @id jQuery.fn.mosaicLayout
    * @return {Object} Returns a new mosaic layout object.
    */
    $.fn.mosaicLayout = function () {

        // Keydown handler
        var DocumentKeydown = function (e) {

            // Check if esc
            if (e.keyCode === 27) {

                // Check if dragging
                var original_tile = $(".mosaic-original-tile", $.mosaic.document);
                if (original_tile.length > 0) {
                    original_tile.each(function () {
                        $(this).addClass("mosaic-drag-cancel");
                        if ($(this).hasClass("mosaic-helper-tile-new")) {
                            $(document).trigger("mousedown");
                        } else {
                            $(document).trigger("mouseup");
                        }
                    });

                // Deselect tile
                } else {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }

                // Find resize helper
                $(".mosaic-resize-handle-helper",
                  $.mosaic.document).each(function () {

                    // Remove resizing state
                    $(this).parents("[data-panel]")
                        .removeClass("mosaic-panel-resizing");
                    $(this).parent().removeClass("mosaic-row-resizing");
                    $(this).parent().children(".mosaic-resize-placeholder")
                        .remove();

                    // Remove helper
                    $(this).remove();
                });

                // Hide overlay
                if ($.mosaic.overlay.app) {
                    $.mosaic.overlay.app.hide();
                    // $.mosaic.overlay.$el.trigger('destroy.modal.patterns');;
                }
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('keydown', DocumentKeydown);

        // Add deselect
        var DocumentMousedown = function (e) {

            // Get element
            var elm;
            if (e.target) {
                elm = e.target;
            } else if (e.srcElement) {
                elm = e.srcElement;
            }

            // If clicked outside a tile
            if ($(elm).parents(".mosaic-tile").length === 0) {

                // Check if outside toolbar
                if ($(elm).parents(".mosaic-toolbar").length === 0) {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }
            }

            // Find resize helper
            var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document);
            if (new_tile.length > 0) {
                new_tile.each(function () {

                    // Handle drag end
                    $(this).mosaicHandleDragEnd();
                });
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousedown', DocumentMousedown);

        // Handle mouse move event
        var DocumentMousemove = function (e) {

            // Find resize helper
            $(".mosaic-helper-tile-new", $.mosaic.document).each(function () {

                // Get offset
                var offset = $(this).parent().offset();

                // Get mouse x
                $(this).css("top", e.pageY + 3 - offset.top);
                $(this).css("left", e.pageX + 3 - offset.left);
            });

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {
                var columns;

                var cur_snap_offset;

                // Get helper
                var helper = $(this);

                // Get row
                var row = helper.parent();

                // Get mouse x
                var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

                // Get mouse percentage
                var mouse_percentage = (mouse_x / helper.data("row_width")) * 100;

                // Get closest snap location
                var snap = 25;
                var snap_offset = 1000;
                $([25, 33, 50, 67, 75]).each(function () {
                    cur_snap_offset = Math.abs(this - mouse_percentage);
                    if (cur_snap_offset < snap_offset) {
                        snap = this;
                        snap_offset = cur_snap_offset;
                    }
                });

                // If 2 columns
                if (helper.data("nr_of_columns") === 2) {

                    // Check if resize
                    if (helper.data("column_sizes").split(" ")[0] !== snap) {

                        // Loop through columns
                        row.children(".mosaic-resize-placeholder").each(function (i) {

                            // First column
                            if (i === 0) {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(snap, 10)));

                            // Second column
                            } else {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(100 - snap, 10)))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                                // Set helper
                                helper
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));
                            }
                        });

                        // Set new size
                        $(this).data("column_sizes", snap + " " + (100 - snap));
                    }

                // Else 3 columns
                } else {

                    // Get resize handle index
                    var resize_handle_index = $(this).data("resize_handle_index");

                    // Check if first resize handle
                    if (resize_handle_index === 1) {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index") - 1] !== snap) &&
                                (parseInt(snap, 10) <= 50)) {

                            // Get columns
                            columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 25:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            case 33:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(1)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "50 25 25");
                                break;
                            }
                        }

                    // Else second resize handle
                    } else {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index")] !== (100 - snap)) &&
                                (parseInt(snap, 10) >= 50)) {

                            // Get columns
                            columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                helper.data("column_sizes", "25 25 50");
                                break;
                            case 66:
                            case 67:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 75:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            }
                        }
                    }
                }
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousemove', DocumentMousemove);
        $($.mosaic.document).bind('dragover', DocumentMousemove);

        // Handle mouse up event
        var DocumentMouseup = function (e) {

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

                // Get panel
                var panel = $(this).parents("[data-panel]");

                // Get column sizes
                var column_sizes = $(this).data("column_sizes").split(" ");

                // Set column sizes
                $(this).parent().children(".mosaic-grid-cell").each(function (i) {
                    var offset_x = 0;
                    for (var j = 0; j < i; j += 1) {
                        offset_x += parseInt(column_sizes[j], 10);
                    }
                    $(this)
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .addClass(GetPositionClassByInt(offset_x) + " " + GetWidthClassByInt(parseInt(column_sizes[i], 10)));
                });

                // Remove resizing state
                panel.removeClass("mosaic-panel-resizing");
                $(this).parent().removeClass("mosaic-row-resizing");
                $(this).parent().children(".mosaic-resize-placeholder").remove();

                // Set resize handles
                $(this).parent().mosaicSetResizeHandles();
                panel.mosaicSetResizeHandleLocation();
                panel.find(".mosaic-selected-tile").mosaicFocusTileContent();

                // Remove helper
                $(this).remove();
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mouseup', DocumentMouseup);

        // Handle mousemove on tile
        var TileMousemove = function (e) {

            // Check if dragging
            if ($(this).parents("[data-panel]").hasClass("mosaic-panel-dragging")) {

                // Hide all dividers
                $(".mosaic-selected-divider", $.mosaic.document)
                    .removeClass("mosaic-selected-divider");

                // Don't show dividers if above original or floating tile
                if (($(this).hasClass("mosaic-original-tile") === false) &&
                    ($(this).hasClass("mosaic-tile-align-left") === false) &&
                    ($(this).hasClass("mosaic-tile-align-right") === false)) {

                    // Get direction
                    var dir = $(this).mosaicGetDirection(e);
                    var divider = $(this).children(".mosaic-divider-" + dir);

                    // Check if left or right divider
                    if ((dir === "left") || (dir === "right")) {
                        var row = divider.parent().parent().parent();

                        // If row has multiple columns
                        if (row.children(".mosaic-grid-cell").length > 1) {
                            divider.height(row.height() + 5);
                            divider.css('top', (row.offset().top - divider.parent().offset().top) - 5);
                        } else {
                            divider.height(divider.parent().height() + 5);
                            divider.css('top', -5);
                        }
                    }

                    // Show divider
                    divider.addClass("mosaic-selected-divider");
                }
            }
        };

        // Bind events
        $($.mosaic.document).on("mousemove", ".mosaic-tile", TileMousemove);
        $($.mosaic.document).on("dragover", ".mosaic-tile", TileMousemove);

        // On click select the current tile
        $($.mosaic.document).on("click", ".mosaic-tile", function () {

            // Select tile
            $(this).mosaicSelectTile();
        });

        $($.mosaic.document).on("click", ".mosaic-close-icon", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if app tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();

                // Remove tags
                $.mosaic.removeHeadTags(tile_url);

                // Calc delete url
                var url = tile_url.split('?')[0];
                url = url.split('@@');
                var tile_type_id = url[1].split('/');
                url = url[0] + '@@delete-tile/' + tile_type_id[0] + '/' + tile_type_id[1];
                // Calc absolute delete url
                if (url.match(/^\.\/.*/)) {
                    url = $.mosaic.options.context_url + url.replace(/^\./, '');
                }

                // Ajax call to remove tile
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (value) {
                        var authenticator = $(value).find('[name="_authenticator"]').val();
                        $.ajax({
                            type: "POST",
                            url: url,
                            data: {
                                'buttons.delete': 'Delete',
                                '_authenticator': authenticator
                            },
                            success: function(value) {
                                /*
                                 $.plone.notify({
                                     title: "Info",
                                     message: "Application tile removed",
                                     sticky: false
                                 });
                                */
                            }
                        });
                    }
                });
            }

            // Remove empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Get original row
            var original_row = $(this).parents(".mosaic-tile").parent().parent();

            // Save tile value
            $.mosaic.saveTileValueToForm(tile_config.name, tile_config);

            // Remove current tile
            $(this).parent().remove();

            $.mosaic.undo.snapshot();

            // Cleanup original row
            original_row.mosaicCleanupRow();

            // Add empty rows
            $.mosaic.options.panels.mosaicAddEmptyRows();

            // Set toolbar
            $.mosaic.options.toolbar.trigger("selectedtilechange");
            $.mosaic.options.toolbar.mosaicSetResizeHandleLocation();
        });


        // On click open overlay
        $($.mosaic.document).on("click", ".mosaic-info-icon", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if application tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();
                tile_url = tile_url.replace(/@@/, '@@edit-tile/');
                // Calc absolute edit url
                if (tile_url.match(/^\.\/.*/)) {
                    tile_url = $.mosaic.options.context_url + tile_url.replace(/^\./, '');
                }

                // Annotate the edited tile, because overlay will steal its focus
                $(this).parents(".mosaic-tile").addClass('mosaic-edited-tile');

                // Open overlay
                $.mosaic.overlay.app = new modal($('.mosaic-toolbar'), {
                    ajaxUrl: tile_url,
                    loadLinksWithinModal: true,
                    buttons: '.formControls > input[type="submit"], .actionButtons > input[type="submit"]'
                });
                $.mosaic.overlay.app.$el.off('after-render');
                $.mosaic.overlay.app.on('after-render', function(event) {
                    $('input[name*="cancel"]',
                      $.mosaic.overlay.app.$modal)
                      .off('click').on('click', function() {
                          // Close overlay
                          $.mosaic.overlay.app.hide();
                          $.mosaic.overlay.app = null;

                          // Remove edited annotation
                          $('.mosaic-edited-tile', $.mosaic.document).removeClass('mosaic-edited-tile');
                    });
                });
                $.mosaic.overlay.app.show();
                $.mosaic.overlay.app.$el.off('formActionSuccess');
                $.mosaic.overlay.app.on('formActionSuccess', function (event, response, state, xhr, form) {
                    var tileUrl = xhr.getResponseHeader('X-Tile-Url'),
                        value = $.mosaic.getDomTreeFromHtml(response);
                    if (tileUrl) {

                        // Remove head tags
                        $.mosaic.removeHeadTags(tileUrl);

                        // Add head tags
                        $.mosaic.addHeadTags(tileUrl, value);

                        // Update tile
                        $('.mosaic-edited-tile .mosaic-tile-content',
                          $.mosaic.document).html('<p class="hiddenStructure tileUrl">' + tileUrl.replace(/&/gim, '&amp;') + '</p>' + value.find('.temp_body_tag').html());  // jshint ignore:line

                        // Close overlay
                        $.mosaic.overlay.app.hide();
                        $.mosaic.overlay.app = null;
                    }

                    // Remove edited annotation
                    $('.mosaic-edited-tile', $.mosaic.document).removeClass('mosaic-edited-tile');
                });
            } else {

                // Edit field
                $.mosaic.overlay.open('field', tile_config);
            }
        });

        // Loop through matched elements
        var total = this.length;
        return this.each(function (i) {

            // Get current object
            var obj = $(this);

            // Add icons and dividers
            obj.find('.mosaic-tile').mosaicInitTile();
            obj.find('.mosaic-tile').mosaicAddDrag();
            obj.mosaicAddEmptyRows();
            obj.children('.mosaic-grid-row').mosaicSetResizeHandles();
            if (i === (total - 1)) {

                // Get biggest panel
                var width = 0;
                var index = 0;
                $.mosaic.options.panels.each(function (j) {
                    if ($(this).width() > width) {
                        width = $(this).width();
                        index = j;
                    }
                });

                // Select first tile in biggest panel
                $.mosaic.options.panels.eq(index).find('.mosaic-tile:first').mosaicSelectTile();
            }
        });
    };

    /**
     * Initialize the matched tiles
     *
     * @id jQuery.mosaicInitTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicInitTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get layout object
            var tile = $(this);
            var obj = tile.parents("[data-panel]");  // jshint ignore:line

            var tile_config = $(this).mosaicGetTileConfig();

            // Check read only
            if (tile_config && tile_config.read_only) {

                // Set read only
                $(this).addClass("mosaic-read-only-tile");
            }

            // Init rich text
            if (tile_config && $(this).hasClass('mosaic-read-only-tile') === false &&
                ((tile_config.tile_type === 'text' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'app' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'field' && tile_config.read_only === false &&
                  (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
                   tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
                   tile_config.widget === 'z3c.form.browser.textlines.TextLinesWidget' ||
                   tile_config.widget === 'z3c.form.browser.textlines.TextLinesFieldWidget' ||
                   tile_config.widget === 'plone.app.z3cform.widget.RichTextFieldWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget' ||
                   tile_config.widget === 'plone.app.widgets.dx.RichTextWidget')))) {

                // Init rich editor
                $(this).children('.mosaic-tile-content').mosaicEditor();
            }

            // Add border divs
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-tile-outer-border")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-inner-border")
                    )
            );

            // If tile is field tile
            if (tile_config && tile_config.tile_type === "field") {
            }

            // Add label
            if (tile_config) {
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-tile-label")
                        .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-label-content")
                            .html(tile_config.label)
                    )
                        .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-label-left")
                    )
                );
            }

            // If the tile is movable
            if ($(this).hasClass("movable") && $.mosaic.options.can_change_layout) {

                // Add drag handle
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-drag-handle")
                );
            }

            // If tile is removable
            if ($(this).hasClass("removable") && $.mosaic.options.can_change_layout) {

                // Add close icon
                $(this).prepend('<div class="mosaic-tile-control mosaic-close-icon"></div>');
            }

            // Add settings icon
            if (tile_config && tile_config.settings
                    && $(this).hasClass('mosaic-read-only-tile') === false) {
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-info-icon")
                );
            }

            // Add dividers
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-top")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-bottom")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-right")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-left")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
        });
    };

    /**
     * Select the matched tile
     *
     * @id jQuery.mosaicSelectTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicSelectTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Check if not already selected
            if ($(this).hasClass("mosaic-selected-tile") === false
                && $(this).hasClass("mosaic-read-only-tile") === false) {

                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();
                $(this).addClass("mosaic-selected-tile");

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Focus the tile content field
                $(this).mosaicFocusTileContent();
            }
        });
    };

    /**
     * Focus the tile content
     *
     * @id jQuery.mosaicFocusTileContent
     * @return {Object} jQuery object
     */
    $.fn.mosaicFocusTileContent = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get content
            var tile_content = $(this).children(".mosaic-tile-content");
            tile_content.focus();
        });
    };

    /**
     * Add mouse move handler to empty rows
     *
     * @id jQuery.mosaicAddMouseMoveEmptyRow
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddMouseMoveEmptyRow = function () {

        // Loop through matched elements
        return this.each(function () {

            // Mouse move event
            $(this).mousemove(function (/* e */) {

                // Get layout object
                var obj = $(this).parents("[data-panel]");

                // Check if dragging
                if (obj.hasClass("mosaic-panel-dragging")) {

                    // Hide all dividers
                    $(".mosaic-selected-divider", $.mosaic.document)
                        .removeClass("mosaic-selected-divider");
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

        // Loop through matched elements
        return this.each(function () {

            // Loop through rows
            $(this).find(".mosaic-grid-row").each(function (i) {

                // Check if current row has multiple columns
                if ($(this).children(".mosaic-grid-cell").length > 1) {

                    // Check if first row
                    if (i === 0) {
                        $(this).before(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }

                    // Check if last row or next row also contains columns
                    if (($(this).nextAll(".mosaic-grid-row").length === 0) || ($(this).next().children(".mosaic-grid-cell").length > 1)) {
                        $(this).after(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }
                }
            });

            if ($(this).find(".mosaic-grid-row").length === 0) {
                $(this).append(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-grid-row mosaic-empty-row")
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                            .append($($.mosaic.document.createElement("div"))
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-tile-outer-border")
                                    .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-divider-dot")
                                    )
                                )
                            )
                        )
                        .mosaicAddMouseMoveEmptyRow()
                );
            }
        });
    };

    /**
     * Get the width class of the matched elements
     *
     * @id jQuery.mosaicGetWidthClass
     * @return {String} Name of the width class
     */
    $.fn.mosaicGetWidthClass = function () {

        var x;

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {

                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x])) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {
                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x].replace("position", "resize"))) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Fallback
        return $.mosaic.layout.widthClasses[0];
    };

    /**
     * Get the position class of the matched elements
     *
     * @id jQuery.mosaicGetPositionClass
     * @return {String} Name of the position class
     */
    $.fn.mosaicGetPositionClass = function () {

        var x;

        // Loop through position classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x])) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Loop through resize classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x].replace("position", "resize"))) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Fallback
        return $.mosaic.layout.positionClasses[0];
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
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                var offset = helper.parents("[data-panel]").offset();
                helper.css("top", event.pageY + 3 - offset.top);
                helper.css("left", event.pageX + 3 - offset.left);
            };
            var DragStop = function () {
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                $($.mosaic.document)
                    .unbind('mousemove', DragMove)
                    .unbind('mouseup', DragStop);

                // Handle drag end
                helper.mosaicHandleDragEnd();
                helper.remove();
            };
            return tile.each(function () {
                tile.find('div.mosaic-drag-handle')
                    .unbind('mousedown')
                    .bind('mousedown', function (event) {

                    var downX = event.pageX;
                    var downY = event.pageY;
                    var DragCheckMove = function (event) {
                        if (Math.max(
                            Math.abs(downX - event.pageX),
                            Math.abs(downY - event.pageY)
                        ) >= 1) {

                            // Add dragging class to content area
                            $.mosaic.options.panels.addClass("mosaic-panel-dragging");
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .removeClass("mosaic-selected-tile")
                                .children(".mosaic-tile-content").blur();

                            var originaltile = $(event.target).parents(".mosaic-tile");

                            var clone = originaltile.clone(true);
                            originaltile.addClass("mosaic-original-tile");

                            originaltile.parents("[data-panel]").append(clone);
                            clone
                                .css({
                                    "width": originaltile.width(),
                                    "position": "absolute",
                                    "opacity": 0.5
                                })
                                .addClass("mosaic-helper-tile");
                            $($.mosaic.document).mousemove(DragMove);
                            $($.mosaic.document).mouseup(DragStop);
                            $($.mosaic.document).unbind('mousemove', DragCheckMove);
                        }
                    };
                    $($.mosaic.document).bind('mousemove', DragCheckMove);
                    $($.mosaic.document).bind('mouseup', function () {
                        $($.mosaic.document).unbind('mousemove', DragCheckMove);
                    });
                });
            });
        });
    };

    /**
     * Event handler for drag end
     *
     * @id jQuery.mosaicHandleDragEnd
     * @return {Object} jQuery object
     */
    $.fn.mosaicHandleDragEnd = function () {

        // Get layout object
        var obj = $(this).parents("[data-panel]");  // jshint ignore:line

        // Remove dragging class from content
        $.mosaic.options.panels.removeClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Get direction
        var divider = $(".mosaic-selected-divider", $.mosaic.document);
        var drop = divider.parent();
        var dir = "";
        if (divider.hasClass("mosaic-divider-top")) {
            dir = "top";
        }
        if (divider.hasClass("mosaic-divider-bottom")) {
            dir = "bottom";
        }
        if (divider.hasClass("mosaic-divider-left")) {
            dir = "left";
        }
        if (divider.hasClass("mosaic-divider-right")) {
            dir = "right";
        }
        divider.removeClass("mosaic-selected-divider");

        // True if new tile is inserted
        var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document).length > 0;
        var original_tile = $(".mosaic-original-tile", $.mosaic.document);

        // If divider is not found or not sane drop, act like esc is pressed
        if (divider.length === 0 || drop.hasClass('mosaic-helper-tile')) {
            original_tile.addClass("mosaic-drag-cancel");
        }

        // Check if esc is pressed
        if (original_tile.hasClass("mosaic-drag-cancel")) {

            // Remove cancel class
            original_tile.removeClass("mosaic-drag-cancel");

            // Remove remaining empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Dropped on empty row
        } else if (drop.hasClass("mosaic-empty-row")) {

            // Replace empty with normal row class
            drop
                .removeClass("mosaic-empty-row")
                .attr('class', original_tile.parents('.mosaic-grid-row').first().attr('class'))
                .unbind('mousemove');

            // Clean cell
            drop.children(".mosaic-grid-cell")
                .children("div").remove();

            // Add tile to empty row
            drop.children(".mosaic-grid-cell")
                .append(original_tile
                    .clone(true)
                    .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                    .css({width: "", left: "", top: ""})
                    .mosaicAddDrag()
                    .addClass("mosaic-new-tile")
            );

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

        // Not dropped on tile
        } else if (drop.hasClass("mosaic-tile") === false) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Check if max columns rows is reached
        } else if ((drop.parent().parent().children(".mosaic-grid-cell").length === 4) && (dir === "left" || dir === "right")) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

            // Notify user
            //$.plone.notify({
            //    title: "Info",
            //    message: "You can't have more then 4 columns",
            //    sticky: false
            //});

        // Dropped on row
        } else {

            // Remove empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // If top
            if (dir === "top") {

                // Add tile before
                drop.before(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If bottom
            } else if (dir === "bottom") {

                // Add tile after
                drop.after(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If left
            } else if ((dir === "left") || (dir === "right")) {

                // Check if only 1 column in the row
                if (drop.parent().parent().children(".mosaic-grid-cell").length === 1) {

                    // Put tiles above dropped tile in a new row above
                    var prev_elms = drop.prevAll();
                    if (prev_elms.length > 0) {
                        drop.parent().parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($(prev_elms.get().reverse()).clone(true).mosaicAddDrag())
                                )
                            );
                        prev_elms.remove();
                    }

                    // Put tiles below dropped tile in a new row below
                    var next_elms = drop.nextAll();
                    if (next_elms.length > 0) {
                        drop.parent().parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append(next_elms.clone(true).mosaicAddDrag())
                                )
                            );
                        next_elms.remove();
                    }

                    // Resize current column
                    drop.parent()
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .addClass("mosaic-width-half");

                    // Create column with dragged tile in it
                    if (dir === "left") {
                        drop.parent()
                            .addClass("mosaic-position-half")
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")  // jshint ignore:line
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    } else {
                        drop.parent()
                            .addClass("mosaic-position-leftmost")
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-half")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")  // jshint ignore:line
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    }

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();

                // Dropped inside column
                } else {

                    // Create new column
                    if (dir === "left") {
                        drop.parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")  // jshint ignore:line
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    } else {
                        drop.parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")  // jshint ignore:line
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    }

                    // Rezize columns
                    drop.parent().parent().mosaicSetColumnSizes();

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();
                }
            }
        }

        // Remove original tile
        var original_row = original_tile.parent().parent();
        $(".mosaic-original-tile", $.mosaic.document).remove();

        // Cleanup original row
        original_row.mosaicCleanupRow();

        // Add empty rows
        $.mosaic.options.panels.mosaicAddEmptyRows();

        // Re-init rich text editor after tile has been moved in DOM
        $(".mosaic-new-tile .mosaic-rich-text").each(function () {
            if (tinyMCE && tinyMCE.get($(this).attr("id"))) {
                tinyMCE.get($(this).attr("id")).remove();
                $(this).mosaicEditor();
            }
        });

        // Select new tile
        if (new_tile) {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile").mosaicSelectTile();
        } else {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile");
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
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            $(this)
                .children(".mosaic-grid-cell").each(function (i) {
                    $(this)
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "));

                    // Set width / position
                    switch (nr_of_columns) {

                    // 1 column
                    case 1:
                        $(this).addClass("mosaic-width-full mosaic-position-leftmost");
                        break;

                    // 2 columns
                    case 2:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-half mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-half mosaic-position-half");
                            break;
                        }
                        break;

                    // 3 columns
                    case 3:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-third mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-third mosaic-position-third");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-third mosaic-position-two-thirds");
                            break;
                        }
                        break;

                    // 4 columns
                    case 4:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-quarter mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-quarter mosaic-position-quarter");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-quarter mosaic-position-half");
                            break;
                        case 3:
                            $(this).addClass("mosaic-width-quarter mosaic-position-three-quarters");
                            break;
                        }
                        break;
                    }
                });
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
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            switch (nr_of_columns) {
            case 2:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))  // jshint ignore:line
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            case 3:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))  // jshint ignore:line
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-two " + $($(this).children(".mosaic-grid-cell").get(2))  // jshint ignore:line
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            }

            // Mouse down handler on resize handle
            $(this).children(".mosaic-resize-handle").mousedown(function (/* e */) {

                // Get number of columns and current sizes
                var column_sizes = [];
                $(this).parent().children(".mosaic-grid-cell").each(function () {

                    // Add column size
                    switch ($(this).mosaicGetWidthClass()) {
                    case "mosaic-width-half":
                        column_sizes.push("50");
                        break;
                    case "mosaic-width-quarter":
                        column_sizes.push("25");
                        break;
                    case "mosaic-width-third":
                        column_sizes.push("33");
                        break;
                    case "mosaic-width-two-thirds":
                        column_sizes.push("66");
                        break;
                    case "mosaic-width-three-quarters":
                        column_sizes.push("75");
                        break;
                    }

                    // Add placeholder
                    $(this).parent().append($($.mosaic.document.createElement("div"))
                        .addClass("mosaic-resize-placeholder " + $(this).mosaicGetWidthClass() + " " + $(this).mosaicGetPositionClass().replace("position", "resize"))  // jshint ignore:line
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-resize-placeholder-inner-border")
                        )
                    );
                });

                // Get resize handle index
                var resize_handle_index = 1;
                if ($(this).hasClass("mosaic-resize-handle-two")) {
                    resize_handle_index = 2;
                }

                // Add helper
                $(this).parent().append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
                    .addClass($(this).mosaicGetPositionClass().replace("position", "resize"))
                    .data("row_width", $(this).parent().width())
                    .data("nr_of_columns", $(this).parent().children(".mosaic-grid-cell").length)
                    .data("column_sizes", column_sizes.join(" "))
                    .data("resize_handle_index", resize_handle_index)
                );

                // Set resizing state
                $(this).parents("[data-panel]").addClass("mosaic-panel-resizing");
                $(this).parent().addClass("mosaic-row-resizing");
                $(".mosaic-selected-tile", $.mosaic.document).children(".mosaic-tile-content").blur();

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

            // Check if prev row exists and if both rows only have 1 column
            if ((original_row.prevAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) &&
                    (original_row.prev().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").prepend(
                    original_row.prev().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.prev().remove();
            }

            // Check if next row exists and if both rows only have 1 column
            if ((original_row.nextAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) &&
                    (original_row.next().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").append(
                    original_row.next().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.next().remove();
            }

            // Set resize handles
            original_row.mosaicSetResizeHandles();
        });
    };

    /**
     * Set the location of the resize handle (left, right or center)
     *
     * @id jQuery.mosaicSetResizeHandleLocation
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetResizeHandleLocation = function () {

        // Get panel
        var obj = $(this);

        // Loop through rows
        obj.children(".mosaic-grid-row").each(function () {

            // Get row
            var row = $(this);

            // Get cells
            var cells = row.children(".mosaic-grid-cell");

            // Check if 2 or 3 columns
            if ((cells.length === 2) || (cells.length === 3)) {

                // Remove location classes
                row.children(".mosaic-resize-handle").removeClass("mosaic-resize-handle-left mosaic-resize-handle-center mosaic-resize-handle-right");

                // Check if first column is selected
                if ($(cells.get(0)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-left");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");

                // Check if second columns is selected
                } else if ($(cells.get(1)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-right");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-left");

                // Check if third column is selected
                } else if (cells.length === 3 && $(cells.get(2)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-right");

                // No tile selected
                } else {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");
                }
            }
        });
    };

    /**
     * Get the config of the tile
     *
     * @id jQuery.mosaicGetTileConfig
     * @return {Object} config of the tile
     */
    $.fn.mosaicGetTileConfig = function () {
        return $.mosaic.getTileConfig($(this));
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
        var x = parseFloat((e.pageX - $(this).offset().left) - (width / 2));
        var y = parseFloat((e.pageY - $(this).offset().top) - (height / 2));
        var halfwidth = width / 2;
        var halfheight = height / 2;

        // If left of center
        if (x < 0) {

            // If above center
            if (y < 0) {
                if ((x / y) < ((-1 * halfwidth) / (-1 * halfheight))) {
                    return "top";
                } else {
                    return "left";
                }
            // Below center
            } else {
                if ((x / y) < ((-1 * halfwidth) / (halfheight))) {
                    return "left";
                } else {
                    return "bottom";
                }
            }

        // Right of center
        } else {

            // If above center
            if (y < 0) {
                if ((x / y) < ((1 * halfwidth) / (-1 * halfheight))) {
                    return "right";
                } else {
                    return "top";
                }
            // Below center
            } else {
                if ((x / y) < ((halfwidth) / (halfheight))) {
                    return "bottom";
                } else {
                    return "right";
                }
            }
        }
    };

    /**
     * Disable edit html source
     *
     * @id jQuery.mosaic.disableEditHtmlSource
     */
    $.mosaic.disableEditHtmlSource = function () {

        // Find rich text textareas
        $(".mosaic-rich-text-textarea", $.mosaic.document).each(function () {

            // Local variables
            var tilecontent, text;

            // Get text and tilecontent
            text = $(this).val();
            tilecontent = $(this).parent();
            tilecontent
                .html(text)
                .mosaicEditor();
        });
    };


    /**
     * Add an apptile with the given value
     *
     * @id jQuery.mosaic.addAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.addAppTile = function (type, url /*, id */) {

        // Close overlay
        if ($.mosaic.overlay.app) {
            $.mosaic.overlay.app.hide();
            // $.mosaic.overlay.trigger('destroy.modal.patterns');
        }

        // Get value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Add tile
                $.mosaic.addTile(type,
                    '<p class="hiddenStructure tileUrl">' + url.replace(/&/gim, '&amp;') + '</p>' +
                        value.find('.temp_body_tag').html());
            }
        });
    };

    /**
     * Add an apptile with the given value
     *
     * @id jQuery.mosaic.addAppTile
     * @param {String} type Type of the application tile
     * @param {String} response HTML code to show
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.addAppTileHTML = function (type, response, url) {
        var value;

        value = $.mosaic.getDomTreeFromHtml(response);
        $.mosaic.addHeadTags(url, value);
        $.mosaic.addTile(type,
            '<p class="hiddenStructure tileUrl">' + url.replace(/&/gim, '&amp;') + '</p>' +
                value.find('.temp_body_tag').html());
    };


    /**
     * Edit an apptile with the given value
     *
     * @id jQuery.mosaic.editAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.editAppTile = function (url) {

        // Close overlay
        $.mosaic.overlay.close();

        // Focus on current window
        window.parent.focus();

        // Get new value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Remove head tags
                $.mosaic.removeHeadTags(url);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Update tile
                $('.mosaic-selected-tile .mosaic-tile-content',
                  $.mosaic.document).html('<p class="hiddenStructure tileUrl">' + url.replace(/&/gim, '&amp;') + '</p>' + value.find('.temp_body_tag').html());  // jshint ignore:line
            }
        });
    };

    /**
     * Add a tile with the given value
     *
     * @id jQuery.mosaic.addTile
     * @param {String} type Type of the application tile
     * @param {String} value Value of the application tile
     */
    $.mosaic.addTile = function (type, value) {
        // Set dragging state
        $.mosaic.options.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Add helper
        $($.mosaic.options.panels.get(0)).append(
            $($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-row")
                .append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                    .append($($.mosaic.document.createElement("div"))
                        .addClass("movable removable mosaic-tile mosaic-" + type + "-tile")
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-content")
                            .html(value)
                        )
                        .addClass("mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile")
                    )
                )
        );

        // Set helper min size
        var helper = $.mosaic.options.panels.find(".mosaic-helper-tile-new");

        // Get max width
        var width = 0;
        $.mosaic.options.panels.each(function () {
            if ($(this).width() > width) {
                width = $(this).width();
            }
        });

        // Set width
        if (helper.width() < (width / 4)) {
            helper.width(width / 4);
        } else {
            helper.width(helper.width());
        }
        helper.mosaicInitTile();

        // Notify user
        /*
        $.plone.notify({
            title: "Inserting new tile",
            message: "Select the location for the new tile",
            sticky: false
        });
        */
    };

    /**
     * Get the default value of the given tile
     *
     * @id jQuery.mosaic.getDefaultValue
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.getDefaultValue = function (tile_config) {
        var editor_id, editor, start, end;

        // Wrap title and description fields for proper styles
        if (tile_config.name === 'IDublinCore-title') {
            start = '<h1 class="documentFirstHeading">';
            end = '</h1>';
        } else if (tile_config.name === 'IDublinCore-description') {
            start = '<p class="documentDescription">';
            end = '</p>';
        } else {
            start = '<div>';
            end = '</div>';
        }

        switch (tile_config.tile_type) {
        case "field":
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                return start + $("#" + tile_config.id, $.mosaic.document).find('input').attr('value') + end;
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
            case "z3c.form.browser.textlines.TextLinesWidget":
            case "z3c.form.browser.textlines.TextLinesFieldWidget":
                var lines = $("#" + tile_config.id, $.mosaic.document).find('textarea').val().split('\n');
                var return_string = "";
                for (var i = 0; i < lines.length; i += 1) {
                    return_string += lines[i] + "<br/>";
                }
                return start + return_string + end;
            case "plone.app.z3cform.widget.RichTextFieldWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
            case "plone.app.widgets.dx.RichTextWidget":
                editor_id = $('#' + tile_config.id).find('textarea').attr('id');
                editor = tinymce.get(editor_id);
                if (editor) {
                    return editor.getContent();
                } else {
                    return '';
                }
                break;
            default:
                return '<div class="discreet">Placeholder for field:<br/><b>' + tile_config.label + '</b></div>';
            }
            break;
        default:
            return tile_config.default_value;
        }
    };

    /**
     * Save the tile value to the form
     *
     * @id jQuery.mosaic.saveTileValueToForm
     * @param {String} tiletype Type of the tile
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.saveTileValueToForm = function (tiletype, tile_config) {
        var editor_id, editor, value, newline;

        // Update field values if type is rich text
        if (tile_config && tile_config.tile_type === 'field' &&
            tile_config.read_only === false &&
            (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
             tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
             tile_config.widget === 'z3c.form.browser.textlines.TextLinesWidget' ||
             tile_config.widget === 'z3c.form.browser.textlines.TextLinesFieldWidget' ||
             tile_config.widget === 'plone.app.z3cform.widget.RichTextFieldWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget' ||
             tile_config.widget === 'plone.app.widgets.dx.RichTextWidget')) {
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                var $el = $('.mosaic-' + tiletype + '-tile', $.mosaic.document);
                if($el.size() > 1){
                    // XXX weird case here.
                    // if you use content tile, it'll render a title field tile that matches this
                    // and you get weird issues saving data. This is to distinguish this case
                    $el = $el.filter(function(){
                        return $('.mosaic-tile-control', this).length > 0;
                    });
                }
                var val = $el.find('.mosaic-tile-content > *').text();
                $("#" + tile_config.id).find('input').attr('value', val);
                break;
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
            case "z3c.form.browser.textlines.TextLinesWidget":
            case "z3c.form.browser.textlines.TextLinesFieldWidget":
                value = "";
                if (tile_config.name === 'IDublinCore-description') {
                    newline = " ";  // otherwise Plone would replace \n with ''
                } else {
                    newline = "\n";
                }
                $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').each(function () {
                    value += $(this).html()
                        .replace(/<br[^>]*>/ig, newline)
                        .replace(/^\s+|\s+$/g, '') + newline;
                });
                value = value.replace(/^\s+|\s+$/g, '');
                $("#" + tile_config.id).find('textarea').val(value);
                break;
            case "plone.app.z3cform.widget.RichTextFieldWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
            case "plone.app.widgets.dx.RichTextWidget":
                editor_id = $(document.getElementById(tile_config.id)).find('textarea').attr('id');
                editor = tinymce.get(editor_id);
                if (editor) {
                    editor.setContent($('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content').html());
                    $(document.getElementById(tile_config.id)).find('textarea').val(editor.getContent());
                }
                break;
            }
        }
    };

    /**
     * Get the content of the page which can be saved
     *
     * @id jQuery.mosaic.getPageContent
     * @return {String} Full content of the page
     */
    $.mosaic.getPageContent = function () {

        // Content
        var content,
            position = 1,
            size = 12,
            body = "",
            classNames = "",
            panel_id = "";

        // Disable edit html source
        $.mosaic.disableEditHtmlSource();

        // Add body tag
        body += "  <body>\n";

        // Loop through panels
        $("[data-panel]", $.mosaic.document).each(function () {

            // Add open panel tag
            panel_id = $(this).attr("data-panel");
            body += '    <div data-panel="' + panel_id + '">\n';

            // Loop through rows
            $(this).children(".mosaic-grid-row").each(function () {

                // Check if not an empty row
                if ($(this).hasClass("mosaic-empty-row") === false) {

                    // Add row open tag
                    classNames = $(this).attr("class");
                    body += '      <div class="' + classNames + '"\n';
                    body += '           data-grid=\'{"type": "row"}\'>\n';

                    // Loop through rows
                    $(this).children(".mosaic-grid-cell").each(function () {

                        // Add column size
                        switch ($(this).mosaicGetPositionClass()) {
                            case "mosaic-position-leftmost":
                                position = 1;
                                break;
                            case "mosaic-position-quarter":
                                position = 4;
                                break;
                            case "mosaic-position-third":
                                position = 5;
                                break;
                            case "mosaic-position-half":
                                position = 7;
                                break;
                            case "mosaic-position-two-thirds":
                                position = 9;
                                break;
                            case "mosaic-position-three-quarters":
                                position = 10;
                                break;
                        }

                        // Add column size
                        switch ($(this).mosaicGetWidthClass()) {
                            case "mosaic-width-half":
                                size = 6;
                                break;
                            case "mosaic-width-quarter":
                                size = 3;
                                break;
                            case "mosaic-width-third":
                                size = 4;
                                break;
                            case "mosaic-width-two-thirds":
                                size = 8;
                                break;
                            case "mosaic-width-three-quarters":
                                size = 9;
                                break;
                            case "mosaic-width-full":
                                size = 12;
                                break;
                        }

                        // Add cell start tag
                        body += '        <div class="' + $(this).attr("class") + '"\n';
                        body += '             data-grid=\'{"type": "cell", "info":{"xs": "true", "sm": "true", "lg": "true", "pos": {"x": ' + position + ', "width": ' + size + '}}}\'>\n';  // jshint ignore:line

                        // Loop through tiles
                        $(this).children(".mosaic-tile").each(function () {

                            // Get tile type
                            var tiletype = '',
                                classes = $(this).attr('class').split(" ");

                            tiletype = $.mosaic.getTileType($(this));
                            classes = $(classes).filter(function() {
                                switch (this) {
                                    case "mosaic-new-tile":
                                    case "mosaic-helper-tile":
                                    case "mosaic-original-tile":
                                    case "mosaic-selected-tile":
                                        return false;
                                    default:
                                        return true;
                                }
                            }).toArray();

                            // Get tile config
                            var tile_config = $.mosaic.getTileConfig(tiletype);

                            // Predefine vars
                            var tile_url;

                            switch (tile_config.tile_type) {
                            case "text":
                                body += '          <div class="' + classes.join(' ') + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';
                                body += $(this).children(".mosaic-tile-content").html().replace(/^\s+|\s+$/g, '') + "\n";
                                body += '          </div>\n';
                                body += '          </div>\n';
                                break;
                            case "app":
                                body += '          <div class="' + classes.join(' ') + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Get url
                                tile_url = $(this).find('.tileUrl').html();
                                if (tile_url === null) {
                                    break;
                                } else {
                                    // Fix absolute url into a relative one
                                    tile_url = tile_url.replace($.mosaic.options.context_url, './');
                                    tile_url = tile_url.replace(/^\.\/\//, './');
                                }
                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';
                                break;
                            case "field":
                                body += '          <div class="' + classes.join(' ') + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Calc url
                                tile_url = './@@plone.app.standardtiles.field?field=' + tiletype;

                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';

                                // Update field values if type is rich text
                                $.mosaic.saveTileValueToForm(tiletype, tile_config);
                                break;
                            }
                        });

                        // Add cell end tag
                        body += '        </div>\n';
                    });

                    // Add row close tag
                    body += '      </div>\n';
                }
            });

            // Add close panel tag
            body += '    </div>\n';
        });

        // Add close tag
        body += "  </body>\n";

        content = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="' + $.mosaic.options.layout + '">\n';  // jshint ignore:line
        content += body;
        content += '</html>\n';
        return content;
    };

    /**
     * Get the name of the width class of the given integer
     *
     * @id GetWidthClassByInt
     * @param {Integer} column_width Percentage of the column width
     * @return {String} Classname of the width class of the given integer
     */
    function GetWidthClassByInt(column_width) {
        switch (column_width) {
        case 25:
            return "mosaic-width-quarter";
        case 33:
            return "mosaic-width-third";
        case 50:
            return "mosaic-width-half";
        case 66:
        case 67:
            return "mosaic-width-two-thirds";
        case 75:
            return "mosaic-width-three-quarters";
        case 100:
            return "mosaic-width-full";
        }

        // Fallback
        return "mosaic-width-full";
    }

    /**
     * Get the name of the position class of the given integer
     *
     * @id GetPositionClassByInt
     * @param {Integer} position Percentage of the column position
     * @return {String} Classname of the position class of the given integer
     */
    function GetPositionClassByInt(position) {
        switch (position) {
        case 0:
            return "mosaic-position-leftmost";
        case 25:
            return "mosaic-position-quarter";
        case 33:
            return "mosaic-position-third";
        case 50:
            return "mosaic-position-half";
        case 66:
        case 67:
            return "mosaic-position-two-thirds";
        case 75:
            return "mosaic-position-three-quarters";
        }

        // Fallback
        return "mosaic-position-leftmost";
    }
});
