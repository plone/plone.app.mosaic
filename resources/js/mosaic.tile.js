/* Mosaic pattern.
 *
 * Options:
 *    data(string): Data to be used to load the pattern.
 *    tiles(object): Array of tile objects.
 *
 * Documentation:
 *   # Example
 *
 *   {{ example-1 }}
 *
 * License:
 *    Copyright (C) 2010 Plone Foundation
 *
 *    This program is free software; you can redistribute it and/or modify it
 *    under the terms of the GNU General Public License as published by the
 *    Free Software Foundation; either version 2 of the License.
 *
 *    This program is distributed in the hope that it will be useful, but
 *    WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 *    Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License along
 *    with this program; if not, write to the Free Software Foundation, Inc.,
 *    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global define:false, confirm:false */

define([
    'jquery',
    'pat-base',
    'mockup-utils',
    'mosaic-url/mosaic.core',
    'mockup-patterns-tinymce',
    'mosaic-url/mosaic.layout',
], function($, Base, utils, Mosaic) {
    'use strict';

    var Tile = Base.extend({
        name: 'mosaictile',
        trigger: '.mosaic-tile',
        parser: 'mockup',
        defaults: {
        },
        init: function() {
            var self = this;
            self.setupKeyboardHandlers();
        },

        setupKeyboardHandlers: function() {
            var self = this;
            
            // Get all action buttons in the tile
            var $actions = self.$el.find('.mosaic-tile-control a');
            
            $actions.each(function() {
                var $this = $(this);
                
                // Add keyboard handler
                $this.on('keydown', function(e) {
                    // Handle Enter or Space key
                    if (e.which === 13 || e.which === 32) {
                        e.preventDefault();
                        e.stopPropagation();
                        $(this).click();
                    }
                });
            });
        }
    });

    Mosaic.initializeTile = function(el) {
        var $el = $(el);
        var tile_url = $el.attr('data-tile');
        var tile_content_url;

        // Check if tile is movable
        if ($el.parents('[data-panel]').attr('data-panel') !== 'content') {
            $el.addClass('movable');
            $el.addClass('removable');
        }

        // Get tile content url
        if (tile_url.indexOf('@@') !== -1) {
            tile_content_url = tile_url.split('@@')[1].split('?')[0];
        } else {
            tile_content_url = tile_url.split('/@@')[1].split('?')[0];
        }

        // Check if tile is text tile
        if (tile_content_url === 'plone.app.standardtiles.rawhtml') {
            $el.addClass('mosaic-read-only-tile');
        } else if (tile_content_url === 'plone.app.standardtiles.html') {
            $el.addClass('mosaic-text-tile');
        }

        // Init rich text tile
        if ($el.hasClass('mosaic-text-tile')) {
            Mosaic.initializeTextTile($el);
        }

        // Init app tile
        if ($el.hasClass('mosaic-app-tile')) {
            Mosaic.initializeAppTile($el);
        }

        // Add controls
        Mosaic.addControls($el);
    };

    Mosaic.initializeTextTile = function($el) {
        // Add class to enable text toolbar
        $el.addClass('mosaic-tile-editable');

        // Get tile content
        var tile_content = $el.children('.mosaic-tile-content').children().first();

        // Add pattern
        tile_content.addClass('pat-tinymce');
        tile_content.attr('data-pat-tinymce', JSON.stringify($.mosaic.options.richtext_config));

        // Check if tiny is already initialized
        if (tile_content.parents('.mosaic-tile').hasClass('mosaic-tile-editing')) {
            return;
        }
    };

    Mosaic.initializeAppTile = function($el) {
        // Nothing here yet
    };

    Mosaic.addControls = function($el) {
        // Check if tile is movable
        if ($el.hasClass('mosaic-tile-loading') || !$el.hasClass('removable')) {
            return;
        }

        // Get tile type
        var tile_url = $el.attr('data-tile');
        var tile_type = '';

        // Check if tile is movable
        if ($el.hasClass('movable')) {
            tile_type = 'movable';
        }

        // Create control bar
        var $controls = $(document.createElement('div'))
            .addClass('mosaic-tile-control');

        // Add drag handle
        if (tile_type === 'movable') {
            var $drag_handle = $(document.createElement('div'))
                .addClass('mosaic-drag-handle');
            $controls.append($drag_handle);
        }

        // Check if tile config available
        var tile_config = $.mosaic.getOptionsFromTileUrl(tile_url);
        if (!tile_config) {
            return;
        }

        // Create buttons wrapper
        var $button_container = $(document.createElement('div'))
            .addClass('mosaic-tile-control-buttons');

        // Create settings button
        var $settings_button = $(document.createElement('button'))
            .addClass('mosaic-tile-settings-button')
            .attr('type', 'button')
            .attr('title', 'Settings')
            .html('<svg class="mosaic-icon mosaic-icon-settings"><use xlink:href="#icon-settings"></use></svg>');
        $button_container.append($settings_button);

        // Add settings handler
        $settings_button.on('click', function(e) {
            e.preventDefault();
            var tiletype = $el.attr('data-tiletype');
            $.mosaic.overlay.open('all', tiletype);
        });

        // Create remove button
        if ($el.hasClass('removable')) {
            var $remove_button = $(document.createElement('button'))
                .addClass('mosaic-tile-remove-button')
                .attr('type', 'button')
                .attr('title', 'Remove')
                .html('<svg class="mosaic-icon mosaic-icon-remove"><use xlink:href="#icon-remove"></use></svg>');
            $button_container.append($remove_button);

            // Add remove handler
            $remove_button.on('click', function(e) {
                e.preventDefault();
                Mosaic.removeFromGrid($el);
            });
        }

        $controls.append($button_container);
        $el.prepend($controls);
    };

    Mosaic.removeFromGrid = function($el) {
        var $grid = $el.parents('.mosaic-grid-row').first();
        
        // Remove tile
        $el.remove();
        
        // Clean up grid
        Mosaic.cleanupRow($grid);
    };

    Mosaic.cleanupRow = function($row) {
        var $cells = $row.children('.mosaic-grid-cell');
        
        // Check if row is empty
        if ($cells.length === 0) {
            $row.remove();
            return;
        }
        
        // Check each cell
        $cells.each(function() {
            var $cell = $(this);
            var $tiles = $cell.children('.mosaic-tile');
            
            // Remove empty cells
            if ($tiles.length === 0) {
                $cell.remove();
            }
        });
        
        // Re-check if row is empty after cell cleanup
        if ($row.children('.mosaic-grid-cell').length === 0) {
            $row.remove();
        }
    };

    // Code for tile controls that need direct DOM manipulation
    Mosaic.setupTileControls = function() {
        // Find all tiles
        var tiles = document.querySelectorAll('.mosaic-tile.removable:not(.mosaic-tile-loading)');
        
        tiles.forEach(function(tile) {
            // Skip if controls already exist
            if (tile.querySelector('.mosaic-tile-control')) {
                return;
            }
            
            var tileUrl = tile.getAttribute('data-tile');
            var tileType = tile.classList.contains('movable') ? 'movable' : '';
            
            // Create control bar
            var controls = document.createElement('div');
            controls.className = 'mosaic-tile-control';
            
            // Add drag handle for movable tiles
            if (tileType === 'movable') {
                var dragHandle = document.createElement('div');
                dragHandle.className = 'mosaic-drag-handle';
                controls.appendChild(dragHandle);
            }
            
            // Check if tile config available
            if (!$.mosaic.getOptionsFromTileUrl(tileUrl)) {
                return;
            }
            
            // Create buttons wrapper
            var buttonContainer = document.createElement('div');
            buttonContainer.className = 'mosaic-tile-control-buttons';
            
            // Create settings button
            var settingsBtn = document.createElement('button');
            settingsBtn.className = 'mosaic-tile-settings-button';
            settingsBtn.setAttribute('type', 'button');
            settingsBtn.setAttribute('title', 'Settings');
            settingsBtn.innerHTML = '<svg class="mosaic-icon mosaic-icon-settings"><use xlink:href="#icon-settings"></use></svg>';
            
            settingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                var tiletype = tile.getAttribute('data-tiletype');
                $.mosaic.overlay.open('all', tiletype);
            });
            
            buttonContainer.appendChild(settingsBtn);
            
            // Create remove button for removable tiles
            if (tile.classList.contains('removable')) {
                var removeBtn = document.createElement('button');
                removeBtn.className = 'mosaic-tile-remove-button';
                removeBtn.setAttribute('type', 'button');
                removeBtn.setAttribute('title', 'Remove');
                removeBtn.innerHTML = '<svg class="mosaic-icon mosaic-icon-remove"><use xlink:href="#icon-remove"></use></svg>';
                
                removeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    Mosaic.removeFromGrid($(tile));
                });
                
                buttonContainer.appendChild(removeBtn);
            }
            
            controls.appendChild(buttonContainer);
            tile.insertBefore(controls, tile.firstChild);
        });
    };

    // Enhanced version with keyboard accessibility
    Mosaic.setupTileControlsAccessible = function() {
        // Find all tiles
        var tiles = document.querySelectorAll('.mosaic-tile.removable:not(.mosaic-tile-loading)');
        
        tiles.forEach(function(tile) {
            // Skip if controls already exist
            if (tile.querySelector('.mosaic-tile-control')) {
                return;
            }
            
            var tileUrl = tile.getAttribute('data-tile');
            var tileType = tile.classList.contains('movable') ? 'movable' : '';
            
            // Create control bar
            var controls = document.createElement('div');
            controls.className = 'mosaic-tile-control';
            
            // Add drag handle for movable tiles
            if (tileType === 'movable') {
                var dragHandle = document.createElement('div');
                dragHandle.className = 'mosaic-drag-handle';
                controls.appendChild(dragHandle);
            }
            
            // Check if tile config available
            if (!$.mosaic.getOptionsFromTileUrl(tileUrl)) {
                return;
            }
            
            // Create buttons wrapper
            var buttonContainer = document.createElement('div');
            buttonContainer.className = 'mosaic-tile-control-buttons';
            
            // Create settings button
            const btn = document.createElement("button");
            btn.setAttribute("tabindex", "0");
            btn.className = 'mosaic-tile-settings-button';
            btn.setAttribute('type', 'button');
            btn.setAttribute('title', 'Settings');
            btn.innerHTML = '<svg class="mosaic-icon mosaic-icon-settings"><use xlink:href="#icon-settings"></use></svg>';
            
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var tiletype = tile.getAttribute('data-tiletype');
                $.mosaic.overlay.open('all', tiletype);
            });
            
            // Add keyboard handler for settings button
            btn.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
            
            buttonContainer.appendChild(btn);
            
            // Create remove button for removable tiles
            if (tile.classList.contains('removable')) {
                var removeBtn = document.createElement('button');
                removeBtn.className = 'mosaic-tile-remove-button';
                removeBtn.setAttribute('type', 'button');
                removeBtn.setAttribute('title', 'Remove');
                removeBtn.setAttribute('tabindex', '0');
                removeBtn.innerHTML = '<svg class="mosaic-icon mosaic-icon-remove"><use xlink:href="#icon-remove"></use></svg>';
                
                removeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    Mosaic.removeFromGrid($(tile));
                });
                
                // Add keyboard handler for remove button
                removeBtn.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeBtn.click();
                    }
                });
                
                buttonContainer.appendChild(removeBtn);
            }
            
            controls.appendChild(buttonContainer);
            tile.insertBefore(controls, tile.firstChild);
        });
    };

    return Tile;
});
