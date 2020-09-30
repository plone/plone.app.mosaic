/**
 * This plugin is used to create a mosaic layout.
 *
 * @author Rob Gietema, Robert Kuzma
 * @version 1.0
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
  'mosaic-url/mosaic.tile',
  'pat-logger',
  'underscore',
  'pat-registry',
  'mockup-patterns-modal'
], function($, Tile, logger, _, Registry, Modal) {
  'use strict';


  // Define mosaic namespace if it doesn't exist
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Define the layout namespace
  $.mosaic.layout = {
    widthClasses: [
      'col',
      'col-1',
      'col-2',
      'col-3',
      'col-4',
      'col-5',
      'col-6',
      'col-7',
      'col-8',
      'col-9',
      'col-10',
      'col-11',
      'col-12',
    ],
    dataClasses: [
      'mosaic-col',
      'mosaic-col-1',
      'mosaic-col-2',
      'mosaic-col-3',
      'mosaic-col-4',
      'mosaic-col-5',
      'mosaic-col-6',
      'mosaic-col-7',
      'mosaic-col-8',
      'mosaic-col-9',
      'mosaic-col-10',
      'mosaic-col-11',
      'mosaic-col-12',
    ],
    positionClasses: [
      'mosaic-position-0',
      'mosaic-position-1',
      'mosaic-position-2',
      'mosaic-position-3',
      'mosaic-position-4',
      'mosaic-position-5',
      'mosaic-position-6',
      'mosaic-position-7',
      'mosaic-position-8',
      'mosaic-position-9',
      'mosaic-position-10',
      'mosaic-position-11',
      'mosaic-position-12',
    ],
    resizeHandleClasses: [
      'mosaic-resize-handle-1',
      'mosaic-resize-handle-2',
      'mosaic-resize-handle-3',
      'mosaic-resize-handle-4',
      'mosaic-resize-handle-5',
      'mosaic-resize-handle-6',
      'mosaic-resize-handle-7',
      'mosaic-resize-handle-8',
      'mosaic-resize-handle-9',
      'mosaic-resize-handle-10',
      'mosaic-resize-handle-11',
      'mosaic-resize-handle-12',
    ],
  };

  /**
  * Create a new instance of a mosaic layout.
  *
  * @constructor
  * @id jQuery.fn.mosaicLayout
  * @return {Object} Returns a new mosaic layout object.
  */
  $.fn.mosaicLayout = function () {

    var DocumentKeyup = function (e) {
      // Check if alt
      if (e.keyCode === 18) {
        var date = new Date();
        var enabled = $(".mosaic-panel", $.mosaic.document).data('advanced-enabled');
        var elapsed = date.getTime() - enabled;
        if (elapsed > 400){
            $(".mosaic-panel", $.mosaic.document).removeClass('mosaic-advanced');
        }
      }
      // Check if ctrl
      if (e.keyCode === 17) {
        $(".mosaic-panel", $.mosaic.document).removeClass('inner-subcolumn');
      }
    };

    // Keydown handler
    var DocumentKeydown = function (e) {

      // Check if alt
      if (e.keyCode === 18) {
        if ($(".mosaic-panel", $.mosaic.document).hasClass('mosaic-advanced')){
            $(".mosaic-panel", $.mosaic.document).removeClass('mosaic-advanced');
        } else {
            var date = new Date();
            $(".mosaic-panel", $.mosaic.document).addClass('mosaic-advanced');
            $(".mosaic-panel", $.mosaic.document).data('advanced-enabled', date.getTime());
        }
      }
      // Check if ctrl
      if (e.keyCode === 17) {
        $(".mosaic-panel", $.mosaic.document).addClass('inner-subcolumn');
      }

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
          $(".mosaic-selected-tile", $.mosaic.document).each(function(){
            var tile = new Tile(this);
            tile.blur();
          });
        }

        // Find resize helper
        $(".mosaic-resize-handle-helper",
          $.mosaic.document).each(function () {

          // Remove resizing state
          $(this).parents("[data-panel]").removeClass("mosaic-panel-resizing");
          $(this).parent().removeClass("mosaic-row-resizing");
          $(this).parent().children(".mosaic-resize-placeholder").remove();

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
    $($.mosaic.document).off('keydown').on('keydown', DocumentKeydown);
    $($.mosaic.document).off('keyup').on('keyup', DocumentKeyup);

    // Add deselect
    var DocumentMousedown = function (e) {

      // Get element
      var elm;
      if (e.target) {
        elm = e.target;
      } else if (e.srcElement) {
        elm = e.srcElement;
      }

      // If clicked TinyMCE toolbar
      if ($(elm).parents(".mce-panel").length > 0) {
        return;
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
    $($.mosaic.document).off('mousedown').on('mousedown', DocumentMousedown);

    // Handle mouse move event: when holding down mouse left button and dragging the handler left or right.
    var DocumentMousemove = function (e) {

      // Find resize helper
      $(".mosaic-helper-tile-new", $.mosaic.document).each(function () {

        // Get offset
        var offset = $(this).parent().offset();

        // Get mouse x
        $(this).css("top", e.pageY + 3 - offset.top);
        $(this).css("left", e.pageX + 3 - offset.left);
      });

      // Find resize helper - there is actually only one
      $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

        console.log("===================");

        var cur_snap_offset;

        // Get helper
        var helper = $(this);

        // Get row
        var row = helper.parent();
        var resize_handle_index = helper.data("resize_handle_index");

        // Get mouse x
        var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

        // Get mouse percentage
        var mouse_percentage = Math.round((mouse_x / helper.data("row_width")) * 100);

        // Get closest snap location
        var snap = 8;
        var snap_offset = 8;

        var grid_percent = GetGridPercentList();

        $(grid_percent).each(function () {
          cur_snap_offset = Math.abs(this - mouse_percentage);
          if (cur_snap_offset < snap_offset) {
            snap = this;
            snap_offset = cur_snap_offset;
          }
        });

        var snap_size = GetBootstrapColByPercent(snap);

        var column_sizes = [];
        row.children(".mosaic-resize-placeholder").each(function (i) {
          var col_size = GetColSizeByColClass($(this).mosaicGetWidthClass());
          column_sizes.push(col_size);
        });

        var col_size_before = 0;
        var col_size_this = 0;
        var col_size_after = 0;
        for (var i = 0; i < column_sizes.length; i++) {
          if (i < resize_handle_index) {
            col_size_before += column_sizes[i] ? column_sizes[i] : 2;
          }
          if (i == resize_handle_index) {
            col_size_this += column_sizes[i];
          }
          if (i > resize_handle_index) {
            col_size_after += column_sizes[i] ? column_sizes[i] : 2;
          }
        }
        var col_size = snap_size - col_size_before;
        var col_size_max = 12 - col_size_before - col_size_after;
        // col_size should not be larger than max size and not less than 0
        col_size = col_size > col_size_max ? col_size_max : col_size < 0 ? 0 : col_size;

        var col_size_handle = col_size_before + col_size;

        console.log("column_sizes", column_sizes);
        console.log("snap_size", snap_size);
        console.log("col_size_before", col_size_before);
        console.log("col_size_after", col_size_after);
        console.log("col_size_max", col_size_max);
        console.log("col_size", col_size);
        console.log("col_size_handle", col_size_handle);
        console.log("resize_handle_index", resize_handle_index);

        if (helper.data("nr_of_columns") > 1) {

          // Loop through columns
          row.children(".mosaic-resize-placeholder").each(function (index) {

            // // If there are columns before this column and the column width is not set,
            // // then set it to the value of 2 and add a Reset button to the Tile.
            //
            // var mosaicDataClass = $(this).mosaicGetDataClass();
            // var data_size = GetColSizeByColClass(mosaicDataClass, "mosaic-col-");
            //
            // if (index < resize_handle_index && data_size === 0) {
            //   column_sizes[index] = 2;
            //
            //   var $mosaicGridCell = $(this).parent().children(".mosaic-grid-cell").get(index);
            //   var $tileSideTools = $($mosaicGridCell).children(".mosaic-tile").first().children(".mosaic-tile-side-tools").first();
            //
            //   $tileSideTools.children(".mosaic-tile-label").children(".mosaic-tile-label-reset").parent().remove();
            //
            //   $tileSideTools.append(
            //     $($.mosaic.document.createElement("div"))
            //       .addClass("mosaic-tile-label")
            //       .append(
            //         $($.mosaic.document.createElement("div"))
            //           .addClass("mosaic-tile-label-reset")
            //           .append(AddResetAnchor($tileSideTools, column_sizes[index]))
            //       )
            //       .append(
            //         $($.mosaic.document.createElement("div"))
            //           .addClass("mosaic-tile-label-left")
            //       )
            //   );
            // }

            // Left column
            if (index === resize_handle_index) {
              column_sizes[index] = col_size;

              var mosaic_resize_class = "mosaic-resize-0";
              if (column_sizes.length > 1 && index > 0) {
                var _value = 0;
                for (var i = 0; i < index; i++) {
                  _value += column_sizes[i];
                }
                mosaic_resize_class = "mosaic-resize-" + _value;
              }

              var col_size_class = GetWidthClassByColSize(col_size);
              $(this)
                .removeClass($.mosaic.layout.widthClasses.join(" "))
                .removeClass($.mosaic.layout.dataClasses.join(" "))
                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                .addClass("mosaic-" + col_size_class + " " + col_size_class + " " + mosaic_resize_class)
                .find(".info")
                .html(col_size);
            }

          });

          // Set new size
          $(this).data("column_sizes", column_sizes);

        }

      });
    };

    // Bind event and add to array
    $($.mosaic.document).off('mousemove').on('mousemove', DocumentMousemove);
    $($.mosaic.document).off('dragover').on('dragover', DocumentMousemove);

    // Handle mouse up event
    // When resizing is done on mouse up event apply the changes to the div elements
    var DocumentMouseup = function (e) {

      // Find resize helper
      $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

        var resize_handle_index = $(this).data("resize_handle_index");

        // Cleanup original row
        $(this).parent().parent().mosaicCleanupRow();

        // Get panel
        var panel = $(this).parents("[data-panel]");

        // Get column sizes
        var column_sizes = $(this).data("column_sizes");

        // Set column sizes
        $(this).parent().children(".mosaic-grid-cell").each(function (i) {
          var offset_x = 0;
          for (var j = 0; j < i; j++) {
            offset_x += column_sizes[j];
          }

          $(this)
            .removeClass($.mosaic.layout.positionClasses.join(" "))  // probably not needed, but just for cleaning up
            .removeClass($.mosaic.layout.widthClasses.join(" "))
            .addClass(GetWidthClassByColSize(column_sizes[i]));

          var can_reset = $(this).hasClass("col");
          if (!can_reset && i === resize_handle_index) {
            $(this).children(".mosaic-tile").first().children(".mosaic-tile-side-tools").each(function (index) {
                var $tileSideTools = $(this);

                $tileSideTools.children(".mosaic-tile-label").children(".mosaic-tile-label-reset").parent().remove();

                $tileSideTools.append(
                  $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-tile-label")
                    .append(
                      $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-label-reset")
                        .append(AddResetAnchor($tileSideTools, column_sizes[i]))
                    )
                    .append(
                      $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-label-left")
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
        if($tile.size() > 0){
          var tile = new Tile($tile);
          tile.select();
        }

        // Remove helper
        $(this).remove();

      });
    };

    // Bind event and add to array
    $($.mosaic.document).off('mouseup').on('mouseup', DocumentMouseup);

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

            if (row.children(".mosaic-grid-cell").length >= $('.mosaic-panel').data('max-columns')) {
                // This row already up to the max amount of columns allowed for this layout
                // do not allow this item to be dropped alingside any elements in this row
                return;
            }

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
    $($.mosaic.document).off("mousemove", ".mosaic-tile").on("mousemove", ".mosaic-tile", TileMousemove);
    $($.mosaic.document).off("dragover", ".mosaic-tile").on("dragover", ".mosaic-tile", TileMousemove);

    // On click select the current tile
    $($.mosaic.document).off("click", ".mosaic-tile").on("click", ".mosaic-tile", function () {
      if($(".mosaic-helper-tile-new", $.mosaic.document).length === 0){
        // only if not dropping tile
        var tile = new Tile(this);
        tile.select();
      }
    });

    var applyCustomCss = function (e) {
      if ($(e.target).attr('id') === 'custom-css-input-box'){
        return;
      }
      $.each($("div.mosaic-set-custom-css"), function (){
        var parent = $(this).parent();
        var base_css = 'mosaic-grid-row';
        if (parent.hasClass('mosaic-innergrid-row')){
          base_css = 'mosaic-grid-row mosaic-innergrid-row';
        }
        var classes = $(this).find("input#custom-css-input-box").val();
        base_css += ' ' + classes;
        parent.attr('class', base_css);
        $(this).remove();
      });
    };

    var CustomCSSOnDblClick = function (e) {
      // Only do this for "mosaic-grid-row" if advanced mode is enabled
      var target = $(e.target);
      var obj = target.parents("[data-panel]");
      if (obj.hasClass('mosaic-advanced') && target.hasClass('mosaic-grid-row')){
        // Check we don't have an input field already
        if ($(target).find(".mosaic-set-custom-css").length > 0){
          return;
        }

        // We are in advance mode
        var custom_classes = [];
        $.each(target.attr('class').split(' '), function () {
          if ((this !== undefined) && (this !== 'mosaic-grid-row') && (this !== 'mosaic-innergrid-row')){
            custom_classes.push(this);
          }
        });
        var input = $("<input type='text' id='custom-css-input-box'></input>").val(custom_classes.join(' '));
        var div = $("<div></div>")
                  .addClass("mosaic-set-custom-css")
                  .append($("<label>Custom CSS for this row:</label>"))
                  .append(input);
        target.append(div);
      }

    };

    $($.mosaic.document).on('dblclick', '.mosaic-grid-row', CustomCSSOnDblClick);
    $($.mosaic.document).on('click', applyCustomCss);

    // Loop through matched elements
    var total = this.length;
    return this.each(function (i) {

      // Get current object
      var obj = $(this);

      // Add icons and dividers
      obj.find('.mosaic-tile').each(function(){
        var tile = new Tile(this);
        tile.initialize();
        tile.scanRegistry();
      });
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
        var $tile = $.mosaic.options.panels.eq(index).find('.mosaic-tile:first');
        if($tile.size() > 0){
          var tile = new Tile($tile);
          tile.select();
        }
      }

      obj.find('.mosaic-innergrid-row').each(function(){
        $(this).mosaicAddMouseMoveInnergridRow();
        $(this).mosaicSetResizeHandles();
        var that = $(this);
        _.each(['top', 'bottom'], function(pos){
          that.append(
            $($.mosaic.document.createElement("div"))
            .addClass("mosaic-divider mosaic-divider-" + pos)
            .append(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider-dot")
            )
          );
        });
      });

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
          $(".mosaic-selected-divider", $.mosaic.document)
            .removeClass("mosaic-selected-divider");

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
      $(this).find(".mosaic-grid-row:not(.mosaic-innergrid-row)").each(function (i) {
        $(this).before(
          $($.mosaic.document.createElement("div"))
            .addClass("mosaic-grid-row mosaic-empty-row")
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-grid-cell col")
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
        if ($(this).nextAll(".mosaic-grid-row").length === 0) {
          $(this).after(
            $($.mosaic.document.createElement("div"))
              .addClass("mosaic-grid-row mosaic-empty-row")
              .append($($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-cell col")
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
      });

      if ($(this).find(".mosaic-grid-row:not(.mosaic-innergrid-row)").length === 0) {
        $(this).append(
          $($.mosaic.document.createElement("div"))
            .addClass("mosaic-grid-row mosaic-empty-row")
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-grid-cell col")
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
   * @id jQuery.mosaicGetDataClass
   * @return {String} Name of the width class
   */
  $.fn.mosaicGetDataClass = function () {

    var x;

    // Loop through width classes
    for (x in $.mosaic.layout.dataClasses) {

      if ($.mosaic.layout.dataClasses.hasOwnProperty(x)) {

        // If class found
        if ($(this).hasClass($.mosaic.layout.dataClasses[x])) {

          // Return the width class
          return $.mosaic.layout.dataClasses[x];
        }
      }
    }

    // Fallback
    return $.mosaic.layout.dataClasses[0];
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
   * Get the resize handle class index of the matched element
   *
   * @id jQuery.mosaicGetResizeHandleClassId
   * @return {Integer} Id of the resize handle class
   */
  $.fn.mosaicGetResizeHandleClassId = function () {

    // Loop through resize handle classes
    for (var i = 0; i < $.mosaic.layout.resizeHandleClasses.length; i++) {
      if ($(this).hasClass($.mosaic.layout.resizeHandleClasses[i])) {
        return i;
      }
    }

    // Fallback
    return 1;
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
   * Event handler for drag end - add new tile
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
    _.each(['top', 'bottom', 'left', 'right'], function(_dir){
      if(divider.hasClass("mosaic-divider-" + _dir)){
        dir = _dir;
      }
    });
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

    // Not dropped on tile
    } else if (drop.hasClass("mosaic-tile") === false && drop.hasClass("mosaic-innergrid-row") === false) {

      // Check if new tile
      if (!new_tile) {

        // Make sure the original tile doesn't get removed
        original_tile
          .removeClass("mosaic-original-tile")
          .addClass("mosaic-new-tile");
      }
    // Check if max columns rows is reached
    } else if ((drop.parent().parent().children(".mosaic-grid-cell").length >= obj.data('max-columns')) && (dir === "left" || dir === "right")) {

      // Check if new tile
      if (!new_tile) {

        // Make sure the original tile doesn't get removed
        original_tile
          .removeClass("mosaic-original-tile")
          .addClass("mosaic-new-tile");
      }

    // Dropped on row or below an inner grid
    } else {

      /* When the layout object has the special class (Assigned in line 82), wrap
         the tile in a div.mosaic-grid-cell so it would create an inner column */
      var tile_to_drop = original_tile
                          .clone(true)
                          .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                          .css({width: "", left: "", top: ""})
                          .mosaicAddDrag()
                          .addClass("mosaic-new-tile");
      if (obj.hasClass('inner-subcolumn')){
          tile_to_drop = $($.mosaic.document.createElement("div"))
                          .addClass("mosaic-grid-row mosaic-innergrid-row")
                          .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-grid-cell col")
                            .append($($.mosaic.document.createElement("div"))
                              .append($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-innergrid-outer-border")
                              )
                            ).append(tile_to_drop)
                          )
                          .mosaicAddMouseMoveInnergridRow();
          _.each(['top', 'bottom'], function(pos){
            tile_to_drop.append(
              $($.mosaic.document.createElement("div"))
              .addClass("mosaic-divider mosaic-divider-" + pos)
              .append(
                  $($.mosaic.document.createElement("div"))
                      .addClass("mosaic-divider-dot")
              )
            );
          });
      };

      // If top
      if (dir === "top") {
        // Add tile before
        drop.before(tile_to_drop);

      // If bottom
      } else if (dir === "bottom") {
        // Add tile after
        drop.after(tile_to_drop);

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
                  .addClass("mosaic-grid-cell col")
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
                  .addClass("mosaic-grid-cell col")
                  .append(next_elms.clone(true).mosaicAddDrag())
                )
              );
            next_elms.remove();
          }

          // Resize current column
          drop.parent()
            .removeClass($.mosaic.layout.widthClasses.join(" "))
            .removeClass($.mosaic.layout.positionClasses.join(" "))
            .addClass("col");

          console.log("Now inside here left right");

          // Create column with dragged tile in it
          if (dir === "left") {
            drop.parent()
              .before($($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-cell col")
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
                .addClass("mosaic-grid-cell col")
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

          // Resize columns
          drop.parent().parent().mosaicSetColumnSizes();

          // Add resize handles
          drop.parent().parent().mosaicSetResizeHandles();
        }
      }
    }

    // Remove original tile
    var original_row = original_tile.parent().parent();
    $(".mosaic-original-tile", $.mosaic.document).remove();

    // Remove remaining empty rows
    $.mosaic.options.panels.find(".mosaic-grid-row:not(:has(.mosaic-tile))").remove();
    $.mosaic.options.panels.find(".mosaic-empty-row").remove();

    // Cleanup original row
    original_row.mosaicCleanupRow();

    // Add empty rows
    $.mosaic.options.panels.mosaicAddEmptyRows();

    var $tile = $(".mosaic-new-tile", $.mosaic.document);
    $tile.removeClass("mosaic-new-tile");

    var tile = new Tile($tile);

    var $content = original_tile.find('.mosaic-tile-content');
    if($content.size() > 0 && $content[0]._preScanHTML){
      /* set the correct, pre-registry html so tiles render correctly */
      tile.cacheHtml($content[0]._preScanHTML);
    }

    // Re-init rich text editor after tile has been moved in DOM
    if(!tile.isRichText()){
      tile.scanRegistry();
    }

    // when a tile with tinymce is dragged, you need to reload the tinymce editor
    // for all tiles edited over it... This is nasty but seems to be needed.
    // If not done, those *other* tiles will not be editable
    $('.mosaic-tile:not(".mosaic-helper-tile") .mosaic-tile-content.mosaic-rich-text').each(function(){
      var atile = new Tile($(this).parent());
      atile.setupWysiwyg();
    });

    tile.blur();

    // Select new tile
    if (new_tile) {
      tile.focus();
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
      var nr_of_columns = $(this).children(".mosaic-grid-cell").length;

      // This will reset the width classes - it will automatically set the widths and positions.

      $(this).children(".mosaic-grid-cell").each(function (i) {

        $(this)
          .removeClass($.mosaic.layout.widthClasses.join(" "))
          .removeClass($.mosaic.layout.positionClasses.join(" "));

        var position = 0;
        var col_size = Math.floor(12 / nr_of_columns);
        var col_size_last = 12 - (col_size * (nr_of_columns - 1));

        console.log("------")
        console.log("position", position)
        console.log("col_size", col_size)
        console.log("col_size_last", col_size_last)
        console.log("nr_of_columns", nr_of_columns)
        console.log("------")

        for (var j = 0; j < nr_of_columns; j++) {
          if (j > 0) {
            position = position + col_size;
          }
          if (j === nr_of_columns - 1) {
            col_size = col_size_last;
          }
          if (i === j) {
            column_sizes.push(col_size);
            // TODO: Clean up the col_size and position variables if we will not need them.
            // TODO: It seems data("col_size") is not needed any more ... commenting out # 2020-04-21
            // $(this).addClass("col-" + col_size + " mosaic-position-" + position).data("col_size", col_size);
            // $(this).addClass("col").data("col_size", col_size);
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
      var nr_of_columns = $(this).children(".mosaic-grid-cell").length;

      if (nr_of_columns > 1 && nr_of_columns <= 12) {

        console.log("nr_of_columns > 1 && nr_of_columns <= 12");

        var column_sizes = [];
        var zero_count = 0;
        var col_sum = 0;

        for (var i = 0; i < nr_of_columns; i++) {
          var col_size = GetColSizeByColClass($($(this).children(".mosaic-grid-cell").get(i)).mosaicGetWidthClass());
          column_sizes.push(col_size);
          col_sum = col_sum + col_size;
          if(col_size === 0) {
            zero_count = zero_count + 1;
          }
        }

        var zero_col = 0;
        if (zero_count) {
          zero_col = (12 - col_sum) / zero_count;
        }

        var resize_col_size = 0;
        var margin_left = 0;
        col_size = 0;

        // $(this).append($($.mosaic.document.createElement("div"))
        //   .addClass("mosaic-grid-bg")
        // );

        for (var i = 0; i < nr_of_columns; i++) {

          col_size = column_sizes[i] ? column_sizes[i] : zero_col;

          resize_col_size = resize_col_size + col_size;
          margin_left = Math.round(resize_col_size / 12 * 10000) / 100;

          console.log("resize_col_size", resize_col_size)

          $(this).append($($.mosaic.document.createElement("div"))
            .addClass(
              "mosaic-resize-handle mosaic-resize-handle-" + (i + 1) + " mosaic-resize-" + resize_col_size
            ).data("resize_handle_index", i).css({marginLeft : margin_left + "%"})
          );

        }

        console.log("$.fn.mosaicSetResizeHandles")
        console.log("column_sizes", column_sizes)
        console.log("zero_count", zero_count)
        console.log("col_size", col_size)

      }

      // Mouse down handler on resize handle
      $(this).children(".mosaic-resize-handle").mousedown(function (/* e */) {

        var $mosaicGridCellChildren = $(this).parent().children(".mosaic-grid-cell");

        // Get number of columns and current sizes
        var nr_of_columns = $mosaicGridCellChildren.length;
        var column_sizes = [];

        if (nr_of_columns > 1 && nr_of_columns <= 12) {
          for (var i = 0; i < nr_of_columns; i++) {
            var col_size = GetColSizeByColClass($($mosaicGridCellChildren.get(i)).mosaicGetWidthClass());
            column_sizes.push(col_size);
          }
        }

        $mosaicGridCellChildren.each(function (index) {

          var mosaicWidthClass = $(this).mosaicGetWidthClass();
          var mosaicDataClass = mosaicWidthClass.replace("col", "mosaic-col");  // data class holds original column widths
          var col_size = GetColSizeByColClass(mosaicWidthClass);  // get the initiall size of the column

          if (col_size == 0) {
            col_size = "0 (2)";
          }

          var mosaic_resize_class = "mosaic-resize-0";
          if (column_sizes.length > 1 && index > 0) {
            var _value = 0;
            for (var i = 0; i < index; i++) {
              _value += column_sizes[i];
            }
            mosaic_resize_class = "mosaic-resize-" + _value;
          }

          // Add placeholder
          $(this).parent().append($($.mosaic.document.createElement("div"))
            .addClass("mosaic-resize-placeholder " + mosaicWidthClass + " " + mosaicDataClass + " " + mosaic_resize_class)  // jshint ignore:line
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-resize-placeholder-inner-border")
              .append($($.mosaic.document.createElement("div"))
                .addClass("info")
                .html(col_size)
              )
            )
          );
        });

        // Get resize handle index
        var resize_handle_index = $(this).mosaicGetResizeHandleClassId();

        // Add helper
        $(this).parent().append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
          .addClass($(this).mosaicGetPositionClass().replace("position", "resize"))
          .data("row_width", $(this).parent().width())
          .data("nr_of_columns", nr_of_columns)
          .data("column_sizes", column_sizes)
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
      tilecontent.html(text);
      var tile = new Tile($(this).parent());
      tile.setupWysiwyg();
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
        $.mosaic.addTile(type, value.find('.temp_body_tag').html(), url);
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
    $.mosaic.addTile(type, value.find('.temp_body_tag').html(), url);
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
        var $tile = $('.mosaic-selected-tile .mosaic-tile-content', $.mosaic.document);
        $tile.html(value.find('.temp_body_tag').html());  // jshint ignore:line
        $tile.attr('data-tileUrl', url.replace(/&/gim, '&amp;'));
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
  $.mosaic.addTile = function (type, value, tileUrl) {
    // Set dragging state
    $.mosaic.options.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

    // Add helper
    $($.mosaic.options.panels.get(0)).append(
      $($.mosaic.document.createElement("div"))
        .addClass("mosaic-grid-row")
        .append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-grid-cell col")
          .append($($.mosaic.document.createElement("div"))
            .addClass("movable removable mosaic-tile mosaic-" + type + "-tile")
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-tile-content").attr('data-tileUrl', tileUrl && tileUrl.replace(/&/gim, '&amp;'))
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

    var tile = new Tile(helper);
    tile.initialize();
    tile.cacheHtml();
    tile.scanRegistry();
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
          try {
              return editor.getContent();
          } catch (e) {
              return '<div class="discreet">Placeholder for field:<br/><b>' + tile_config.label + '</b></div>';
          }
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
   * Get the content of the page which can be saved
   *
   * @id jQuery.mosaic.getPageContent
   * @return {String} Full content of the page
   */
  $.mosaic.getPageContent = function (exportLayout) {
    var getLayoutRow = function(obj){
      var body = "";

      // Check if not an empty row
      if ($(obj).hasClass("mosaic-empty-row") === false &&
        $(obj).find('.mosaic-tile').length >= 0) {

        // Add row open tag
        classNames = $(obj).attr("class");
        body += '      <div class="' + classNames + '">\n';

        // Loop through rows
        $(obj).children(".mosaic-grid-cell").each(function () {

          // // Add column size
          // var mosaicPositionClass = $(this).mosaicGetPositionClass();
          //
          // for (var i = 0; i < 12; i++) {
          //   if (mosaicPositionClass === "mosaic-position-" + i) {
          //     position = i + 1;
          //     break;
          //   }
          // }
          //
          // // Add column size
          // var mosaicWidthClass = $(this).mosaicGetWidthClass();
          //
          // for (var j = 0; j < 12; j++) {
          //   if (mosaicWidthClass === "col-" + (j + 1)) {
          //     size = j + 1;
          //     break;
          //   }
          // }

          // Add cell start tag
          body += '        <div class="' + $(this).attr("class") + '">\n';  // jshint ignore:line

          $(this).children().each(function () {
            if ($(this).hasClass("mosaic-tile")){
              var tile = new Tile(this);
              body += tile.getHtmlBody(exportLayout);
            } else if ($(this).hasClass("mosaic-innergrid-row")){
              body += getLayoutRow(this);
            }
          });

          // Add cell end tag
          body += '        </div>\n';

        });

        // Add row close tag
        body += '      </div>\n';
      }
      return body;
    };

    // Content
    var content,
      position = 1,
      size = 12,
      body = "",
      classNames = "";

    // Disable edit html source
    $.mosaic.disableEditHtmlSource();

    // Add body tag
    body += "  <body>\n";

    // Loop through panels
    $("[data-panel]", $.mosaic.document).each(function () {

      // Add open panel tag
      body += '    <div data-panel="' + $(this).data("panel") + '"';
      body += '         data-max-columns="' + $(this).data("max-columns") + '">\n';

      $(this).children().each(function () {
        if ($(this).hasClass("mosaic-grid-row")){
            body += getLayoutRow(this);
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

  $.mosaic.saveTileFormData = function(){
    $("[data-panel]", $.mosaic.document).each(function () {
      $(this).find(".mosaic-tile").each(function () {
        var tile = new Tile(this);
        tile.saveForm();
      });
    });
  };

  $.mosaic.saveLayoutToForm = function(){
    $.mosaic.saveTileFormData();

    var $customLayout = $("#form-widgets-ILayoutAware-customContentLayout, " +
                          "[name='form.widgets.ILayoutAware.customContentLayout']");
    if($.mosaic.hasContentLayout){
      $customLayout.val('');
    }else{
      $customLayout.val($.mosaic.getPageContent());
    }
  };

  var AddResetAnchor = function ($tileSideTools, cols) {
    var reset = document.createElement("a");
    var cols_str = (typeof cols === "undefined") ? "" : " (" + cols + ")";
    reset.href = "javascript:";
    reset.textContent = "Reset" + cols_str;
    $(reset).on("click", { el: $tileSideTools }, function (e) {
      e.preventDefault();

      e.data.el.parent().parent()
        .removeClass("col-1 col-2 col-3 col-4 col-5 col-6 col-7 col-8 col-9 col-10 col-11 col-12")
        .addClass("col");

      e.data.el.parent().parent().parent().mosaicSetResizeHandles();

      $(e.target).parent().parent().remove();
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
    var low = 0, high = 100, grid = 12, grid_percent = [];
    var step = 100 / grid;
    var a = low, b = high - 1;  /* fix the last step in the loop: -1 */
    while (a < b) {
      grid_percent.push(Math.round(a += step));
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
   * @id GetPositionClassByColSize
   * @param {Integer} col_size Bootstrap col width id
   * @return {String} Classname of the position class of the given integer
   */
  function GetPositionClassByColSize(col_size) {

    if (col_size) {
      return "mosaic-position-" + col_size;
    }

    // Fallback
    return "mosaic-position-0";
  }

  /**
   * Get the name of the position class of the given integer
   *
   * @id GetPositionClassByColSize
   * @param {String} Classname of the position class
   * @return {Integer} col_size Bootstrap col width id
   */
  function GetColSizeByColClass(col_class, prefix) {

    prefix = prefix || "col-";

    for (var i = 0; i < 12; i++) {
      if (col_class === prefix + (i + 1)) {
        return i + 1;
      }
    }

    // Fallback
    return 0;
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

    for (var i = 0; i < grid_percent.length; i++) {
      if (width === grid_percent[i]) {
        return (i + 1);
      }
    }

    // Fallback
    return 12;
  }

  return {
    Tile: Tile
  };
});
