/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define([
  'jquery',
  'pat-logger',
  'underscore',
  'mockup-utils',
  'pat-registry',
  'mockup-patterns-tinymce',
  'tinymce',
  'mockup-patterns-modal'
], function($, logger, _, utils, Registry, TinyMCE, tinymce, Modal) {
  'use strict';

  // so we don't get spammed with missing tile warnings
  var _missing_tile_configs = [];

  var log = logger.getLogger('pat-mosaic');

  var _positionTimeout = 0;
  var positionActiveTinyMCE = function(){
    clearTimeout(_positionTimeout);
    _positionTimeout = setTimeout(_positionActiveTinyMCE, 50);
  };

  var _positionActiveTinyMCE = function(){
    /* XXX warning, this needs to be split into a filter call for some reason.
       one selector bombs out */
    var $toolbar = $('.mosaic-rich-text-toolbar').filter(':visible');
    if($toolbar.size() === 0 || $toolbar.find('.mce-first').size() === 0){
      /* make sure it actually has a toolbar */
      return;
    }

    var $tile = $toolbar.parent();
    // detect if tile is more on the right side of the screen
    // than the left, if it is, align it right
    $toolbar.removeClass('right');
    if($tile.offset().left >= ($(window).width() / 2)){
      $toolbar.addClass('right');
    }

    // calculate if toolbar has been scrolled out of view.
    // we calculate the top divider since when we move to
    // make the tiny toolbar sticky, it'll get shifted
    var $window = $(window);

    if(($tile.offset().top - $toolbar.height()) < $window.scrollTop()){
      // just checking if we reached the top of the tile + size of toolbar
      if(!$toolbar.hasClass('sticky')){
        $('body').addClass('mce-sticky');
        // only need to calculate once and then leave alone
        $toolbar.addClass('sticky');
        // right under mosaic toolbar
        var attrs = {
          top: $('.mosaic-toolbar').height() + $toolbar.height()
        };
        if($toolbar.hasClass('right')){
          attrs.right = $toolbar.offset().right;
        }else{
          attrs.left = $toolbar.offset().left;
        }
        $toolbar.css(attrs);
      }
    }else{
      $toolbar.removeClass('sticky');
      $toolbar.removeAttr('style');
      $('body').removeClass('mce-sticky');
    }
  };

  $(window).off('scroll', positionActiveTinyMCE).on('scroll', positionActiveTinyMCE);

  /* Tile class */
  var Tile = function(el) {
    var self = this;

    self.$el = $(el);
    self.tinymce = null;
    self.focusCheckCount = 0;

    // Ensure that $el is the element with .mosaic-tile
    if (!self.$el.is('.mosaic-tile')) {
      self.$el = self.$el.parents('.mosaic-tile');
    }

    // Auto-save textapp tiles
    self.getContentEl().off('blur').on('blur', function() {
      var tileConfig, editUrl, currentData;

      tileConfig = self.getConfig();

      if (tileConfig && tileConfig.tile_type === 'textapp') {

        editUrl = self.getEditUrl();
        if (editUrl) {
          currentData = self.getHtmlContent();

          // Skip saving dirty data
          if (currentData === self.$el.data('lastSavedData')) {
            return;
          }

          // Prevent concurrent saving to avoid conflict errors
          if (self.$el.data('activeSave')) {
            return;
          }

          self.$el.data('activeSave', true);
          var data = {
            _authenticator: utils.getAuthenticator(),
            'buttons.save': 'Save'
          };
          data[tileConfig.name + '.content'] = currentData;
          // Silently save (assume drafting enabled)
          $.mosaic.queue(function(next){
            $.ajax({
              url: editUrl,
              method: 'POST',
              data: data
            }).always(function() {
              self.$el.data('lastSavedData', currentData);
              self.$el.data('activeSave', false);
              next();
            });
          });
        }
      }
    });
  };

  Tile.prototype.getDataTileEl = function() {
    if (this.$el.is('[data-tile]')) {
      return this.$el;
    } else {
      return this.$el.find('[data-tile]');
    }
  };

  Tile.prototype.getContentEl = function() {
    return this.$el.children('.mosaic-tile-content');
  };

  Tile.prototype.getHtmlContent = function() {
    return this.getContentEl().html();
  };

  Tile.prototype.getEditUrl = function() {
    var url;

    url = this.getUrl();
    if (!url) {
      return;
    }

    url = url.replace(/@@/, '@@edit-tile/');
    if (!url) {
      return;
    }

    // Absolute Url
    if (url.match(/^\.\/.*/)) {
      url = $.mosaic.options.context_url + url.replace(/^\./, '');
    }

    return url;
  };

  Tile.prototype.getDeleteUrl = function(){
    var url;

    url = this.getUrl();
    if (!url) {
      return;
    }

    url = url.replace(/@@/, '@@delete-tile/');
    if (!url) {
      return;
    }

    // Absolute Url
    if (url.match(/^\.\/.*/)) {
      url = $.mosaic.options.context_url + url.replace(/^\./, '');
    }

    return url;
  };

  Tile.prototype.getUrl = function() {
    var url;

    url = this.$el.find('.tileUrl').html();
    if (!url) {
      url = this.$el.find('[data-tileurl]').attr('data-tileurl');
    }
    if (!url) {
      url = this.$el.find('[data-tile]').attr('data-tile');
    }
    if (!url) {
      url = this.$el.attr('data-tile');
    }

    if (url) {
      // Normalize
      url = url.replace($.mosaic.options.context_url, './');
      url = url.replace(/^\.\/\//, './');

      // Support or clear shared content layout tile data lookup
      if ($.mosaic.hasContentLayout) {
        if (url.indexOf('X-Tile-Persistent') === -1){
          if (url.indexOf('?') === -1) {
            url += '?';
          } else {
            url += '&';
          }
          url += 'X-Tile-Persistent=yes';
        }
      } else {
        url = url.replace(/(\?|&)(X-Tile-Persistent=yes)/, '');
      }
      
      // Remove _layouteditor from url
      url = url.replace(/(\?|&)(_layouteditor=true)/, '');  // always last
      
      // Remote trailing ? or & from url
      url = url.replace(/(\?|&)$/, '');
    }
    return url;
  };

  Tile.prototype.getType = function(){
    var $el, classNames, url, match, type;
    $el = this.$el;

    // a) tileType as defined in mosaic-registered.tile.name-tile -class
    classNames = $el.attr('class');
    if (classNames) {
      $(classNames.split(' ')).each(function () {
        var className = this.match(/^mosaic-([\w.\-]+)-tile$/);
        if (className !== null) {
          if ((className[1] !== 'selected') &&
              (className[1] !== 'new') &&
              (className[1] !== 'read-only') &&
              (className[1] !== 'helper') &&
              (className[1] !== 'original') &&
              (className[1] !== 'edited')) {
            type = className[1];
          }
        }
      });
    }

    // b) tileType is tile view name
    if (!type) {
      url = $el.attr('data-tile');
      if (url) {
        match = url.match(/@@([^/]+)/);
        if (match && match.length > 0) {
          type = match[1];
        }
      }
    }

    if (!type) {
      debugger
      log.error('Could not find tile type on element with class: ' + classNames);
    }

    return type;
  };

  Tile.prototype.deprecatedHTMLTiles = [
    'table',
    'numbers',
    'bullets',
    'text',
    'subheading',
    'heading'
  ];

  Tile.prototype.getConfig = function(){
    var tile_config;
    var tiletype = this.getType();
    // Get tile config
    for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
      var found = false;
      var tile_group = $.mosaic.options.tiles[x];
      for (var y = 0; y < tile_group.tiles.length; y += 1) {
        // Set settings value
        if (tile_group.tiles[y].tile_type === 'field') {
          var widget = tile_group.tiles[y].widget.split('.');
          widget = widget[widget.length - 1];
          switch(widget) {
          case "TextWidget":
          case "TextFieldWidget":
          case "TextAreaWidget":
          case "TextAreaFieldWidget":
          case "TextLinesWidget":
          case "TextLinesFieldWidget":
          case "WysiwygWidget":
          case "WysiwygFieldWidget":
          case "RichTextWidget":
          case "RichTextFieldWidget":
            tile_group.tiles[y].settings = false;
            break;
          default:
            tile_group.tiles[y].settings = true;
          }
        }
        if (tile_group.tiles[y].name === tiletype) {
          tile_config = tile_group.tiles[y];
          found = true;
          break;
        }
      }
      if(found){
        break;
      }
    }

    if(!tile_config){
      // dive out of here, something went wrong finding tile config
      if(_missing_tile_configs.indexOf(tiletype) === -1){
        log.error('Could not load tile config for tile type: ' + tiletype +
                  ' falling back to b/w compatible tile type.');
        _missing_tile_configs.push(tiletype);
      }
      tile_config = {
        tile_type: 'app',
        name: tiletype,
        label: 'Unknown',
        read_only: true,
        favorite: false,
        settings: false,
        weight: 0,
        rich_text: false
      };
      if(this.deprecatedHTMLTiles.indexOf(tiletype) !== -1){
        // deprecated html tile type, provide b/w compat config
        tile_config.category = 'structure';
        tile_config.read_only = false;
        tile_config.label = tiletype;
        tile_config.tile_type = 'text';
        tile_config.rich_text = true;
      }
    }
    return tile_config;
  };

  Tile.prototype.getHtmlBody = function(exportLayout){
    var body = '';
    // Get tile type
    var tiletype = '',
        classes = this.$el.attr('class').split(" ");

    tiletype = this.getType();
    classes = $(classes).filter(function() {
      switch (this) {
        case "mosaic-new-tile":
        case "mosaic-helper-tile":
        case "mosaic-original-tile":
        case "mosaic-selected-tile":
        case "mosaic-edited-tile":
          return false;
        default:
          return true;
      }
    }).toArray();

    // Get tile config
    var tile_config = this.getConfig();
    var editor;

    // Predefine vars
    switch (tile_config.tile_type) {
      case "text":
        editor = tinymce.get(this.getContentEl().attr('id'));
        body += '          <div class="' + classes.join(' ') + '">\n';
        body += '          <div class="mosaic-tile-content">\n';
        body += (editor ? editor.getContent() : this.getContentEl().html()).replace(/^\s+|\s+$/g, '') + "\n";
        body += '          </div>\n';
        body += '          </div>\n';
        break;
      case "app":
      case "textapp":
        var url = this.getUrl();
        if(exportLayout){
          // we want to provide default value here for exporting this layout
          editor = tinymce.get(this.getContentEl().attr('id'));
          var data = (editor ? editor.getContent() : this.getContentEl().html()).replace(/^\s+|\s+$/g, '') + "\n";
          // convert to url valid value
          if(url.indexOf('?') === -1){
            url += '?';
          }else{
            url += '&';
          }
          url += 'content=' + encodeURI(data);
        }
        body += '          <div class="' + classes.join(' ') + '">\n';
        body += '          <div class="mosaic-tile-content">\n';
        body += '          <div data-tile="' + url + '"></div>\n';
        body += '          </div>\n';
        body += '          </div>\n';
        break;
      case "field":
        body += '          <div class="' + classes.join(' ') + '">\n';
        body += '          <div class="mosaic-tile-content">\n';

        // Calc url
        var tile_url = './@@plone.app.standardtiles.field?field=' + tiletype;

        // ability to provide a few additional settings for field tiles
        // can be useful in formatting field tiles in python
        // subfield is meant for relation fields
        var subfield = this.getValueFromClasses(classes, 'mosaic-subfield-');
        if(subfield){
          tile_url += '&subfield=' + subfield;
        }
        var format = this.getValueFromClasses(classes, 'mosaic-format-');
        if(format){
          tile_url += '&format=' + format;
        }

        body += '          <div data-tile="' + tile_url + '"></div>\n';
        body += '          </div>\n';
        body += '          </div>\n';

        // Update field values if type is rich text
        this.saveForm();
        break;
      }
      return body;
    };

    Tile.prototype.isRichText = function(tileConfig) {
      if (tileConfig === undefined) {
        tileConfig = this.getConfig();
      }
      if (tileConfig && this.$el.hasClass('mosaic-read-only-tile') === false &&
          ((tileConfig.tile_type === 'text' && tileConfig.rich_text) ||
           (tileConfig.tile_type === 'textapp' && tileConfig.rich_text) ||
           (tileConfig.tile_type === 'app' && tileConfig.rich_text) ||
           (tileConfig.tile_type === 'field' && tileConfig.read_only === false &&
            (tileConfig.widget === 'z3c.form.browser.text.TextWidget' ||
             tileConfig.widget === 'z3c.form.browser.text.TextFieldWidget' ||
             tileConfig.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
             tileConfig.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
             tileConfig.widget === 'z3c.form.browser.textlines.TextLinesWidget' ||
             tileConfig.widget === 'z3c.form.browser.textlines.TextLinesFieldWidget' ||
             tileConfig.widget === 'plone.app.z3cform.widget.RichTextFieldWidget' ||
             tileConfig.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
             tileConfig.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget' ||
             tileConfig.widget === 'plone.app.widgets.dx.RichTextWidget')))) {
        return true;
      }
    };

    Tile.prototype.initialize = function(){
      var self, tileConfig;
      self = this;

      tileConfig = self.getConfig();

      // Check and set read only
      if (tileConfig && tileConfig.read_only) {
        self.$el.addClass('mosaic-read-only-tile');
      }

      // Init rich text
      if (self.isRichText()) {
        self.setupWysiwyg();
      }

      // Add border
      self.$el.prepend(
        $($.mosaic.document.createElement("div"))
          .addClass("mosaic-tile-outer-border")
          .append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-tile-inner-border")));

      // Add label
      if (tileConfig) {
        self.$el.prepend(
          $($.mosaic.document.createElement("div"))
              .addClass("mosaic-tile-control mosaic-tile-label")
              .append($($.mosaic.document.createElement("div"))
                      .addClass("mosaic-tile-label-content")
                      .html(tileConfig.label))
              .append($($.mosaic.document.createElement("div"))
                      .addClass("mosaic-tile-label-left")));
      }

      // Add content container
      if (self.getContentEl().length === 0) {
        self.$el.append($($.mosaic.document.createElement("div"))
                           .attr('class', self.$el.attr('class'))
                           .removeClass('mosaic-tile')
                           .removeClass('mosaic-tile-loading')
                           .addClass("mosaic-tile-content"));
      }

      // Init interaction
      self.makeMovable();
      self.initializeButtons();

      // Init layout dividers when tile is inside mosaic-grid-cell
      if (self.$el.parents('.mosaic-grid-cell').length > 0) {
        _.each(['top', 'bottom', 'right', 'left'], function(pos) {
          self.$el.prepend(
            $($.mosaic.document.createElement("div"))
              .addClass("mosaic-divider mosaic-divider-" + pos)
              .append($($.mosaic.document.createElement("div"))
                .addClass("mosaic-divider-dot")));
        });
      }
    };

    Tile.prototype.initializeButtons = function(){
      var buttons = [];
      var tileConfig = this.getConfig();

      // reinitialize buttons every time
      this.$el.find('.mosaic-tile-buttons').remove();

      var _addButton = function(label, name, click){
        var btn = document.createElement("button");
        btn.className = "mosaic-btn-" + name;
        btn.textContent = label;
        buttons.push(btn);
        $(btn).on('click', click);
        return btn;
      };

      // Add settings icon
      if (tileConfig && tileConfig.settings &&
            this.$el.hasClass('mosaic-read-only-tile') === false) {
        _addButton('Edit', 'settings', this.settingsClicked.bind(this));
      }

      if(!$.mosaic.hasContentLayout && this.$el.hasClass('removable')){
        _addButton('Delete', 'delete', this.deleteClicked.bind(this));
        var confirmBtn = _addButton('Confirm delete', 'confirm', this.confirmClicked.bind(this));
        $(confirmBtn).hide();
        var btn = _addButton('Cancel', 'cancel', this.cancelClicked.bind(this));
        $(btn).hide();
      }

      if(buttons.length > 0){
        var $btns = $($.mosaic.document.createElement("div"))
                 .addClass("mosaic-tile-control mosaic-tile-buttons");
        this.$el.prepend($btns);
        buttons.forEach(function($btn){
          $btns.append($btn);
        });
      }
    };

    Tile.prototype.cancelClicked = function(e){
      e.preventDefault();
      $('.mosaic-btn-settings,.mosaic-btn-delete', this.$el).show();
      $('.mosaic-btn-cancel,.mosaic-btn-confirm', this.$el).hide();
    };

    Tile.prototype.deleteClicked = function(e){
      e.preventDefault();
      $('.mosaic-btn-settings,.mosaic-btn-delete', this.$el).hide();
      $('.mosaic-btn-cancel,.mosaic-btn-confirm', this.$el).show();
    };

    Tile.prototype.confirmClicked = function(e){
      e.preventDefault();

      var self = this;
      var tileConfig = this.getConfig();

      // Check if app tile
      if (tileConfig.tile_type === 'app' ||
          tileConfig.tile_type === 'textapp') {

        // Get url
        var url = this.getUrl();

        if(url && url !== 'undefined'){
          // Remove tags
          $.mosaic.removeHeadTags(url);

          // Ajax call to remove tile
          $.mosaic.queue(function(next){
            $.ajax({
              type: "POST",
              url: self.getDeleteUrl(),
              data: {
                'buttons.delete': 'Delete',
                '_authenticator': utils.getAuthenticator()
              }
            }).always(function(){
              next();
            });
          });
        }
      }

      // Remove empty rows
      $.mosaic.options.panels.find(".mosaic-empty-row").remove();

      // Get original row
      var $originalRow = this.$el.parent().parent();

      // Save tile value
      this.saveForm();

      // Remove current tile
      this.$el.remove();

      // Cleanup original row
      $originalRow.mosaicCleanupRow();

      // Add empty rows
      $.mosaic.options.panels.mosaicAddEmptyRows();

      // Set toolbar
      $.mosaic.options.toolbar.trigger("selectedtilechange");
      $.mosaic.options.toolbar.mosaicSetResizeHandleLocation();
    };

    Tile.prototype.settingsClicked = function(e){
      e.preventDefault();
      var that = this;

      // Get tile config
      var tile_config = that.getConfig();

      // Check if application tile
      if (tile_config.tile_type === 'app') {

        // Get url
        var tile_url = that.getEditUrl();


        // Open overlay
        $.mosaic.overlay.app = new Modal($('.mosaic-toolbar'), {
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
          });
          if($.mosaic.hasContentLayout){
            // not a custom layout, make sure the form knows
            $('form', $.mosaic.overlay.app.$modal).append($('<input type="hidden" name="X-Tile-Persistent" value="yes" />'));
          }
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
            var tileHtml = value.find('.temp_body_tag').html();
            that.fillContent(tileHtml, tileUrl);

            // Close overlay
            $.mosaic.overlay.app.hide();
            $.mosaic.overlay.app = null;
          }
        });
      } else {

        // Edit field
        $.mosaic.overlay.open('field', tile_config);
      }
    };

    Tile.prototype.makeMovable = function(){
      // If the tile is movable
      if (this.$el.hasClass("movable") && $.mosaic.options.canChangeLayout &&
          !$.mosaic.hasContentLayout) {
        // Add drag handle
        this.$el.prepend(
          $($.mosaic.document.createElement("div"))
              .addClass("mosaic-tile-control mosaic-drag-handle")
        );
      }
    };

    Tile.prototype.getValueFromClasses = function(classes, name){
      var value = '';
      classes.forEach(function(className) {
        if (className.indexOf(name) !== -1) {
          value = className.replace(name, '');
        }
      });
      return value;
    };

    Tile.prototype.initializeContent = function() {
      var self, baseUrl, tileUrl, tileConfig, tileHtml, start, end, dataUrl;
      self = this;

      baseUrl = $('body', $.mosaic.document).attr('data-base-url');
      if (!baseUrl) {
        baseUrl = $('head > base', $.mosaic.document).attr('href');
      }

      tileUrl = self.getUrl();
      tileConfig = self.getConfig();

      // Check if a field tile
      if (tileConfig.tile_type === 'field') {
        tileHtml = '';

        // Wrap title and description fields for proper styles
        if (tileConfig.name === 'IDublinCore-title') {
          start = '<h1 class="documentFirstHeading">';
          end = '</h1>';
        } else if (tileConfig.name === 'IDublinCore-description') {
          start = '<p class="documentDescription">';
          end = '</p>';
        } else {
          start = '<div>';
          end = '</div>';
        }

        switch (tileConfig.widget) {
        case "z3c.form.browser.text.TextWidget":
        case "z3c.form.browser.text.TextFieldWidget":
          tileHtml = [start,
                       $("#" + tileConfig.id, $.mosaic.document)
                         .find('input').attr('value'),
                       end].join('');
          break;
        case "z3c.form.browser.textarea.TextAreaWidget":
        case "z3c.form.browser.textarea.TextAreaFieldWidget":
        case "z3c.form.browser.textlines.TextLinesWidget":
        case "z3c.form.browser.textlines.TextLinesFieldWidget":
          tileHtml = [start,
                       $("#" + tileConfig.id, $.mosaic.document)
                        .find('textarea').val().split('\n').join('<br/>'),
                       end].join('');
          break;
        case "plone.app.z3cform.widget.RichTextFieldWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
        case "plone.app.widgets.dx.RichTextWidget":
          tileHtml = $("#" + tileConfig.id, $.mosaic.document)
                        .find('textarea').val();
          break;
        }
        if (tileHtml) {
          this.fillContent(tileHtml);
        }
      }

      // Get data from app tile
      if (!tileHtml && tileConfig) {
        self.$el.addClass('mosaic-tile-loading');
        dataUrl = baseUrl
          ? [baseUrl, tileUrl].join('/').replace(/\/+\.\//g, '/')
          : tileUrl;

        // Append data URL for tile with _layouteditor=true-identifier
        if (dataUrl.indexOf('?') === -1) {
          dataUrl += '?';
        } else {
          dataUrl += '&';
        }
        if (dataUrl.indexOf('_layouteditor') === -1) {
          dataUrl += '_layouteditor=true';
        }

        $.ajax({
          url: dataUrl,
          method: 'POST',
          success: function (value) {
            self.$el.removeClass('mosaic-tile-loading');

            // Parse
            value = $.mosaic.getDomTreeFromHtml(value);

            // Fill document head
            $.mosaic.addHeadTags(tileUrl, value);

            // Fill tile body
            tileHtml = value.find('.temp_body_tag').html();
            self.fillContent(tileHtml, dataUrl);

            // TinyMCE gymnastics
            if(self.getType() === 'plone.app.standardtiles.html') {
              // Init rich editor
              if (!self.$el.data('lastSavedData')) {
                // Save initial state
                self.$el.data('lastSavedData', self.getHtmlContent());
              }

              /* HACK HACK HACK */
              /* self is so first focus actually works with tinymce. */
              /* I hate this... */
              var tries = 0;
              var _check = function() {
                if (tries > 20) {
                  return;
                }
                if (!self.tinymce) {
                  setTimeout(_check, 20);
                  tries += 1;
                  return;
                }
                try {
                  self.tinymce.focus();
                } catch(e) {
                  // Ignore
                }
                self.blur();
              };
              self.setupWysiwyg();
              _check();
            }
          },
          error: function() {
            self.$el.removeClass('mosaic-tile-loading');
            log.error('Error getting data for the tile ' + tileConfig.label +
                      '(' + tileConfig.name + '). Please read documentation ' +
                      'on how to correctly register tiles: https://pypi.python.org/pypi/plone.tiles');
          }
        });
      }
    };

    Tile.prototype.fillContent = function(html, url) {
      var $el;

      $el = this.getContentEl();
      $el.html(html);

      if (url) {
        // Fix & into &amp; and remove all duplicates and orphans
        url = url.replace(/&/gim, '&amp;');
        url = url.replace(/(&amp;)+/, '&amp;');
        url = url.replace(/(&amp;)$/, '');
        // Update URL
        $el.attr('data-tileurl', url);
      }

      this.cacheHtml(html);
      this.scanRegistry();
    };

    /***
     * Cache html on the tile element.
     * This is only used by the scanRegistry method so
     * we can reset the html of the html when running the pattern registry.
     **/
    Tile.prototype.cacheHtml = function(html) {
      var $content;

      // Skip tiles, which cannot contain patterns
      if (this.isRichText()) {
        return;
      }

      $content = this.getContentEl();
      if ($content.length > 0) {
        if (html === undefined) {
          html = $content.html();
        }
        $content[0]._preScanHTML = html;
      }
    };

    /***
     * A bit tricky here because tiles can contain patterns.
     * Pay attention to the use of _preScanHTML.
     * If we do not do this, tiles do not render correctly when
     * adding, dragging and dropping.
     */
    Tile.prototype.scanRegistry = function() {
      var $content;

      // Skip tiles, which cannot contain patterns
      if (this.isRichText()) {
        return;
      }

      $content = this.getContentEl();
      if ($content.length > 0) {

        // Reset html because patterns may have transformed it
        if ($content[0]._preScanHTML) {
          $content.html($content[0]._preScanHTML);
        }
        Registry.scan($content);

        // Disable links within content
        $('a', $content).on('click', function(e){
          e.preventDefault();
          e.stopPropagation();
        });
      }
    };

    Tile.prototype.select = function() {
      var tile;
      if (this.$el.hasClass('mosaic-selected-tile') === false &&
          this.$el.hasClass('mosaic-read-only-tile') === false) {
        // Blur selected
        $('.mosaic-selected-tile', $.mosaic.document).each(function() {
          tile = new Tile(this);
          tile.blur();
        });
        // Select current
        this.focus();
      }
    };

    Tile.prototype._change = function(){
      // Set actions
      if ($.mosaic.options.toolbar !== undefined) {
        $.mosaic.options.toolbar.trigger("selectedtilechange");
      }
      $.mosaic.options.panels.mosaicSetResizeHandleLocation();
      this.saveForm();
    };

    Tile.prototype.blur = function() {
      this.$el.removeClass("mosaic-selected-tile");
      this.getContentEl().blur();
      $('.mce-edit-focus', $.mosaic.document).removeClass('mce-edit-focus');
      this._change();
    };

    Tile.prototype._focus = function(){
      var that = this;
      this.$el.addClass("mosaic-selected-tile");
      this.getContentEl().focus();
      this._change();
      this.initializeButtons();

      var _checkForTinyFocus = function(){
        if(that.focusCheckTimeout){
          clearTimeout(that.focusCheckTimeout);
        }
        that.focusCheckTimeout = setTimeout(function(){
          that.focusCheckCount += 1;
          if(!that.$el.hasClass('mosaic-selected-tile')){
            // no longer selected, dive
            return;
          }
          var $container = that.$el.find('.mosaic-rich-text');
          if(!$container.hasClass('mce-edit-focus')){
            that.$el.removeClass("mosaic-selected-tile").children(".mosaic-tile-content").blur();
            that.getContentEl().blur();
            that.$el.find('.mce-edit-focus').removeClass('mce-edit-focus');
            that._focus();
          }
        }, 50);
      };
      if(that.isRichText() && that.focusCheckCount < 30){
        _checkForTinyFocus();
      }
    };

    Tile.prototype.focus = function(){
      if(this.isRichText() && this.$el.data('tinymce-loaded') !== true){
        this.$el.data('delayed-focus', true);
      }else{
        this._focus();
      }
    };

    Tile.prototype.saveForm = function(){
      var tiletype = this.getType();
      var tile_config = this.getConfig();

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
          var $el = $('.mosaic-panel .mosaic-' + tiletype + '-tile', $.mosaic.document);
          if($el.size() > 1){
            // XXX weird case here.
            // if you use content tile, it'll render a title field tile that matches this
            // and you get weird issues saving data. This is to distinguish this case
            $el = $el.filter(function(){
              return $('.mosaic-tile-control', this).length > 0;
            });
          }
          var val = $el.find('.mosaic-tile-content > *').text();
          $("#" + tile_config.id).find('input').val(val);
          break;
        case "z3c.form.browser.textarea.TextAreaWidget":
        case "z3c.form.browser.textarea.TextAreaFieldWidget":
        case "z3c.form.browser.textlines.TextLinesWidget":
        case "z3c.form.browser.textlines.TextLinesFieldWidget":
          value = "";
          $('.mosaic-panel .mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').each(function () {
            value += $(this).text();
          });
          value = value.replace(/^\s+|\s+$/g, '');
          $("#" + tile_config.id).find('textarea').val(value);
          break;
        case "plone.app.z3cform.widget.RichTextFieldWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
        case "plone.app.widgets.dx.RichTextWidget":
          var $textarea = $(document.getElementById(tile_config.id)).find('textarea');
          editor_id = $textarea.attr('id');
          editor = tinymce.get(editor_id);
          var content = $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content').html();
          $textarea.val(content);
          if (editor) {
            editor.setContent(content);
          }
          break;
        }
      }
    };

    Tile.prototype.setupWysiwyg = function(){
      var that = this;
      var pattern;

      // Get element
      var $content = that.$el.find('.mosaic-tile-content');

      // Remove existing pattern
      try{
        $content.data("pattern-tinymce").destroy();
        $content.removeData("pattern-tinymce");
        that.$el.data('tinymce-loaded', false);
      }catch(e){
          // this can fail...
      }

      // Generate random id to make sure TinyMCE is unique
      var random_id = 1 + Math.floor(100000 * Math.random());
      while ($("#mosaic-rich-text-init-" + random_id,
             $.mosaic.document).length > 0) {
        random_id = 1 + Math.floor(100000 * Math.random());
      }
      var id = 'mosaic-rich-text-init-' + random_id;
      $content.attr('id', id);
      $content.siblings('.mosaic-rich-text-toolbar').remove();
      var $editorContainer = $('<div class="mosaic-rich-text-toolbar"></div>')
        .attr('id', $content.attr('id') + '-panel');
      $content.before($editorContainer);

      // Build toolbar and contextmenu
      var actions, group, x, y,
          toolbar, cmenu;

      // Get tiletype
      var tiletype = that.getType();
      if(this.deprecatedHTMLTiles.indexOf(tiletype) !== -1){
        // these tiles are deprecated but we still need to be able to edit
        // them... Yes this is a bit ugly but I think it is probably the best
        // way right now.
        tiletype = 'plone.app.standardtiles.html';
      }

      // Get actions
      actions = $.mosaic.options.default_available_actions;
      for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
        group = $.mosaic.options.tiles[x];
        for (y = 0; y < group.tiles.length; y += 1) {
          if (group.tiles[y].name === tiletype) {
            actions = actions
              .concat(group.tiles[y].available_actions);
          }
        }
      }

      // Build toolbar
      toolbar = [];
      for (x = 0; x < $.mosaic.options.richtext_toolbar.length; x += 1) {
        group = $.mosaic.options.richtext_toolbar[x];
        for (y = 0; y < group.actions.length; y += 1) {
          if ($.inArray(group.actions[y].name, actions) > -1) {
            toolbar.push(group.actions[y].action);
          }
        }
        if (toolbar.length && toolbar[toolbar.length - 1] != '|') {
          toolbar.push('|');
        }
      }
      if (toolbar.length && toolbar[toolbar.length - 1] == '|') {
        toolbar.pop();
      }

      // Build contextmenu
      cmenu = [];
      for (x = 0; x < $.mosaic.options.richtext_contextmenu.length; x += 1) {
        group = $.mosaic.options.richtext_contextmenu[x];
        for (y = 0; y < group.actions.length; y += 1) {
          if ($.inArray(group.actions[y].name, actions) > -1) {
            cmenu.push(group.actions[y].action);
          }
        }
        if (cmenu.length && cmenu[cmenu.length - 1] != '|') {
          cmenu.push('|');
        }
      }
      if (cmenu.length && cmenu[cmenu.length - 1] == '|') {
        cmenu.pop();
      }

      // Define placeholder updater
      var _placeholder = function() {
        var $inside = $content.find('p > *');
        if (($inside.length === 0 || ($inside.length === 1 && $inside.is('br'))) &&
            $content.text().replace(/^\s+|\s+$/g, '').length === 0) {
          $content.addClass('mosaic-tile-content-empty');
          if($content.find('p').length === 0){
            $content.empty().append('<p></p>');
          }
        } else {
          $content.removeClass('mosaic-tile-content-empty');
        }
      };
      var timeout = 0;
      var placeholder = function(){
        clearTimeout(timeout);
        timeout = setTimeout(_placeholder, 100);
      };

      var paste_as_text = $.mosaic.options.tinymce.tiny.paste_as_text || false;
      if(toolbar.length === 0){
        paste_as_text = true;
      }
      // Init rich editor
      pattern = new TinyMCE($content, $.extend(
        true, {}, $.mosaic.options.tinymce, { inline: false, tiny: {
        body_id: id,
        selector: "#" + id,
        inline: true,
        paste_as_text: paste_as_text,
        fixed_toolbar_container: '#' + $editorContainer.attr('id'),
        theme_advanced_toolbar_align: "right",
        menubar: false,
        toolbar: toolbar.join(' ') || false,
        statusbar: false,
        contextmenu: cmenu.join(' ') || false,
        plugins: $.mosaic.options.tinymce.tiny.plugins.concat(
          cmenu.length ? ['contextmenu'] : []
        ),
        setup: function(editor) {
          that.tinymce = editor;
          editor.on('focus', function(e) {
            if (e.target.id) {
              if($('.mosaic-helper-tile').length === 0){
                that.select();
                positionActiveTinyMCE();
              }else{
                // XXX this is such a hack..
                // SOMETHING is causing tinymce to focus *after* it has been blurred
                // from dragging. It's a weird state where it think it is focused
                // but it's dragging. This fixes it, sort of. Sometimes you can
                // still detect a flicker when the modes are switching
                setTimeout(function(){
                  $('.mce-edit-focus').each(function(){
                    var tile = new Tile($(this).parent());
                    tile.blur();
                    var tiny = window.tinyMCE.get(this.getAttribute('id'));
                    if(tiny){
                      tiny.hide();
                    }
                  });
                }, 10);
              }
            }
          });

          if(toolbar.length === 0){
            editor.on('keydown', function(e){
              if(e.keyCode === 13){
                e.preventDefault();
                return;
              }
            });
          }

          // `change` event doesn't fire all the time so we do both here...
          editor.on('keyup change', placeholder);
          placeholder();

          editor.on('init', function(){
            /*
              since focusing on a rich text tile before tinymce is initialized
              can cause some very weird issues where the toolbar won't show,
              we need to delay focus on rich text tiles
            */
            that.$el.data('tinymce-loaded', true);
            if(that.$el.data('delayed-focus') === true){
              that.$el.data('delayed-focus', false);
              setTimeout(function(){
                that._focus();
              }, 100);
            }
          });
        }
      }}));

      // Set editor class
      $content.addClass('mosaic-rich-text');
    };

    Tile.validTile = function(el) {
      var $el = $(el),
          tile = $el.attr('data-tile');
      if (!tile || tile === 'undefined') {
        // Skip empty tiles or 'undefined' str
        return false;
      }
      if ($el.is('.mosaic-tile') ||
          $el.parents('.mosaic-tile').length > 0) {
        // Accept only mosaic tiles
        return true;
      }
      // Skip by default
      return false;
    };

    return Tile;
});
