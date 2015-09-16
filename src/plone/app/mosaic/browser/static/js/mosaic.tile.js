/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define([
  'jquery',
  'pat-logger',
  'underscore',
  'mockup-utils',
  'mockup-patterns-tinymce',
  'tinymce'
], function($, logger, _, utils, TinyMCE) {
  'use strict';

  var log = logger.getLogger('pat-mosaic');

  /* Tile class */
  var Tile = function(el){
    var that = this;
    that.$el = $(el);
    if(!that.$el.is('.mosaic-tile')){
      that.$el = that.$el.parents('.mosaic-tile');
    }

    that.$el.children(".mosaic-tile-content").off('blur').on('blur', function(){
      var tiletype = that.getType();
      if(tiletype === 'plone.app.standardtiles.rawhtml'){
        // need to save tile
        $.ajax({
          url: that.getEditUrl(),
          method: 'POST',
          data: {
            'plone.app.standardtiles.rawhtml.content': that.$el.children('.mosaic-tile-content').html(),
            _authenticator: utils.getAuthenticator(),
            'buttons.save': 'Save'
          }
        });
      }
    });
  };

  Tile.prototype.getEditUrl = function(){
    var tile_url = this.getUrl();
    tile_url = tile_url.replace(/@@/, '@@edit-tile/');
    // Calc absolute edit url
    if (tile_url.match(/^\.\/.*/)) {
      tile_url = $.mosaic.options.context_url + tile_url.replace(/^\./, '');
    }
    return tile_url;
  };

  Tile.prototype.getUrl = function(){
    var tile_url = this.$el.find('.tileUrl').html();
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
    }
    return tile_url;
  };

  Tile.prototype.getType = function(){
    // previously $.mosaic.getTileType
    var tiletype = '';
    var $el = this.$el;
    var classes = $el.attr('class').split(" ");
    $(classes).each(function () {
      // Local variables
      var classname;

      classname = this.match(/^mosaic-([\w.\-]+)-tile$/);
      if (classname !== null) {
        if ((classname[1] !== 'selected') &&
            (classname[1] !== 'new') &&
            (classname[1] !== 'read-only') &&
            (classname[1] !== 'helper') &&
            (classname[1] !== 'original')) {
          tiletype = classname[1];
        }
      }
    });

    if(!tiletype){
      log.error('Could not find tile type on element with classes: ' + classes.join(', '));
    }

    return tiletype;
  };

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
        log.error('Could not load tile config for tile type: ' + tiletype);
        return;
    }
    return tile_config;
  };

  Tile.prototype.getHtmlBody = function(){
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
          return false;
        default:
          return true;
      }
    }).toArray();

    // Get tile config
    var tile_config = this.getConfig();

    // Predefine vars
    var tile_url;
      switch (tile_config.tile_type) {
        case "text":
          body += '          <div class="' + classes.join(' ') + '">\n';
          body += '          <div class="mosaic-tile-content">\n';
          body += this.$el.children(".mosaic-tile-content").html().replace(/^\s+|\s+$/g, '') + "\n";
          body += '          </div>\n';
          body += '          </div>\n';
          break;
        case "app":
          body += '          <div class="' + classes.join(' ') + '">\n';
          body += '          <div class="mosaic-tile-content">\n';
          body += '          <div data-tile="' + this.getUrl() + '"></div>\n';
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
      return body;
    };

    Tile.prototype.isRichText = function(tile_config){
      if(tile_config === undefined){
        tile_config = this.getConfig();
      }
      if (tile_config && this.$el.hasClass('mosaic-read-only-tile') === false &&
          !this.$el.hasClass('mosaic-tile-loading') &&
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

      // Add settings icon
      if (tile_config && tile_config.settings &&
            this.$el.hasClass('mosaic-read-only-tile') === false) {
        this.$el.prepend(
            $($.mosaic.document.createElement("div"))
                .addClass("mosaic-tile-control mosaic-info-icon")
        );
      }

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
      if(!tile_config){
          return;
      }

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
        $.ajax({
          type: "GET",
          url: url,
          success: function (value) {
            that.$el.removeClass('mosaic-tile-loading');
            // Get dom tree
            value = $.mosaic.getDomTreeFromHtml(value);

            // Add head tags
            $.mosaic.addHeadTags(href, value);
            var tileUrlHtml = '<p class="hiddenStructure ' +
              'tileUrl">' + href.replace(/&/gim, '&amp;') + '</p>';
            var tileHtml = value.find('.temp_body_tag').html();
            that.fillContent(tileUrlHtml + tileHtml);

            var tiletype = that.getType();
            if(tiletype === 'plone.app.standardtiles.rawhtml'){
              // a little gymnastics to make wysiwyg work here
              // Init rich editor
              that.setupWysiwyg();
            }
          },
          error: function(){
            that.$el.removeClass('mosaic-tile-loading');
          }
        });
      }
    };

    Tile.prototype.fillContent = function(html){
      // need to replace the data-tile node here
      this.$el.find('[data-tile]').parent().html(html);
    };

    Tile.prototype.select = function(){
      if (this.$el.hasClass("mosaic-selected-tile") === false &&
          this.$el.hasClass("mosaic-read-only-tile") === false) {

        // un-select existing
        var $tile = $(".mosaic-selected-tile", $.mosaic.document);
        if($tile.size() === 1){
          var tile = new Tile($tile);
          tile.blur();
        }
        this.$el.addClass("mosaic-selected-tile");

        this.focus();
      }
    };

    Tile.prototype._change = function(){
      // Set actions
      $.mosaic.options.toolbar.trigger("selectedtilechange");
      $.mosaic.options.panels.mosaicSetResizeHandleLocation();
    };

    Tile.prototype.blur = function(){
      this.$el.removeClass("mosaic-selected-tile").children(".mosaic-tile-content").blur();
      this._change();
    };

    Tile.prototype.focus = function(){
      this.$el.children(".mosaic-tile-content").focus();
      this._change();
    };

    Tile.prototype.setupWysiwyg = function(){
      var pattern;

      // Get element
      var $content = this.$el.find('.mosaic-tile-content');

      // Remove existing pattern
      try{
          $content.data("pattern-tinymce").destroy();
          $content.removeData("pattern-tinymce");
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
      $content.before($('<div class="mosaic-rich-text-toolbar"></div>')
          .attr('id', $content.attr('id') + '-panel'));

      // Build toolbar and contextmenu
      var actions, group, x, y,
          toolbar, cmenu;

      // Get tiletype
      var tiletype = this.getType();

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
      var placeholder = function() {
          if ($content.text().replace(/^\s+|\s+$/g, '').length === 0) {
              $content.addClass('mosaic-tile-content-empty');
          } else {
              $content.removeClass('mosaic-tile-content-empty');
          }
      };

      // XXX: Required to override global settings in Plone 5
      $("body").removeAttr("data-pat-tinymce");

      // Init rich editor
      pattern = new TinyMCE($content, $.extend(
          true, {}, $.mosaic.options.tinymce, { inline: false, tiny: {
          body_id: id,
          selector: "#" + id,
          inline: true,
          fixed_toolbar_container: '#' + id + '-panel',
          menubar: false,
          toolbar: toolbar.join(' ') || false,
          statusbar: false,
          contextmenu: cmenu.join(' ') || false,
          plugins: $.mosaic.options.tinymce.tiny.plugins.concat(
              cmenu.length ? ['contextmenu'] : []
          ),
          setup: function(editor) {
              editor.on('focus', function(e) {
                  if (e.target.id) {
                      var $tile = $('#' + e.target.id).parents('.mosaic-tile').first();
                      if($tile.size() > 0){
                          var tile = new Tile($tile);
                          tile.select();
                      }
                  }
              });
              editor.on('change', placeholder);
              placeholder();
          }
      }}));

      // Set editor class
      $content.addClass('mosaic-rich-text');
    };

    return Tile;
});
