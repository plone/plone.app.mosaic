/**
 * This plugin is used to display an overlay
 *
 * @author Rob Gietema
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
 * @version 0.1
 */

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

define([
    'jquery'
], function($) {
    'use strict';

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the overlay namespace
    $.mosaic.overlay = {
    };

    /**
     * Create a new instance of a mosaic overlay.
     *
     * @constructor
     * @id jQuery.fn.mosaicOverlay
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicOverlay = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get current object
            var obj = $(this);

            // Init overlay
            obj
                .hide()
                .css({
                    'position': 'fixed',
                    'width': '900px',
                    'left': (($(window.parent).width() - 900) / 2)
                })
                .addClass("mosaic-overlay");

            // Add lightbox
            $(document.body, $.mosaic.document)
                .prepend($(document.createElement("div"))
                    .addClass("mosaic-overlay-blocker")
            );
        });
    };

    /**
     * Open the overlay
     *
     * @id jQuery.mosaic.overlay.open
     * @param {String} mode Mode of the overlay
     * @param {Object} tile_config Configuration of the tile
     */
    $.mosaic.overlay.open = function (mode, tile_config) {

        // Local variables
        var form, formtabs, tile_group, x, visible_tabs, offset_top,
            field_tile, field, fieldset;

        // Expand the overlay
        $('.mosaic-overlay').show();
        $('.mosaic-overlay-blocker').show();

        // Get form
        form = $(".mosaic-overlay").find("form");

        // Clear actions
        if ($(".mosaic-overlay-ok-button").length === 0) {
            $(".mosaic-overlay .formControls").children("input").hide();
            $(".mosaic-overlay .formControls").append(
                $(document.createElement("input")).attr({
                    'type': 'button',
                    'value': 'Close'
                })
                .addClass('button-field context mosaic-overlay-ok-button')
                .click(function () {
                    $.mosaic.overlay.close();
                })
            );
            $(".mosaic-overlay").prepend(
                $(document.createElement("button")).attr({
                    'title': 'Close',
                })
                .addClass('mosaic-overlay-close')
                .html('&times;')
                .click(function () {
                    $.mosaic.overlay.close();
                })
            );
        }

        if (mode === 'all') {

            // Get form tabs
            formtabs = form.find("nav");

            // Show form tabs
            formtabs.removeClass('mosaic-hidden');

            // Show all fields
            form.find("fieldset").children().removeClass('mosaic-hidden');

            // Hide all fieldsets
            form.find('fieldset').removeClass('active');

            // Deselect all tabs
            formtabs.find('a').removeClass('active');

            // Hide layout field
            form.find('#formfield-form-widgets-ILayoutAware-content')
                .addClass('mosaic-hidden');
            //form.find('#formfield-form-widgets-ILayoutAware-pageSiteLayout')
            //    .addClass('mosaic-hidden');
            //form.find('#formfield-form-widgets-ILayoutAware-sectionSiteLayout')
            //    .addClass('mosaic-hidden');

            // Hide title and description
            form.find('#formfield-form-widgets-IDublinCore-title')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-IDublinCore-description')
                .addClass('mosaic-hidden');

            // Hide field which are on the wysiwyg area
            for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                if ($.mosaic.options.tiles[x].name === 'fields') {
                    tile_group = $.mosaic.options.tiles[x];
                }
            }
            for (x = 0; x < tile_group.tiles.length; x += 1) {
                field_tile = tile_group.tiles[x];
                if ($.mosaic.options.panels
                    .find(".mosaic-" + field_tile.name + "-tile")
                        .length !== 0) {
                    $($.mosaic.document.getElementById(field_tile.id))
                        .addClass('mosaic-hidden');
                }
            }

            // Hide tab if fieldset has no visible items
            form.find("fieldset").each(function () {
                if ($(this).children("div:not(.mosaic-hidden)").length === 0) {
                    $('a[href=#fieldsetlegend-' +
                        $(this).attr('id').split('-')[1] + ']')
                        .addClass('mosaic-hidden');
                }
            });

            // Get visible tabs
            visible_tabs = formtabs.children(':not(.mosaic-hidden)');

            // Select first tab
            visible_tabs.eq(0).addClass('active');
            form.find('#fieldset-' +
                visible_tabs.eq(0).attr('href').split('-')[1])
                .addClass('active');

        } else if (mode === 'field') {

            // Get fieldset and field
            field = $("#" + tile_config.id);
            fieldset = field.parents("fieldset");

            // Hide all fieldsets
            form.find('fieldset').hide();

            // Show current fieldset
            fieldset.show();

            // Hide all fields in current fieldset
            fieldset.children().addClass('mosaic-hidden');

            // Show current field
            field.removeClass('mosaic-hidden');

            // Hide form tabs
            form.find("nav").addClass('mosaic-hidden');
        }
    };

    /**
     * Close the overlay
     *
     * @id jQuery.mosaic.overlay.close
     */
    $.mosaic.overlay.close = function () {

        // Hide overlay
        $('.mosaic-overlay').hide();
        $('.mosaic-overlay-blocker').hide();
    };
});