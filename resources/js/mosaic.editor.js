/**
 * This plugin is used to set an element to be editable.
 *
 * @author Rob Gietema
 */

import $ from "jquery";

const tinymce = window.tinymce;

// Define mosaic namespace if it doesn't exist
if (typeof $.mosaic === "undefined") {
    $.mosaic = {};
}

// Define the editor namespace
$.mosaic.editor = {};

/**
 * Exec a command on the editor
 *
 * @id jQuery.mosaic.execCommand
 * @param {String} command Command to execute
 * @param {String} ui UI to use
 * @param {String} value Vale of the command
 */
$.mosaic.execCommand = function (command, ui, value) {
    // Exec command
    if (tinymce.activeEditor) {
        tinymce.activeEditor.execCommand(command, ui, value);
    }
};

/**
 * Apply formatting to the current selection
 *
 * @id jQuery.mosaic.editor.applyFormat
 * @param {String} format Name of the registered format to apply
 */
$.mosaic.editor.applyFormat = function (format) {
    // Apply format
    if (tinymce.activeEditor) {
        tinyMCE.activeEditor.formatter.apply(format);
    }
};

/**
 * Register format
 *
 * @id jQuery.mosaic.editor.registerFormat
 * @param {String} name Name of the registered format to apply
 * @param {Object} format Formatting object
 */
$.mosaic.editor.registerFormat = function (name, format) {
    // Apply format
    if (tinymce.activeEditor) {
        tinymce.activeEditor.formatter.register(name, format);
    }
};
