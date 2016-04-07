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
  'tinymce'
], function($, logger, _, utils, Registry, TinyMCE, tinymce) {
  'use strict';

  var log = logger.getLogger('pat-mosaic');

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
    }
  };
  var _positionTimeout = 0;
  var positionActiveTinyMCE = function(){
    clearTimeout(_positionTimeout);
    _positionTimeout = setTimeout(_positionActiveTinyMCE, 50);
  };
  $(window).off('scroll', positionActiveTinyMCE).on('scroll', positionActiveTinyMCE);



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
          // need to save tile
          $.ajax({
            url: edit_url,
            method: 'POST',
            data: {
              'plone.app.standardtiles.rawhtml.content': currentData,
              _authenticator: utils.getAuthenticator(),
              'buttons.save': 'Save'
            }
          }).always(function(){
            that.$el.data('lastSavedData', currentData);
            that.$el.data('activeSave', false);
          });
        }
      }
    });
  };

  Tile.prototype.getHtmlContent = function(){
    return this.$el.children('.mosaic-tile-content').html();
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
        case "mosaic-edited-tile":
          return false;
        default:
          return true;
      }
    }).toArray();

    // Get tile config
    var tile_config = this.getConfig();

    // Predefine vars
    switch (tile_config.tile_type) {
      case "text":
        body += '          <div class="' + classes.join(' ') + '">\n';
        body += '          <div class="mosaic-tile-content">\n';
        body += this.$el.children(".mosaic-tile-content").html().replace(/^\s+|\s+$/g, '') + "\n";
        body += '          </div>\n';
        body += '          </div>\n';
        break;
      case "app":
      case "textapp":
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
        var tile_url = './@@plone.app.standardtiles.field?field=' + tiletype;

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
          !this.$el.hasClass('mosaic-tile-loading') &&
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
          type: "GET",
          url: url,
          success: function (value) {
            that.$el.removeClass('mosaic-tile-loading');
            // Get dom tree
            value = $.mosaic.getDomTreeFromHtml(value);

            // Add head tags
            $.mosaic.addHeadTags(href, value);
            var tileHtml = value.find('.temp_body_tag').html();
            that.fillContent(tileHtml, url);

            var tiletype = that.getType();
            if(tiletype === 'plone.app.standardtiles.rawhtml'){
              // a little gymnastics to make wysiwyg work here
              // Init rich editor
              if(!that.$el.data('lastSavedData')){
                // save initial state
                that.$el.data('lastSavedData', that.getHtmlContent());
              }
              that.setupWysiwyg();
            }
          },
          error: function(){
            that.$el.removeClass('mosaic-tile-loading');
          }
        });
      }
    };

    Tile.prototype.fillContent = function(html, tileUrl){
      // need to replace the data-tile node here
      var $el = this.$el.find('[data-tile]').parent();
      $el.html(html);
      var $content = this.$el.children(".mosaic-tile-content");
      if(tileUrl && $content.size() > 0){
        $content.attr('data-tileUrl', tileUrl.replace(/&/gim, '&amp;'));
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
      this.saveForm();
    };

    Tile.prototype.blur = function(){
      this.$el.removeClass("mosaic-selected-tile").children(".mosaic-tile-content").blur();
      this.$el.find('.mce-edit-focus').removeClass('mce-edit-focus');
      this._change();
    };

    Tile.prototype.focus = function(){
      this.$el.children(".mosaic-tile-content").focus();
      this._change();
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
          if (tile_config.name === 'IDublinCore-description') {
            newline = " ";  // otherwise Plone would replace \n with ''
          } else {
            newline = "\n";
          }
          $('.mosaic-panel .mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').each(function () {
            value += $(this).html()
              .replace(/<br[^>]*>/ig, newline)
              .replace("&nbsp;", "")
              .replace(/^\s+|\s+$/g, '') + newline;
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
      var $editorContainer = $('<div class="mosaic-rich-text-toolbar"></div>')
        .attr('id', $content.attr('id') + '-panel');
      $content.before($editorContainer);

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

      // Init rich editor
      pattern = new TinyMCE($content, $.extend(
        true, {}, $.mosaic.options.tinymce, { inline: false, tiny: {
        body_id: id,
        selector: "#" + id,
        inline: true,
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
          editor.on('focus', function(e) {
            if (e.target.id) {
              var $tile = $('#' + e.target.id).parents('.mosaic-tile').first();
              if($tile.size() > 0){
                var tile = new Tile($tile);
                tile.select();
                positionActiveTinyMCE();
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
