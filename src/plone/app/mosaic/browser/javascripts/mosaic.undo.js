/**
 * This plugin is used to create the mosaic undo stack, and enable
 * undo/redo actions. The JS defines two classes, one for internal use
 * ($.mosaic.undo.Stack) and the public one $.mosaic.unto.UndoManager. The
 * latter needs to be initialized (form the mosaic core), using:
 *  - stack size (max undo history)
 *  - reference to a handler that is called with the state as argument on undo/redo
 *  - current state (optional)
 *
 * The state can be anyting, but a feasible use is a DOM snippet as
 * state, that can be re-applied to an element on undo/redo.  Check
 * out plone.app.mosaic/plone/app/mosaic/tests/javascipts/test_undo.html
 * for an example wiring.
 *
 * Currently for mosaic the 'public' methods of the module are 'init',
 * 'undo', 'redo', 'hasInitial' and 'snapshot'. The undo manager
 * always needs an intial state (to be able to redo the undo...). A
 * state can be added with the jQuery.mosaic.undo.snapshot
 * method. Always take the snapshot AFTER the change in the DOM.
 *
 * @author D.A.Dokter
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

/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {
    "use strict";

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Declare mosaic.undo namespace
    $.mosaic.undo = function () {};

    /**
     * Initialize undo manager.
     * @id jQuery.mosaic.undo.init
     */
    $.mosaic.undo.init = function () {

        function handler(state) {

            for (var i = 0; i < state.length; i += 1) {
                $("#" + state[i].target, $.mosaic.document)
                    .html(state[i].source);
            }
        }

        $.mosaic.undo.undoManager =  new $.mosaic.undo.UndoManager(10, handler);
    };


    /**
     * Create a snapshot of the current situation, and add it to the
     * undo manager.
     * @id jQuery.mosaic.undo.snapshot
     */
    $.mosaic.undo.snapshot = function () {
        var state = [];
        $(".mosaic-panel", $.mosaic.document).each(function () {
            state.push({"target": $(this).attr("id"),
                        "source": $(this).html()});
        });
        if (typeof($.mosaic.undo.undoManager) === "undefined") {
            $.mosaic.undo.init();
        }

        $.mosaic.undo.undoManager.add(state);
    };


    /**
     *
     */
    $.mosaic.undo.hasInitial = function () {
        if ($.mosaic.undo.undoManager.stack.size() > 0) {
            return true;
        } else {
            return false;
        }
    };


    /**
     * Undo.
     * @id jQuery.mosaic.undo.undo
     */
    $.mosaic.undo.undo = function () {
        $.mosaic.undo.undoManager.undo();
    };


    /**
     * Redo.
     * @id jQuery.mosaic.undo.redo
     */
    $.mosaic.undo.redo = function () {
        $.mosaic.undo.undoManager.redo();
    };


    /**
     * Stack constructor, taking optional size parameter.
     * @id jQuery.mosaic.undo.Stack
     * @param {Integer} stackSize Maximum number of items on the stack.
     */
    $.mosaic.undo.Stack = function (stackSize) {
        if (typeof(stackSize) === "undefined") {
            this.maxsize = 10;
        } else {
            this.maxsize = stackSize;
        }

        this.stack = [];
    };

    /**
     * Return current stack size.
     * @id jQuery.mosaic.undo.Stack.size
     */
    $.mosaic.undo.Stack.prototype.size  = function () {
        return this.stack.length;
    };

    /**
     * FIFO stack push, that removes object at other end if the stack
     * grows bigger than the size set.
     * @id jQuery.mosaic.undo.Stack.add
     * @param {Object} obj Object to push onto the stack.
     */
    $.mosaic.undo.Stack.prototype.add = function (obj) {

        if (this.stack.length >= this.maxsize) {
            this.stack.pop();
        }

        this.stack.unshift(obj);
    };

    /**
     * Get the object at the given index. Note that new states (added
     * through jQuery.mosaic.undo.Stack.add) are added (using shift) at index 0.
     * @id jQuery.mosaic.undo.Stack.get
     */
    $.mosaic.undo.Stack.prototype.get = function (i) {
        return this.stack[i];
    };

    /**
     * Undo manager, handling calls to undo/redo. This implementation
     * uses full DOM snippets.
     * @id jQuery.mosaic.undo.UndoManager
     * @param {Integer} stackSize max undo history
     * @param {Function} handler for undo/redo, taking state as argument
     * @param {Object} currentState Current state
     */
    $.mosaic.undo.UndoManager = function (stackSize, handler, currentState) {

        this.stack = new $.mosaic.undo.Stack(stackSize);
        this.pointer = 0;
        this.handler = handler;
        if (typeof(currentState) !== "undefined") {
            this.stack.add(currentState);
        }
    };

    /**
     * Add state to manager.
     * @id jQuery.mosaic.undo.UndoManager.add
     * @param {Object} state State to add.
     */
    $.mosaic.undo.UndoManager.prototype.add = function (state) {

        this.stack.add(state);
    };

    /**
     * Undo last action, by restoring last state.
     * @id jQuery.mosaic.undo.UndoManager.undo
     */
    $.mosaic.undo.UndoManager.prototype.undo = function  () {

        var state = this.stack.get(this.pointer + 1);

        if (state) {
            this.handler(state);
            this.pointer += 1;
        } else {
          // Alert there's no (more) states.
        }
    };

    /**
     * Redo last action, by calling handler with previous state.
     * @id jQuery.mosaic.undo.UndoManager.redo
     */
    $.mosaic.undo.UndoManager.prototype.redo = function () {

        var state = this.stack.get(this.pointer - 1);

        if (state) {
            this.handler(state);
            this.pointer -= 1;
        } else {
            // Alert there's no (more) states.
        }
    };

}(jQuery));
