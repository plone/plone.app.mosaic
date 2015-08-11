/**
 * This plugin is used to upload files and images.
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
"use strict";

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

    /**
     * Initialize the upload module
     *
     * @id jQuery.mosaic.initUpload
     */
    $.mosaic.initUpload = function () {

        // Bind dragover
        $(".mosaic-panel", $.mosaic.document).bind("dragover", function (e) {

            // Check if drag not already loaded
            if ($(".mosaic-panel-dragging", $.mosaic.document).length === 0) {

                // Deselect tiles
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Add dummy tile
                $.mosaic.addTile('image', '<img src="++resource++plone.app.' +
                    'mosaic.images/files.png" border="0" />');
            }
        });

        document.addEventListener(
            "drop",
            function (event) {
                // Local variables
                var dt, first, i, files, newtile, file, img, tile, xhr,
                    boundary, data;

                dt = event.dataTransfer;
                files = dt.files;

                // Prevent default actions
                event.stopPropagation();
                event.preventDefault();

                // Drop tile
                $($.mosaic.document).trigger("mousedown");

                // Check filetypes
                first = true;
                for (i = 0; i < files.length; i += 1) {

                    // Get file
                    file = files.item(i);

                    // Check if supported mimetype
                    if (file.mediaType.indexOf('image') === 0) {

                        // Check if first
                        if (first) {

                            // Set image and tile
                            img = $(".mosaic-selected-tile", $.mosaic.document)
                                .children(".mosaic-tile-content")
                                .children("img");
                            tile = $(".mosaic-selected-tile",
                                     $.mosaic.document);

                            // Set first to false
                            first = false;

                        // Not the first
                        } else {

                            // Create new tile
                            newtile = $($.mosaic.document.createElement("div"))
                                .addClass("movable removable mosaic-tile " +
                                          "mosaic-image-tile")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-tile-content")
                                    .append(
                                        $($.mosaic.document.createElement("img"))
                                            .attr("border", 0)
                                    )
                                );

                            // Insert new tile
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .after(newtile);
                            newtile.mosaicInitTile();
                            newtile.mosaicAddDrag();

                            // Get image object
                            img = newtile.children(".mosaic-tile-content")
                                .children("img");
                            tile = newtile;
                        }

                        // Setup progress div
                        tile.append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-uploadprogress")
                        );

                        // Set image values
                        img.get(0).src = file.getAsDataURL();

                        // Create new ajax request
                        xhr = new XMLHttpRequest();

                        // Set progress handler
                        xhr.upload.log = img;
                        /*
                        xhr.upload.addEventListener("progress",
                            function (event) {
                            if (event.lengthComputable) {
                                var percentage = Math.round((event.loaded *
                                    100) / event.total);
                                if (percentage < 100) {
                                    // console.log(percentage);
                                }
                            }
                        }
                        , false);
                        */

                        // Added load handler
                        xhr.addEventListener("load", function (event) {

                            // Get response
                            var response = eval('(' +
                                event.target.responseText + ')');

                            // Check if error
                            if (response.status === 1) {

                                // Raise error
                                $.plone.notify({
                                    type: "error",
                                    title: "Error",
                                    message: response.message,
                                    sticky: true
                                });

                            // No error
                            } else {

                                // Set url and alt and fadein
                                $(event.target.upload.log).attr({
                                    'src': response.url,
                                    'alt': response.title
                                })
                                .parents(".mosaic-tile")
                                    .children(".mosaic-tile-uploadprogress")
                                    .fadeOut("slow", function () {
                                        $(this).remove();
                                    });
                            }
                        }, false);

                        // Set error handler
                        xhr.upload.addEventListener("error", function (error) {
                            $.plone.notify({
                                type: "error",
                                title: "Error",
                                message: "Error uploading file: " + error,
                                sticky: true
                            });
                        }, false);

                        // Set boundary
                        boundary = "AJAX---------------------------AJAX";

                        // Open xhr and set content type
                        xhr.open("POST", $.mosaic.options.url + "/@@mosaic-upload",
                            true);
                        xhr.setRequestHeader('Content-Type',
                            'multipart/form-data; boundary=' + boundary);

                        // Add start boundary
                        data = "--" + boundary + "\r\n";

                        // Add file
                        data += 'Content-Disposition: form-data; ';
                        data += 'name="uploadfile"; ';
                        data += 'filename="' + file.fileName + '"' + "\r\n";
                        data += "Content-Type: " + file.mediaType;
                        data += "\r\n\r\n";
                        data += file.getAsBinary() + "\r\n";

                        // Add end boundary
                        data += "--" + boundary + "--" + "\r\n";

                        // Sent data
                        xhr.sendAsBinary(data);
                    } else {

                        // Notify unsupported
                        $.plone.notify({
                            type: "warning",
                            title: "Warning",
                            message: "The filetype of file " + file.fileName +
                                " is unsupported",
                            sticky: true
                        });
                    }
                }

                // Remove tile if no supported filetypes
                if (first) {
                    $(".mosaic-button.remove").mosaicExecAction();
                }
            },
            false
        );
    };
});
