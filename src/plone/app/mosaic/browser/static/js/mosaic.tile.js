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
  var Tile = function(el){
    var that = this;
    that.tinymce = null;
    that.$el = $(el);
    if(!that.$el.is('.mosaic-tile')){
      // XXX we need to get the outer-most container of the node here always
      that.$el = that.$el.parents('.mosaic-tile');
    }
    that.focusCheckCount = 0;

    that.$el.children(".mosaic-tile-content").off('blur').on('blur', function(){
      var tile_config = that.getConfig();
      if(tile_config && tile_config.tile_type === 'textapp'){
        var edit_url = that.getEditUrl();
        if(edit_url){
          var currentData = that.getHtmlContent();
          if(currentData === that.$el.data('lastSavedData')){
            // not dirty, do not save
            return;
          }
          // we also need to prevent double saving, conflict errors
          if(that.$el.data('activeSave')){
            return;
          }
          that.$el.data('activeSave', true);
          var data = {
            _authenticator: utils.getAuthenticator(),
            'buttons.save': 'Save'
          };
          data[tile_config.name + '.content'] = currentData;
          // need to save tile
          $.mosaic.queue(function(next){
            $.ajax({
              url: edit_url,
              method: 'POST',
              data: data
            }).always(function(){
              that.$el.data('lastSavedData', currentData);
              that.$el.data('activeSave', false);
              next();
            });
          });
        }
      }
    });
  };

  Tile.prototype.getDataTileEl = function(html, tileUrl){
    return this.$el.find('[data-tile]');
  };

  Tile.prototype.getContentEl = function(html, tileUrl){
    return this.$el.children(".mosaic-tile-content");
  };

  Tile.prototype.getHtmlContent = function(){
    return this.getContentEl().html();
  };

  Tile.prototype.getEditUrl = function(){
    var tile_url = this.getUrl();
    if(!tile_url){
      return;
    }
    tile_url = tile_url.replace(/@@/, '@@edit-tile/');
    if(!tile_url){
      return;
    }
    // Calc absolute edit url
    if (tile_url.match(/^\.\/.*/)) {
      tile_url = $.mosaic.options.context_url + tile_url.replace(/^\./, '');
    }
    return tile_url;
  };

  Tile.prototype.getDeleteUrl = function(){
    var tile_url = this.getUrl();
    // Calc delete url
    var url = tile_url.split('?')[0];
    url = url.split('@@');
    var tile_type_id = url[1].split('/');
    url = url[0] + '@@delete-tile/' + tile_type_id[0] + '/' + tile_type_id[1];
    // Calc absolute delete url
    if (url.match(/^\.\/.*/)) {
      url = $.mosaic.options.context_url + url.replace(/^\./, '');
    }
    return url;
  };

  Tile.prototype.getUrl = function(){
    var tile_url = this.$el.find('.tileUrl').html();
    if(!tile_url){
      var $tileUrlEl = this.$el.find('[data-tileUrl]');
      if($tileUrlEl.size() > 0){
        tile_url = $tileUrlEl.attr('data-tileUrl');
      }
    }
    if (!tile_url) {
      tile_url = this.$el.find('[data-tile]').attr('data-tile');
    }
    if(tile_url){
      tile_url = tile_url.replace($.mosaic.options.context_url, './');
      tile_url = tile_url.replace(/^\.\/\//, './');
      if($.mosaic.hasContentLayout){
        if(tile_url.indexOf('X-Tile-Persistent') === -1){
          if(tile_url.indexOf('?') === -1){
            tile_url += '?';
          }else{
            tile_url += '&';
          }
          tile_url += 'X-Tile-Persistent=yes';
        }
      }else if(tile_url.indexOf('X-Tile-Persistent') !== -1){
        tile_url = tile_url.replace('X-Tile-Persistent=yes', '').replace('&&', '&');
      }
      while(tile_url.indexOf('&_layouteditor=true') !== -1){
        // clean out urls with _layouteditor in them
        tile_url = tile_url.replace('&_layouteditor=true', '');
      }
    }
    return tile_url;
  };

  Tile.prototype.getType = function(){
    // previously $.mosaic.getTileType
    var tiletype = '';
    var $el = this.$el;
    var classNames = $el.attr('class');
    var classes = [];
    if(classNames){
      classes = $el.attr('class').split(" ");
      $(classes).each(function () {
        // Local variables
        var classname;

        classname = this.match(/^mosaic-([\w.\-]+)-tile$/);
        if (classname !== null) {
          if ((classname[1] !== 'selected') &&
              (classname[1] !== 'new') &&
              (classname[1] !== 'read-only') &&
              (classname[1] !== 'helper') &&
              (classname[1] !== 'original') &&
              (classname[1] !== 'edited')) {
            tiletype = classname[1];
          }
        }
      });
    }

    if(!tiletype){
      log.error('Could not find tile type on element with classes: ' + classes.join(', '));
    }

    return tiletype;
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
        editor = tinymce.get(this.$el.children(".mosaic-tile-content").attr('id'));
        body += '          <div class="' + classes.join(' ') + '">\n';
        body += '          <div class="mosaic-tile-content">\n';
        body += (editor ? editor.getContent() : this.$el.children(".mosaic-tile-content").html()).replace(/^\s+|\s+$/g, '') + "\n";
        body += '          </div>\n';
        body += '          </div>\n';
        break;
      case "app":
      case "textapp":
        var url = this.getUrl();
        if(exportLayout){
          // we want to provide default value here for exporting this layout
          editor = tinymce.get(this.$el.children(".mosaic-tile-content").attr('id'));
          var data = (editor ? editor.getContent() : this.$el.children(".mosaic-tile-content").html()).replace(/^\s+|\s+$/g, '') + "\n";
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

    Tile.prototype.isRichText = function(tile_config){
      if(tile_config === undefined){
        tile_config = this.getConfig();
      }
      if (tile_config && this.$el.hasClass('mosaic-read-only-tile') === false &&
          ((tile_config.tile_type === 'text' && tile_config.rich_text) ||
           (tile_config.tile_type === 'textapp' && tile_config.rich_text) ||
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
        return true;
      }else{
        return false;
      }
    };

    Tile.prototype.initialize = function(){
      var tile_config = this.getConfig();

      // Check read only
      if (tile_config && tile_config.read_only) {
        // Set read only
        this.$el.addClass("mosaic-read-only-tile");
      }

      // Init rich text
      if (this.isRichText()) {
        // Init rich editor
        this.setupWysiwyg();
      }

      // Add border divs
      this.$el.prepend(
        $($.mosaic.document.createElement("div"))
          .addClass("mosaic-tile-outer-border")
          .append(
            $($.mosaic.document.createElement("div"))
              .addClass("mosaic-tile-inner-border")
            )
      );

      // Add label
      if (tile_config) {
        this.$el.prepend(
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

      this.makeMovable();
      this.initializeButtons();

      var that = this;
      _.each(['top', 'bottom', 'right', 'left'], function(pos){
        that.$el.prepend(
            $($.mosaic.document.createElement("div"))
            .addClass("mosaic-divider mosaic-divider-" + pos)
            .append(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider-dot")
            )
        );
      });
    };

    Tile.prototype.initializeButtons = function(){
      var buttons = [];
      var tile_config = this.getConfig();

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
      if (tile_config && tile_config.settings &&
            this.$el.hasClass('mosaic-read-only-tile') === false) {
        _addButton('Edit', 'settings', this.settingsClicked.bind(this));
      }

      if(!$.mosaic.hasContentLayout){
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
        var tile_url = this.getUrl();

        if(tile_url && tile_url !== 'undefined'){
          // Remove tags
          $.mosaic.removeHeadTags(tile_url);

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
      var value;
      classes.forEach(function(className){
        if(className.indexOf(name) !== -1){
          value = className.replace(name, '');
        }
      });
      return value;
    };


    Tile.prototype.initializeContent = function(){
      var that = this;

      // Local variables
      var url, start, end, fieldhtml, lines;

      var base = $('body', $.mosaic.document).attr('data-base-url');
      if(!base){
        base = $('head > base', $.mosaic.document).attr('href');
      }
      var href = this.getUrl();

      // Get tile type
      var tile_config = this.getConfig();

      // Check if a field tile
      if (tile_config.tile_type === 'field') {

        fieldhtml = '';

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

        switch (tile_config.widget) {
        case "z3c.form.browser.text.TextWidget":
        case "z3c.form.browser.text.TextFieldWidget":
          fieldhtml = start +
              $("#" + tile_config.id)
                    .find('input').attr('value') + end;
          break;
        case "z3c.form.browser.textarea.TextAreaWidget":
        case "z3c.form.browser.textarea.TextAreaFieldWidget":
        case "z3c.form.browser.textlines.TextLinesWidget":
        case "z3c.form.browser.textlines.TextLinesFieldWidget":
          lines = $("#" + tile_config.id)
                      .find('textarea')
                      .val().split('\n');
          fieldhtml += start;
          for (var i = 0; i < lines.length; i += 1) {
              fieldhtml += lines[i] + '<br/>';
          }
          fieldhtml += end;
          break;
        case "plone.app.z3cform.widget.RichTextFieldWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
        case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
        case "plone.app.widgets.dx.RichTextWidget":
          fieldhtml = $("#" + tile_config.id)
                          .find('textarea').val();
          break;
        default:
          fieldhtml = '<div class="discreet">Placeholder ' +
              'for field:<br/><b>' + tile_config.label +
              '</b></div>';
          break;
        }
        that.fillContent(fieldhtml);
      // Get data from app tile
      } else if (tile_config) {
        that.$el.addClass('mosaic-tile-loading');
        url = base ? [base, href].join('/')
                                 .replace(/\/+\.\//g, '/') : href;
        var original_url = url;
        // in case tile should be rendered differently for layout editor
        if(url.indexOf('?') === -1){
          url += '?';
        }else{
          url += '&';
        }
        if(url.indexOf('_layouteditor') === -1){
          url += '_layouteditor=true';
        }
        $.ajax({
          type: "POST",
          url: url,
          success: function (value) {
            that.$el.removeClass('mosaic-tile-loading');
            // Get dom tree
            value = $.mosaic.getDomTreeFromHtml(value);

            // Add head tags
            $.mosaic.addHeadTags(href, value);
            var tileHtml = value.find('.temp_body_tag').html();
            that.fillContent(tileHtml, original_url);

            var tiletype = that.getType();
            if(tiletype === 'plone.app.standardtiles.html'){
              // a little gymnastics to make wysiwyg work here
              // Init rich editor
              if(!that.$el.data('lastSavedData')){
                // save initial state
                that.$el.data('lastSavedData', that.getHtmlContent());
              }

              /* HACK HACK HACK */
              /* this is so first focus actually works with tinymce. */
              /* I hate this... */
              var tries = 0;
              var _check = function(){
                if(tries > 20){
                  return;
                }
                if(!that.tinymce){
                  setTimeout(_check, 20);
                  tries += 1;
                  return;
                }
                try{
                  that.tinymce.focus();
                }catch(e){
                  // ignore this error...
                }
                that.blur();
              };
              that.setupWysiwyg();
              _check();
            }
          },
          error: function(){
            that.$el.removeClass('mosaic-tile-loading');
            log.error('Error getting data for the tile ' + tile_config.label +
                      '(' + tile_config.name + '). Please read documentation ' +
                      'on how to correctly register tiles: https://pypi.python.org/pypi/plone.tiles');
          }
        });
      }
    };

    Tile.prototype.fillContent = function(html, tileUrl){
      // need to replace the data-tile node here
      var $el = this.getDataTileEl();
      var $content;
      if($el.length > 0){
        // only available on initialization
        $el.parent().html(html);
        $content = this.getContentEl();
      }else{
        // otherwise, we use content to fill html
        $content = this.getContentEl();
        $content.html(html);
      }
      if(tileUrl && $content.size() > 0){
        tileUrl = tileUrl.replace(/&/gim, '&amp;');
        // also need to fix duplicate &amp;
        while(tileUrl.indexOf('&amp;&amp;') !== -1){
          tileUrl = tileUrl.replace('&amp;&amp;', '&amp;');
        }
        $content.attr('data-tileUrl', tileUrl);
      }
      this.cacheHtml(html);
      this.scanRegistry();
    };

    Tile.prototype.cacheHtml = function(html) {
      /* Cache html on the tile element.
         This is only used by the scanRegistry method so
         we can reset the html of the html when running the pattern registry.
         */
      if (this.isRichText()) {
        return;  // no patterns, ignore this
      }
      var $content = this.$el.children(".mosaic-tile-content");
      if($content.size() === 0){
        return;
      }
      if(html === undefined){
        html = $content.html();
      }
      $content[0]._preScanHTML = html;
    };

    Tile.prototype.scanRegistry = function(){
      /*
        A bit tricky here because tiles can contain patterns.
        Pay attention to the use of _preScanHTML.
        If we do not do this, tiles do not render correctly when
        adding, dragging and dropping.
      */
      if (this.isRichText()) {
        return;  // no patterns, ignore this
      }
      var $el = this.$el.find(".mosaic-tile-content");
      if($el.size() === 0){
        return;
      }
      if($el[0]._preScanHTML){
        /* reset html because transform has happened */
        $el.html($el[0]._preScanHTML);
      }
      Registry.scan($el);

      // also check the content of the tile and override link handling...
      $('a', $el).on('click', function(e){
        e.preventDefault();
        e.stopPropagation();
      });
    };

    Tile.prototype.select = function(){
      var that = this;
      if (this.$el.hasClass("mosaic-selected-tile") === false &&
          this.$el.hasClass("mosaic-read-only-tile") === false) {
        // un-select existing
        var $tile = $(".mosaic-selected-tile", $.mosaic.document);
        if($tile.size() === 1){
          var tile = new Tile($tile);
          tile.blur();
        }

        this.focus();
      }
    };

    Tile.prototype._change = function(){
      // Set actions
      $.mosaic.options.toolbar.trigger("selectedtilechange");
      $.mosaic.options.panels.mosaicSetResizeHandleLocation();
      this.saveForm();
    };

    Tile.prototype.blur = function(){
      this.$el.removeClass("mosaic-selected-tile").children(".mosaic-tile-content").blur();
      this.$el.find('.mce-edit-focus').removeClass('mce-edit-focus');
      this._change();
    };

    Tile.prototype._focus = function(){
      var that = this;
      this.$el.addClass("mosaic-selected-tile");
      this.$el.children(".mosaic-tile-content").focus();
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
          $("#" + tile_config.id).find('input').attr('value', val);
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

    Tile.validTile = function(el){
      var $el = $(el);
      if($el.is('.mosaic-tile')){
        return true;
      }
      if($el.parents('.mosaic-tile').size() > 0){
        return true;
      }
      return false;
    };

    return Tile;
});
