/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.tile',[
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
              (classname[1] !== 'original')) {
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

/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.panel',[
  'jquery',
  'pat-logger',
  'underscore'
], function($, logger, _) {
  'use strict';

  var log = logger.getLogger('pat-mosaic');

  /* Panel class */
  var Panel = function(el){
    this.$el = $(el);
  };

  Panel.prototype.initialize = function($content){
    // Local variables
    var panel_id = this.$el.data("panel"), panel_attr_id,
        target = $("[data-panel=" + panel_id + "]", $.mosaic.document),
        max_columns = (this.$el.data('max-columns') || 4);

    // Implicitly initialize required panels with id matching element
    if (panel_id === 'content' && target.length === 0) {
      $('#' + panel_id, $.mosaic.document).each(function() {
        target = $(this);
        target.attr('data-panel', panel_id);
      });
    }

    // If content, create a new div since the form data is in
    // this panel
    if (panel_id === 'content') {
      panel_attr_id = target.attr('id');
      if($('.mosaic-original-content', $.mosaic.document).size() === 0){
        target.before($(document.createElement("div"))
            .attr("id", panel_attr_id)
            .attr("class", target.attr("class"))
            .addClass('mosaic-panel')
            .attr('data-panel', 'content')
            .attr('data-max-columns', max_columns)
            .html($content.find("[data-panel=" + panel_id + "]").html()));
        target
            .removeAttr('data-panel')
            .removeAttr('id')
            .addClass('mosaic-original-content');
      }else{
        // re-initializing, so we just have to replace existing
        target.replaceWith($(document.createElement("div"))
            .attr("id", panel_attr_id)
            .attr("class", target.attr("class"))
            .addClass('mosaic-panel')
            .attr('data-panel', 'content')
            .attr('data-max-columns', max_columns)
            .html($content.find("[data-panel=" + panel_id + "]").html()));
      }
    } else {
      target.attr("class",
          $content.find("[data-panel=" + panel_id + "]").attr("class"));
      target.addClass('mosaic-panel');
      target.html($content.find("[data-panel=" +
          panel_id + "]").html());
    }
  };

  Panel.prototype.prefill = function(){
    if (!this.$el.hasClass('mosaic-panel')) {
      log.info($(this));
      $(this).addClass('mosaic-panel');
      $(this).children().wrap($(
        '<div class="mosaic-grid-row">' +
          '<div class="mosaic-grid-cell mosaic-width-full mosaic-position-leftmost">' +
            '<div class="movable removable mosaic-tile mosaic-text-tile">' +
              '<div class="mosaic-tile-content">' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      ));
    }
  };

  return Panel;
});

/**
 * This plugin is used to create a mosaic layout.
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

/* global window: false, tinyMCE: false */
/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.layout',[
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
    widthClasses: ['mosaic-width-quarter', 'mosaic-width-third',
             'mosaic-width-half', 'mosaic-width-two-thirds',
             'mosaic-width-three-quarters', 'mosaic-width-full'],
    positionClasses: ['mosaic-position-leftmost', 'mosaic-position-quarter',
              'mosaic-position-third', 'mosaic-position-half',
              'mosaic-position-two-thirds',
              'mosaic-position-three-quarters']
  };

  /**
  * Create a new instance of a mosaic layout.
  *
  * @constructor
  * @id jQuery.fn.mosaicLayout
  * @return {Object} Returns a new mosaic layout object.
  */
  $.fn.mosaicLayout = function () {

    // Keydown handler
    var DocumentKeydown = function (e) {

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
          $(this).parents("[data-panel]")
            .removeClass("mosaic-panel-resizing");
          $(this).parent().removeClass("mosaic-row-resizing");
          $(this).parent().children(".mosaic-resize-placeholder")
            .remove();

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
          $.mosaic.options.panels.mosaicSetResizeHandleLocation();
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

    // Handle mouse move event
    var DocumentMousemove = function (e) {

      // Find resize helper
      $(".mosaic-helper-tile-new", $.mosaic.document).each(function () {

        // Get offset
        var offset = $(this).parent().offset();

        // Get mouse x
        $(this).css("top", e.pageY + 3 - offset.top);
        $(this).css("left", e.pageX + 3 - offset.left);
      });

      // Find resize helper
      $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {
        var columns;

        var cur_snap_offset;

        // Get helper
        var helper = $(this);

        // Get row
        var row = helper.parent();

        // Get mouse x
        var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

        // Get mouse percentage
        var mouse_percentage = (mouse_x / helper.data("row_width")) * 100;

        // Get closest snap location
        var snap = 25;
        var snap_offset = 1000;
        $([25, 33, 50, 67, 75]).each(function () {
          cur_snap_offset = Math.abs(this - mouse_percentage);
          if (cur_snap_offset < snap_offset) {
            snap = this;
            snap_offset = cur_snap_offset;
          }
        });

        // If 2 columns
        if (helper.data("nr_of_columns") === 2) {

          // Check if resize
          if (helper.data("column_sizes").split(" ")[0] !== snap) {

            // Loop through columns
            row.children(".mosaic-resize-placeholder").each(function (i) {

              // First column
              if (i === 0) {

                // Set new width and position
                $(this)
                  .removeClass($.mosaic.layout.widthClasses.join(" "))
                  .addClass(GetWidthClassByInt(parseInt(snap, 10)));

              // Second column
              } else {

                // Set new width and position
                $(this)
                  .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                  .removeClass($.mosaic.layout.widthClasses.join(" "))
                  .addClass(GetWidthClassByInt(parseInt(100 - snap, 10)))
                  .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                // Set helper
                helper
                  .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                  .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));
              }
            });

            // Set new size
            $(this).data("column_sizes", snap + " " + (100 - snap));
          }

        // Else 3 columns
        } else {

          // Get resize handle index
          var resize_handle_index = $(this).data("resize_handle_index");

          // Check if first resize handle
          if (resize_handle_index === 1) {

            // Check if resize
            if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index") - 1] !== snap) &&
                (parseInt(snap, 10) <= 50)) {

              // Get columns
              columns = row.children(".mosaic-resize-placeholder");

              // Remove position and width classes
              columns
                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                .removeClass($.mosaic.layout.widthClasses.join(" "));
              helper
                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

              // Get layout
              switch (parseInt(snap, 10)) {
              case 25:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                helper.data("column_sizes", "25 50 25");
                break;
              case 33:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                helper.data("column_sizes", "33 33 33");
                break;
              case 50:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(50));
                $(columns.get(1)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(25));
                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                helper.data("column_sizes", "50 25 25");
                break;
              }
            }

          // Else second resize handle
          } else {

            // Check if resize
            if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index")] !== (100 - snap)) &&
                (parseInt(snap, 10) >= 50)) {

              // Get columns
              columns = row.children(".mosaic-resize-placeholder");

              // Remove position and width classes
              columns
                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                .removeClass($.mosaic.layout.widthClasses.join(" "));
              helper
                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

              // Get layout
              switch (parseInt(snap, 10)) {
              case 50:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(25));
                $(columns.get(2)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(50));
                helper.data("column_sizes", "25 25 50");
                break;
              case 66:
              case 67:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                helper.data("column_sizes", "33 33 33");
                break;
              case 75:
                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                helper.data("column_sizes", "25 50 25");
                break;
              }
            }
          }
        }
      });
    };

    // Bind event and add to array
    $($.mosaic.document).off('mousemove').on('mousemove', DocumentMousemove);
    $($.mosaic.document).off('dragover').on('dragover', DocumentMousemove);

    // Handle mouse up event
    var DocumentMouseup = function (e) {

      // Find resize helper
      $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

        // Get panel
        var panel = $(this).parents("[data-panel]");

        // Get column sizes
        var column_sizes = $(this).data("column_sizes").split(" ");

        // Set column sizes
        $(this).parent().children(".mosaic-grid-cell").each(function (i) {
          var offset_x = 0;
          for (var j = 0; j < i; j += 1) {
            offset_x += parseInt(column_sizes[j], 10);
          }
          $(this)
            .removeClass($.mosaic.layout.positionClasses.join(" "))
            .removeClass($.mosaic.layout.widthClasses.join(" "))
            .addClass(GetPositionClassByInt(offset_x) + " " + GetWidthClassByInt(parseInt(column_sizes[i], 10)));
        });

        // Remove resizing state
        panel.removeClass("mosaic-panel-resizing");
        $(this).parent().removeClass("mosaic-row-resizing");
        $(this).parent().children(".mosaic-resize-placeholder").remove();

        // Set resize handles
        $(this).parent().mosaicSetResizeHandles();
        panel.mosaicSetResizeHandleLocation();
        var $tile = panel.find(".mosaic-selected-tile");
        if($tile.size() > 0){
          var tile = new Tile($tile);
          tile.focus();
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
      var tile = new Tile(this);
      tile.select();
    });

    // On click open overlay
    $($.mosaic.document).off("click", ".mosaic-info-icon").on("click", ".mosaic-info-icon", function () {

      var tile = new Tile($(this).parents(".mosaic-tile"));

      // Get tile config
      var tile_config = tile.getConfig();

      // Check if application tile
      if (tile_config.tile_type === 'app') {

        // Get url
        var tile_url = tile.getEditUrl();

        // Annotate the edited tile, because overlay will steal its focus
        $(this).parents(".mosaic-tile").addClass('mosaic-edited-tile');

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

              // Remove edited annotation
              $('.mosaic-edited-tile', $.mosaic.document).removeClass('mosaic-edited-tile');
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
            var $tile = $('.mosaic-edited-tile .mosaic-tile-content', $.mosaic.document);
            $tile.html(tileHtml);
            tile.fillContent(tileHtml, tileUrl);

            // Close overlay
            $.mosaic.overlay.app.hide();
            $.mosaic.overlay.app = null;
          }

          // Remove edited annotation
          $('.mosaic-edited-tile', $.mosaic.document).removeClass('mosaic-edited-tile');
        });
      } else {

        // Edit field
        $.mosaic.overlay.open('field', tile_config);
      }
    });

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
   * Add empty rows
   *
   * @id jQuery.mosaicAddEmptyRows
   * @return {Object} jQuery object
   */
  $.fn.mosaicAddEmptyRows = function () {

    // Loop through matched elements
    return this.each(function () {

      // Loop through rows
      $(this).find(".mosaic-grid-row").each(function (i) {

        // Check if current row has multiple columns
        if ($(this).children(".mosaic-grid-cell").length > 1) {

          // Check if first row
          if (i === 0) {
            $(this).before(
              $($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-row mosaic-empty-row")
                .append($($.mosaic.document.createElement("div"))
                  .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
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

          // Check if last row or next row also contains columns
          if (($(this).nextAll(".mosaic-grid-row").length === 0) || ($(this).next().children(".mosaic-grid-cell").length > 1)) {
            $(this).after(
              $($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-row mosaic-empty-row")
                .append($($.mosaic.document.createElement("div"))
                  .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
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
        }
      });

      if ($(this).find(".mosaic-grid-row").length === 0) {
        $(this).append(
          $($.mosaic.document.createElement("div"))
            .addClass("mosaic-grid-row mosaic-empty-row")
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
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
   * Event handler for drag end
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

      // Remove remaining empty rows
      $.mosaic.options.panels.find(".mosaic-empty-row").remove();

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

      // Remove remaining empty rows
      $(".mosaic-empty-row", $.mosaic.document).remove();

    // Not dropped on tile
    } else if (drop.hasClass("mosaic-tile") === false) {

      // Remove remaining empty rows
      $(".mosaic-empty-row", $.mosaic.document).remove();

      // Check if new tile
      if (!new_tile) {

        // Make sure the original tile doesn't get removed
        original_tile
          .removeClass("mosaic-original-tile")
          .addClass("mosaic-new-tile");
      }
    // Check if max columns rows is reached
    } else if ((drop.parent().parent().children(".mosaic-grid-cell").length >= obj.data('max-columns')) && (dir === "left" || dir === "right")) {
      // Remove remaining empty rows
      $(".mosaic-empty-row", $.mosaic.document).remove();

      // Check if new tile
      if (!new_tile) {

        // Make sure the original tile doesn't get removed
        original_tile
          .removeClass("mosaic-original-tile")
          .addClass("mosaic-new-tile");
      }

    // Dropped on row
    } else {

      // Remove empty rows
      $(".mosaic-empty-row", $.mosaic.document).remove();

      // If top
      if (dir === "top") {

        // Add tile before
        drop.before(
          original_tile
            .clone(true)
            .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
            .css({width: "", left: "", top: ""})
            .mosaicAddDrag()
            .addClass("mosaic-new-tile")
        );

      // If bottom
      } else if (dir === "bottom") {

        // Add tile after
        drop.after(
          original_tile
            .clone(true)
            .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
            .css({width: "", left: "", top: ""})
            .mosaicAddDrag()
            .addClass("mosaic-new-tile")
        );

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
                  .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
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
                  .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                  .append(next_elms.clone(true).mosaicAddDrag())
                )
              );
            next_elms.remove();
          }

          // Resize current column
          drop.parent()
            .removeClass($.mosaic.layout.widthClasses.join(" "))
            .removeClass($.mosaic.layout.positionClasses.join(" "))
            .addClass("mosaic-width-half");

          // Create column with dragged tile in it
          if (dir === "left") {
            drop.parent()
              .addClass("mosaic-position-half")
              .before($($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
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
              .addClass("mosaic-position-leftmost")
              .after($($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-half")
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

          // Rezize columns
          drop.parent().parent().mosaicSetColumnSizes();

          // Add resize handles
          drop.parent().parent().mosaicSetResizeHandles();
        }
      }
    }

    // Remove original tile
    var original_row = original_tile.parent().parent();
    $(".mosaic-original-tile", $.mosaic.document).remove();

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
    if(tile.isRichText()){
      tile.setupWysiwyg();
    }else{
      tile.scanRegistry();
    }
    tile.blur();
    // Select new tile
    if (new_tile) {
      // warning... this needs to be in a timeout
      // because tinymce initialization takes some time...
      setTimeout(function(){
        tile.select();
      }, 100);
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
      var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
      $(this)
        .children(".mosaic-grid-cell").each(function (i) {
          $(this)
            .removeClass($.mosaic.layout.widthClasses.join(" "))
            .removeClass($.mosaic.layout.positionClasses.join(" "));

          // Set width / position
          switch (nr_of_columns) {

          // 1 column
          case 1:
            $(this).addClass("mosaic-width-full mosaic-position-leftmost");
            break;

          // 2 columns
          case 2:
            switch (i) {
            case 0:
              $(this).addClass("mosaic-width-half mosaic-position-leftmost");
              break;
            case 1:
              $(this).addClass("mosaic-width-half mosaic-position-half");
              break;
            }
            break;

          // 3 columns
          case 3:
            switch (i) {
            case 0:
              $(this).addClass("mosaic-width-third mosaic-position-leftmost");
              break;
            case 1:
              $(this).addClass("mosaic-width-third mosaic-position-third");
              break;
            case 2:
              $(this).addClass("mosaic-width-third mosaic-position-two-thirds");
              break;
            }
            break;

          // 4 columns
          case 4:
            switch (i) {
            case 0:
              $(this).addClass("mosaic-width-quarter mosaic-position-leftmost");
              break;
            case 1:
              $(this).addClass("mosaic-width-quarter mosaic-position-quarter");
              break;
            case 2:
              $(this).addClass("mosaic-width-quarter mosaic-position-half");
              break;
            case 3:
              $(this).addClass("mosaic-width-quarter mosaic-position-three-quarters");
              break;
            }
            break;
          }
        });
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
      switch (nr_of_columns) {
      case 2:
        $(this).append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))  // jshint ignore:line
            .mosaicGetPositionClass().replace("position", "resize")
          )
        );
        break;
      case 3:
        $(this).append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))  // jshint ignore:line
            .mosaicGetPositionClass().replace("position", "resize")
          )
        );
        $(this).append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-two " + $($(this).children(".mosaic-grid-cell").get(2))  // jshint ignore:line
            .mosaicGetPositionClass().replace("position", "resize")
          )
        );
        break;
      }

      // Mouse down handler on resize handle
      $(this).children(".mosaic-resize-handle").mousedown(function (/* e */) {

        // Get number of columns and current sizes
        var column_sizes = [];
        $(this).parent().children(".mosaic-grid-cell").each(function () {

          // Add column size
          switch ($(this).mosaicGetWidthClass()) {
          case "mosaic-width-half":
            column_sizes.push("50");
            break;
          case "mosaic-width-quarter":
            column_sizes.push("25");
            break;
          case "mosaic-width-third":
            column_sizes.push("33");
            break;
          case "mosaic-width-two-thirds":
            column_sizes.push("66");
            break;
          case "mosaic-width-three-quarters":
            column_sizes.push("75");
            break;
          }

          // Add placeholder
          $(this).parent().append($($.mosaic.document.createElement("div"))
            .addClass("mosaic-resize-placeholder " + $(this).mosaicGetWidthClass() + " " + $(this).mosaicGetPositionClass().replace("position", "resize"))  // jshint ignore:line
            .append($($.mosaic.document.createElement("div"))
              .addClass("mosaic-resize-placeholder-inner-border")
            )
          );
        });

        // Get resize handle index
        var resize_handle_index = 1;
        if ($(this).hasClass("mosaic-resize-handle-two")) {
          resize_handle_index = 2;
        }

        // Add helper
        $(this).parent().append($($.mosaic.document.createElement("div"))
          .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
          .addClass($(this).mosaicGetPositionClass().replace("position", "resize"))
          .data("row_width", $(this).parent().width())
          .data("nr_of_columns", $(this).parent().children(".mosaic-grid-cell").length)
          .data("column_sizes", column_sizes.join(" "))
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

      // Check if prev row exists and if both rows only have 1 column
      if ((original_row.prevAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) &&
          (original_row.prev().children(".mosaic-grid-cell").length === 1)) {

        // Merge rows
        original_row.children(".mosaic-grid-cell").prepend(
          original_row.prev().children(".mosaic-grid-cell").children(".mosaic-tile")
            .clone(true)
            .mosaicAddDrag()
        );
        original_row.prev().remove();
      }

      // Check if next row exists and if both rows only have 1 column
      if ((original_row.nextAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) &&
          (original_row.next().children(".mosaic-grid-cell").length === 1)) {

        // Merge rows
        original_row.children(".mosaic-grid-cell").append(
          original_row.next().children(".mosaic-grid-cell").children(".mosaic-tile")
            .clone(true)
            .mosaicAddDrag()
        );
        original_row.next().remove();
      }

      // Set resize handles
      original_row.mosaicSetResizeHandles();
    });
  };

  /**
   * Set the location of the resize handle (left, right or center)
   *
   * @id jQuery.mosaicSetResizeHandleLocation
   * @return {Object} jQuery object
   */
  $.fn.mosaicSetResizeHandleLocation = function () {

    // Get panel
    var obj = $(this);

    // Loop through rows
    obj.children(".mosaic-grid-row").each(function () {

      // Get row
      var row = $(this);

      // Get cells
      var cells = row.children(".mosaic-grid-cell");

      // Check if 2 or 3 columns
      if ((cells.length === 2) || (cells.length === 3)) {

        // Remove location classes
        row.children(".mosaic-resize-handle").removeClass("mosaic-resize-handle-left mosaic-resize-handle-center mosaic-resize-handle-right");

        // Check if first column is selected
        if ($(cells.get(0)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

          // Set location
          row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-left");
          row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");

        // Check if second columns is selected
        } else if ($(cells.get(1)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

          // Set location
          row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-right");
          row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-left");

        // Check if third column is selected
        } else if (cells.length === 3 && $(cells.get(2)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

          // Set location
          row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
          row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-right");

        // No tile selected
        } else {

          // Set location
          row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
          row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");
        }
      }
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
          .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
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
          return editor.getContent();
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
  $.mosaic.getPageContent = function () {

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
      body += '    <div data-panel="' + $(this).data("panel") + '"'
      body += '         data-max-columns="' + $(this).data("max-columns") + '">\n';

      // Loop through rows
      $(this).children(".mosaic-grid-row").each(function () {

        // Check if not an empty row
        if ($(this).hasClass("mosaic-empty-row") === false) {

          // Add row open tag
          classNames = $(this).attr("class");
          body += '      <div class="' + classNames + '"\n';
          body += '           data-grid=\'{"type": "row"}\'>\n';

          // Loop through rows
          $(this).children(".mosaic-grid-cell").each(function () {

            // Add column size
            switch ($(this).mosaicGetPositionClass()) {
              case "mosaic-position-leftmost":
                position = 1;
                break;
              case "mosaic-position-quarter":
                position = 4;
                break;
              case "mosaic-position-third":
                position = 5;
                break;
              case "mosaic-position-half":
                position = 7;
                break;
              case "mosaic-position-two-thirds":
                position = 9;
                break;
              case "mosaic-position-three-quarters":
                position = 10;
                break;
            }

            // Add column size
            switch ($(this).mosaicGetWidthClass()) {
              case "mosaic-width-half":
                size = 6;
                break;
              case "mosaic-width-quarter":
                size = 3;
                break;
              case "mosaic-width-third":
                size = 4;
                break;
              case "mosaic-width-two-thirds":
                size = 8;
                break;
              case "mosaic-width-three-quarters":
                size = 9;
                break;
              case "mosaic-width-full":
                size = 12;
                break;
            }

            // Add cell start tag
            body += '        <div class="' + $(this).attr("class") + '"\n';
            body += '             data-grid=\'{"type": "cell", "info":{"xs": "true", "sm": "true", "lg": "true", "pos": {"x": ' + position + ', "width": ' + size + '}}}\'>\n';  // jshint ignore:line

            // Loop through tiles
            $(this).children(".mosaic-tile").each(function () {
              var tile = new Tile(this);
              body += tile.getHtmlBody();
            });

            // Add cell end tag
            body += '        </div>\n';
          });

          // Add row close tag
          body += '      </div>\n';
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

    var $customLayout = $("#form-widgets-ILayoutAware-content, " +
                          "[name='form.widgets.ILayoutAware.content']");
    if($.mosaic.hasContentLayout){
      $customLayout.val('');
    }else{
      $customLayout.val($.mosaic.getPageContent());
    }
  };

  /**
   * Get the name of the width class of the given integer
   *
   * @id GetWidthClassByInt
   * @param {Integer} column_width Percentage of the column width
   * @return {String} Classname of the width class of the given integer
   */
  function GetWidthClassByInt(column_width) {
    switch (column_width) {
    case 25:
      return "mosaic-width-quarter";
    case 33:
      return "mosaic-width-third";
    case 50:
      return "mosaic-width-half";
    case 66:
    case 67:
      return "mosaic-width-two-thirds";
    case 75:
      return "mosaic-width-three-quarters";
    case 100:
      return "mosaic-width-full";
    }

    // Fallback
    return "mosaic-width-full";
  }

  /**
   * Get the name of the position class of the given integer
   *
   * @id GetPositionClassByInt
   * @param {Integer} position Percentage of the column position
   * @return {String} Classname of the position class of the given integer
   */
  function GetPositionClassByInt(position) {
    switch (position) {
    case 0:
      return "mosaic-position-leftmost";
    case 25:
      return "mosaic-position-quarter";
    case 33:
      return "mosaic-position-third";
    case 50:
      return "mosaic-position-half";
    case 66:
    case 67:
      return "mosaic-position-two-thirds";
    case 75:
      return "mosaic-position-three-quarters";
    }

    // Fallback
    return "mosaic-position-leftmost";
  }


  return {
    Tile: Tile
  };
});

/**
 * This plugin is used to create a mosaic toolbar.
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

/* global window: false */
/*jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 140, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.toolbar',[
  'jquery',
  'mosaic-url/mosaic.tile',
  'mosaic-url/mosaic.layout'
], function($, Tile) {
  'use strict';

  // Define mosaic namespace if it doesn't exist
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  var normalizeClass = function(val){
    return val.replace(/(_|\.|\/)/g, "-").toLowerCase();
  };

  /**
   * Adds a control to the toolbar
   *
   * @id AddControl
   * @param {Object} parent Parent object to append control to
   * @param {Object} action Object of the action
   */
  function AddControl(parent, action) {

    var $el;

    // Check if button or menu
    if ((typeof (action.menu) !== undefined) && (action.menu)) {

      // Check if icon menu
      if (action.icon) {
        $el = $(document.createElement("label"));
        // Create menu
        parent.append($el
          .addClass("mosaic-icon-menu mosaic-icon-menu-" +
                normalizeClass(action.name) + ' mosaic-icon')
          .html(action.label)
          .attr("title", action.label)
          .append($(document.createElement("select"))
            .addClass("mosaic-menu-" + normalizeClass(action.name))
            .data("action", action.action)
            .change(function () {
              $(this).mosaicExecAction();
            })
            .each(function () {

              // Local variables
              var z, elm, y;

              for (z in action.items) {

                // Check if child objects
                if (action.items[z].items !== undefined) {
                  $(this).append($(document.createElement("optgroup"))
                    .addClass("mosaic-option-group mosaic-option-group-" +
                          normalizeClass(action.items[z].value))
                    .attr("label", action.items[z].label)
                  );
                  elm = $(this).find(".mosaic-option-group-" +
                             normalizeClass(action.items[z].value));

                  // Add child nodes
                  for (y in action.items[z].items) {
                    elm.append(
                      $(document.createElement("option"))
                        .attr('value', action.items[z].items[y].value)
                        .addClass('mosaic-option mosaic-option-' +
                              normalizeClass(action.items[z].items[y].value))
                        .html(action.items[z].items[y].label)
                    );
                  }

                // Else no child objects
                } else {
                  $(this).append(
                    $(document.createElement("option"))
                      .attr('value', action.items[z].value)
                      .addClass('mosaic-option mosaic-option-' + normalizeClass(action.items[z].value))
                      .html(action.items[z].label)
                  );
                }
              }
            })
          )
        );

      // Else text menu
      } else {
        $el = $(document.createElement("select"));
        // Create menu
        parent.append($el
          .addClass("mosaic-menu mosaic-menu-" +
                action.name.replace(/_/g, "-"))
          .data("action", action.action)
          .change(function () {
            $(this).mosaicExecAction();
          })
          .each(function () {

            // Local variables
            var z, elm, y;
            for (z = 0; z < action.items.length; z += 1) {

              // Check if child objects
              if (action.items[z].items !== undefined) {
                $(this).append($(document.createElement("optgroup"))
                  .addClass("mosaic-option-group mosaic-option-group-" +
                         normalizeClass(action.items[z].value))
                  .attr("label", action.items[z].label)
                );
                elm = $(this).find(".mosaic-option-group-" + normalizeClass(action.items[z].value));

                // Add child nodes
                for (y in action.items[z].items) {
                  elm.append(
                    $(document.createElement("option"))
                      .attr('value', action.items[z].items[y].value)
                      .addClass('mosaic-option mosaic-option-' + normalizeClass(action.items[z].items[y].value))
                      .html(action.items[z].items[y].label)
                  );
                }

              // Else no child objects
              } else {
                $(this).append(
                  $(document.createElement("option"))
                    .attr('value', action.items[z].value)
                    .addClass('mosaic-option mosaic-option-' + normalizeClass(action.items[z].value))
                    .html(action.items[z].label)
                );
              }
            }
          })
        );
      }

    } else {
      $el = $(document.createElement("button"));
      // Create button
      parent.append($el
        .addClass("mosaic-button mosaic-button-" + normalizeClass(action.name) + (action.icon ? ' mosaic-icon' : ''))
        .html(action.label)
        .attr("title", action.label)
        .attr("type", "button")
        .data("action", action.action)
        .mousedown(function () {
          $(this).mosaicExecAction();
        })
      );
    }
    if($.mosaic.actionManager.actions[action.name]){
      if(!$.mosaic.actionManager.actions[action.name].visible()){
        // hide it
        $el.hide();
      }
    }
  }

  $.fn._mosaicToolbarLayoutEditor = function(actions){
    $('.mosaic-toolbar-secondary-functions', this).show();

    var x, y, action_group, elm_action_group;
    // Add formats to toolbar
    if ($.mosaic.options.formats !== undefined) {
      for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
        action_group = $.mosaic.options.formats[x];
        actions.primary_actions.append(
          $(document.createElement("fieldset"))
            .addClass(
                "mosaic-button-group mosaic-button-group-" +
                normalizeClass(action_group.name))
        );
        elm_action_group = actions.primary_actions.children(
          ".mosaic-button-group-" +
          action_group.name.replace(/_/g, "-"));
        for (y = 0; y < action_group.actions.length; y += 1) {
          if (action_group.actions[y].favorite) {

            // Add control
            AddControl(elm_action_group,
                   action_group.actions[y]);
          }
        }
        if (elm_action_group.children().length === 0) {
          elm_action_group.remove();
        }
      }
    }

    // Add items to the insert menu
    if ($.mosaic.options.tiles !== undefined) {
      var elm_select_insert = actions.secondary_actions.find(
        ".mosaic-menu-insert");
      for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
        action_group = $.mosaic.options.tiles[x];
        elm_select_insert.append($(document.createElement("optgroup"))
          .addClass("mosaic-option-group mosaic-option-group-" + normalizeClass(action_group.name))
          .attr("label", action_group.label)
        );
        elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + normalizeClass(action_group.name));
        for (y = 0; y < action_group.tiles.length; y += 1) {
          var tile = action_group.tiles[y];
          elm_action_group.append($(document.createElement("option"))
            .addClass("mosaic-option mosaic-option-" + normalizeClass(tile.name))
            .attr("value", tile.name)
            .html(tile.label)
          );
        }
        if (elm_action_group.children().length === 0) {
          elm_action_group.remove();
        }
      }
    }

    // Add items to the format menu
    if ($.mosaic.options.formats !== undefined) {
      var elm_select_format = actions.secondary_actions.find(".mosaic-menu-format");
      for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
        action_group = $.mosaic.options.formats[x];
        elm_select_format.append($(document.createElement("optgroup"))
          .addClass("mosaic-option-group mosaic-option-group-" + normalizeClass(action_group.name))
          .attr("label", action_group.label)
        );
        elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + normalizeClass(action_group.name));
        for (y = 0; y <  action_group.actions.length; y += 1) {
          var action = action_group.actions[y];
          if (action.favorite === false) {
            elm_action_group.append($(document.createElement("option"))
              .addClass("mosaic-option mosaic-option-" + normalizeClass(action.name))
              .attr("value", action.name)
              .html(action.label)
              .data("action", action.action)
            );
          }
        }
        if (elm_action_group.children().length === 0) {
          elm_action_group.remove();
        }
      }
    }
  };

  /**
   * Create a new instance of a mosaic toolbar.
   *
   * @constructor
   * @id jQuery.fn.mosaicToolbar
   * @return {Object} Returns a jQuery object of the matched elements.
   */
  $.fn.mosaicToolbar = function () {

    // Loop through matched elements
    return this.each(function () {

      // Local variables
      var obj, content, actions, a, x, action_group, elm_action_group, y,
      RepositionToolbar, SelectedTileChange;

      // Get current object
      obj = $(this);

      // Empty object
      obj.html("");

      // Add mosaic toolbar class
      obj.append($(document.createElement("div"))
        .addClass("mosaic-inline-toolbar")
      );
      obj = obj.children(".mosaic-inline-toolbar");

      // Add content
      obj.append($(document.createElement("div"))
        .addClass("mosaic-toolbar-content")
      );
      content = obj.children(".mosaic-toolbar-content");

      // Add primary and secondary function div's
      actions = {};
      content.append($(document.createElement("div"))
        .addClass("mosaic-toolbar-primary-functions")
      );
      actions.primary_actions =
        content.children(".mosaic-toolbar-primary-functions");
      content.append($(document.createElement("div"))
        .addClass("mosaic-toolbar-secondary-functions")
      );
      actions.secondary_actions =
        content.children(".mosaic-toolbar-secondary-functions");

      // Loop through action groups
      for (a in actions) {

        // Add actions to toolbar
        for (x = 0; x < $.mosaic.options[a].length; x += 1) {

          // If single action
          if ($.mosaic.options[a][x].actions === undefined) {

            // Add control
            AddControl(actions[a], $.mosaic.options[a][x]);

          // If fieldset
          } else {
            action_group = $.mosaic.options[a][x];
            var classNamePart = normalizeClass($.mosaic.options[a][x].name);
            var $group = $(document.createElement("div"))
                         .addClass("mosaic-button-group mosaic-button-group-" +
                          classNamePart);
            $group.append(AddControl($group, $.extend({}, true, action_group, {
              action: action_group.name.toLowerCase(),
              name: action_group.name.toLowerCase()
            })));
            var $btnContainer = $(document.createElement("div")).addClass('btn-container');
            $group.append($btnContainer);
            actions[a].append($group);
            for (y = 0; y < action_group.actions.length; y += 1) {
              // Add control
              AddControl($btnContainer, action_group.actions[y]);
            }
          }
        }
      }

      obj._mosaicToolbarLayoutEditor(actions);
      if($.mosaic.hasContentLayout){
        // hide these options if static
        $('.mosaic-toolbar-secondary-functions', this).hide();
      }

      // Reposition toolbar on scroll
      RepositionToolbar = function () {

        // Local variables
        var left;

        if (parseInt($(window).scrollTop(), 10) >
          parseInt(obj.parent().offset().top, 10)) {
          if (obj.hasClass("mosaic-inline-toolbar")) {
            left = obj.offset().left;

            obj
              .width(obj.width())
              .css({
                'left': left,
                'margin-left': '0px'
              })
              .removeClass("mosaic-inline-toolbar")
              .addClass("mosaic-external-toolbar")
              .parent().height(obj.height());
          }
        } else {
          if (obj.hasClass("mosaic-external-toolbar")) {
            obj
              .css({
                'width': '',
                'left': '',
                'margin-left': ''
              })
              .removeClass("mosaic-external-toolbar")
              .addClass("mosaic-inline-toolbar")
              .parent().css('height', '');
          }
        }
      };

      // Bind method and add to array
      $(window).bind('scroll', RepositionToolbar);

      // Bind selected tile change event
      SelectedTileChange = function () {
        // Local variables
        var obj, tiletype, actions, x,
        tile_group, y;

        // Disable edit html source
        $.mosaic.disableEditHtmlSource();

        // Get object
        obj = $(this);

        var $selected_tile = $(".mosaic-selected-tile", $.mosaic.document);
        if($selected_tile.length > 0){
          var tile = new Tile($selected_tile);
          tiletype = tile.getType();
        }

        // Get actions
        actions = $.mosaic.options.default_available_actions;
        for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
          tile_group = $.mosaic.options.tiles[x];
          for (y = 0; y <  tile_group.tiles.length; y += 1) {
            if (tile_group.tiles[y].name === tiletype) {
              actions = actions
                .concat(tile_group.tiles[y].available_actions);
            }
          }
        }
        if (!$selected_tile.hasClass('removable')) {
          actions = $(actions).filter(function() {
            return this !== 'remove';
          });
        }

        // Show option groups
        obj.find(".mosaic-option-group").show();

        // Hide all actions
        obj.find(".mosaic-button").hide();
        obj.find(".mosaic-menu").hide();
        obj.find(".mosaic-icon-menu").hide();
        obj.find(".mosaic-menu-format").find(".mosaic-option")
          .hide()
          .attr("disabled", "disabled");
        $(obj.find(".mosaic-menu-format")
          .find(".mosaic-option").get(0))
          .show()
          .removeAttr("disabled");

        // Show actions
        $(actions).each(function (i, val) {
          if($.mosaic.actionManager.actions[val]){
            if(!$.mosaic.actionManager.actions[val].visible()){
              return;
            }
          }
          obj.find(".mosaic-button-" + val).show();
          obj.find(".mosaic-icon-menu-" + val).show();
          obj.find(".mosaic-menu-" + val).show();
          obj.find(".mosaic-option-" + val)
            .show()
            .removeAttr("disabled");
        });
        if($.mosaic.actionManager.actions.layout.visible()){
          $('.mosaic-button-layout').show();
        }

        // Set available fields
        obj.find(".mosaic-menu-insert")
          .children(".mosaic-option-group-fields")
          .children().each(function () {
          if ($.mosaic.options.panels
            .find(".mosaic-" + $(this).attr("value") + "-tile")
            .length === 0) {
            $(this).show().removeAttr("disabled");
          } else {
            $(this).hide().attr("disabled", "disabled");
          }
        });

        // Hide option group if no visible items
        obj.find(".mosaic-option-group").each(function () {
          if ($(this).children(":enabled").length === 0) {
            $(this).hide();
          }
        });

        // Hide menu if no enabled items
        $(".mosaic-menu, .mosaic-icon-menu",
          $.mosaic.document).each(function () {
          if ($(this).find(".mosaic-option:enabled").length === 1) {
            $(this).hide();
          }
        });

        if(!$.mosaic.hasContentLayout && $.mosaic.options.canChangeLayout){
          $('.mosaic-button-savelayout').show();
        }else{
          $('.mosaic-button-savelayout').hide();
        }
      };



      // Remove highlight
      $(".mosaic-button-remove").hover(
        function() {
          $(".mosaic-selected-tile .mosaic-tile-content")
            .addClass('mosaic-remove-target');
        },
        function() {
          $(".mosaic-selected-tile .mosaic-tile-content")
            .removeClass('mosaic-remove-target');
        }
      );

      // Bind method and add to array
      $(this).bind("selectedtilechange", SelectedTileChange);

      // Set default actions
      $(this).trigger("selectedtilechange");

      // Apply select2 for menus
      $(".mosaic-menu").each(function() {
        $(this).select2({
          width: 'style',
          dropdownCssClass: 'mosaic-dropdown mosaic-dropdown-' + $(this).data("action"),
          dropdownAutoWidth: true,
          minimumResultsForSearch: 99
        });
      });

      // Trigger inline validation draft auto save
      var lastChange = (new Date()).getTime();
      $(this).on('selectedtilechange', function () {
        if ($.mosaic.overlay.app) { return; }
        if ((new Date()).getTime() - lastChange > 6000) {
          $.mosaic.saveLayoutToForm();
          setTimeout(function(){
            // we want to do this on a delay to prevent conflict errors when
            // editing a tile and this is called at the exact same time
            $("#form-widgets-ILayoutAware-content, " +
              "[name='form.widgets.ILayoutAware.content']").blur();
          }, 1000);
          lastChange = (new Date()).getTime();
        }
      });
    });
  };
});

/**
 * This plugin is used to register and execute actions.
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

/*jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 140, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.actions',[
  'jquery',
  'mosaic-url/mosaic.tile',
  'mockup-utils',
  'mockup-patterns-modal'
], function($, Tile, utils, Modal) {
  'use strict';

  // Define mosaic namespace if it doesn't exist
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Global array containing actions and shortcuts
  $.mosaic.actionManager = {
    actions: [],                // Array with all the actions
    shortcuts: []               // Lookup array for shortcuts
  };

  /**
   * Register an action
   *
   * @id jQuery.mosaic.registerAction
   * @param {String} name Name of the action.
   * @param {Object} options Object containing all the options of the action
   */
  $.mosaic.registerAction = function (name, options) {

    // Extend default settings
    options = $.extend({

      // Handler for executing the action
      exec: function () {
      },

      // Shortcut can be any key + ctrl/shift/alt or a combination of
      // those
      shortcut: {
        ctrl: false,
        alt: false,
        shift: false,
        key: ""
      },

      // Method to see if the actions should be visible based on the
      // current tile state
      visible: function (tile) {
        return true;
      },

      // Should the action be undo-able?
      undoable: false

    }, options);

    // Add action to manager
    $.mosaic.actionManager.actions[name] = options;

    // Check if shortcut is defined
    if (options.shortcut.key !== "") {

      // Set keyCode and charCode
      options.shortcut.charCode = options.shortcut.key.toUpperCase()
        .charCodeAt(0);
      options.shortcut.action = name;

      // Set shortcut
      $.mosaic.actionManager.shortcuts.push(options.shortcut);
    }
  };

  /**
   * Execute an action
   *
   * @id jQuery.mosaicExecAction
   * @return {Object} Returns a jQuery object of the matched elements.
   */
  $.fn.mosaicExecAction = function () {

    // Loop through matched elements
    return this.each(function () {

      // Check if actions specified
      if ($(this).data("action") !== "") {

        var mgr = $.mosaic.actionManager;

        // Exec actions
        mgr.actions[$(this).data("action")].exec(this);
        if (mgr.actions[$(this).data("action")].undoable) {
          $.mosaic.undo.snapshot();
        }
      }
    });
  };

  /**
   * Remove spans inserted by webkit
   *
   * @id jQuery.mosaic.fixWebkitSpan
   * @return {Object} jQuery object
   */
  $.mosaic.fixWebkitSpan = function () {
    var webkit_span = $(".Apple-style-span", $.mosaic.document);
    webkit_span.after(webkit_span.html());
    webkit_span.remove();
  };

  /**
   * Build mosaic-prefixed class name so that 'foo-bar' becomes
   * 'mosaic-foo-bar' and 'fooBar' becomes 'mosaicFooBar'.
   *
   * @id jQuery.mosaic.getPrefixedClassName
   * @name {String} class name
   * @return {String} class name
   */
  $.mosaic.getPrefixedClassName = function (name) {
    if (name.indexOf('-') > -1) {
      // dash-spaced-class-name
      return 'mosaic-' + name;
    } else {
      // camelCaseClassName
      return 'mosaic' + name.charAt(0).toUpperCase() + name.slice(1);
    }
  };

  /**
   * Initialize the action manager
   *
   * @id jQuery.mosaic.initActions
   */
  $.mosaic.initActions = function () {

    // Register generic re-usable toggle tile class format action
    $.mosaic.registerAction('tile-toggle-class', {
       exec: function () {
         var name;
         if (arguments.length > 0 && arguments[0].value) {
           name = $.mosaic.getPrefixedClassName(arguments[0].value);
           $(".mosaic-selected-tile", $.mosaic.document)
             .toggleClass(name);
         }
       }
     });

    // Register generic re-usable toggle tile class format action
    $.mosaic.registerAction('tile-remove-format', {
      exec: function () {
        var i, j, group, action, name;
        for (i = 0; i < $.mosaic.options.formats.length; i++) {
          group = $.mosaic.options.formats[i];
          for (j = 0; j < group.actions.length; j++) {
            action = group.actions[j];
            if (action.category === 'tile') {
              name = $.mosaic.getPrefixedClassName(action.name);
              $(".mosaic-selected-tile", $.mosaic.document)
                .removeClass(name);
            }
          }
        }
      }
    });

    // Register generic re-usable toggle row class format action
    $.mosaic.registerAction('row-toggle-class', {
      exec: function () {
        var name;
        if (arguments.length > 0 && arguments[0].value) {
          name = $.mosaic.getPrefixedClassName(arguments[0].value);
          $(".mosaic-selected-tile", $.mosaic.document)
            .parents('.mosaic-grid-row').first()
            .toggleClass(name);
        }
      }
    });

    // Register generic re-usable toggle row class format action
    $.mosaic.registerAction('row-remove-format', {
      exec: function () {
        var i, j, group, action, name;
        for (i = 0; i < $.mosaic.options.formats.length; i++) {
          group = $.mosaic.options.formats[i];
          for (j = 0; j < group.actions.length; j++) {
            action = group.actions[j];
            if (action.category === 'row') {
              name = $.mosaic.getPrefixedClassName(action.name);
              $(".mosaic-selected-tile", $.mosaic.document)
                .parents('.mosaic-grid-row').first()
                .removeClass(name);
            }
          }
        }
      }
    });

    // Register tile align block action
    $.mosaic.registerAction('tile-align-block', {
      exec: function () {

        // Remove left and right align classes
        $(".mosaic-selected-tile", $.mosaic.document)
          .removeClass("mosaic-tile-align-right")
          .removeClass("mosaic-tile-align-left");
      },
      shortcut: {
        ctrl: true,
        alt: false,
        shift: true,
        key: 'b'
      }
    });

    // Register tile align left action
    $.mosaic.registerAction('tile-align-left', {
      exec: function () {

        // Remove right align class, add left align class
        $(".mosaic-selected-tile", $.mosaic.document)
          .removeClass("mosaic-tile-align-right")
          .addClass("mosaic-tile-align-left");
      },
      shortcut: {
        ctrl: true,
        alt: false,
        shift: true,
        key: 'l'
      }
    });

    // Register tile align right action
    $.mosaic.registerAction('tile-align-right', {
      exec: function () {

        // Remove left align class, add right align class
        $(".mosaic-selected-tile", $.mosaic.document)
          .removeClass("mosaic-tile-align-left")
          .addClass("mosaic-tile-align-right");
      },
      shortcut: {
        ctrl: true,
        alt: false,
        shift: true,
        key: 'r'
      }
    });

    // Register save action
    $.mosaic.registerAction('save', {
      exec: function () {
        $.mosaic.options.toolbar.trigger("selectedtilechange");
        $.mosaic.saveLayoutToForm();
        $("#form-buttons-save").click();
      },
      shortcut: {
        ctrl: true,
        alt: false,
        shift: false,
        key: 's'
      }
    });

    // Register cancel action
    $.mosaic.registerAction('cancel', {
      exec: function () {

        // Cancel form
        $("#form-buttons-cancel").click();
      }
    });

    // Register html action
    $.mosaic.registerAction('html', {
      exec: function () {

        // Local variables
        var tilecontent, text, height;

        // Get tile content div
        tilecontent = $(".mosaic-selected-tile", $.mosaic.document)
                  .children(".mosaic-tile-content");

        // Check if not already html editable
        if (tilecontent.find('.mosaic-rich-text-textarea')
            .length === 0) {

          // Add new text area and set content
          text = tilecontent.html();
          height = tilecontent.height();
          tilecontent.empty();
          tilecontent.prepend(
            $($.mosaic.document.createElement("textarea"))
              .addClass("mosaic-rich-text-textarea")
              .html($.trim(text))
              .height(height));
        }
      }
    });

    // Register undo action
    $.mosaic.registerAction('undo', {
      exec: function () {
        $.mosaic.undo.undo();
      }
    });

    // Register redo action
    $.mosaic.registerAction('redo', {
      exec: function () {
        $.mosaic.undo.redo();
      }
    });

    // Register page properties action
    $.mosaic.registerAction('properties', {
      exec: function () {
        $.mosaic.overlay.open('all');
      }
    });

    $.mosaic.registerAction('layout', {
      /* layout drop down */
      exec: function () {
        var $container = $('.mosaic-button-group-layout');
        $container.toggleClass('active');
      },
      visible: function(){
        return true;
      }
    });

    // register customize layout button
    $.mosaic.registerAction('customizelayout', {
      exec: function () {
        $.mosaic.setSelectedContentLayout('');  // clear selected layout, will use stored layout then
        $('.mosaic-toolbar-secondary-functions').show();
        $('.mosaic-button-customizelayout').hide();
        $('.mosaic-button-savelayout').show();
        // go through each tile and add movable
        $('.mosaic-panel .mosaic-tile', $.mosaic.document).each(function(){
          var tile = new Tile(this);
          tile.makeMovable();
          tile.$el.mosaicAddDrag();
        });
        $('.mosaic-button-group-layout').removeClass('active');
      },
      visible: function(){
        return $.mosaic.hasContentLayout && $.mosaic.options.canChangeLayout;
      }
    });

    // register change layout button
    $.mosaic.registerAction('changelayout', {
      exec: function () {
        var yes = $.mosaic.hasContentLayout;
        if(!yes){
          yes = confirm('Changing your layout will destroy all existing custom layout ' +
                        'settings you have in place. Are you sure you want to continue?');
        }
        if(yes){
          $.mosaic.selectLayout();
        }
        $('.mosaic-button-group-layout').removeClass('active');
      },
      visible: function(){
        return $.mosaic.options.available_layouts.length > 0;
      }
    });

    // register change layout button
    $.mosaic.registerAction('savelayout', {
      exec: function () {
        $.mosaic.saveLayout();
        $('.mosaic-button-group-layout').removeClass('active');
      },
      visible: function(){
        return true;
      }
    });

    // Register add tile action
    $.mosaic.registerAction('add-tile', {
      exec: function () {

        // Open overlay
        var m = new Modal($('.mosaic-toolbar'),
          {ajaxUrl: $.mosaic.options.context_url +
           '/@@add-tile?form.button.Create=Create'});
        m.show();
      }
    });

    // Register format action
    $.mosaic.registerAction('format', {
      exec: function (source) {

        // Execute the action
        $(source).find("[value=" + $(source).val() + "]")
          .mosaicExecAction();

        // Reset menu
        $(source).select2("val", "none"); // $(source).val("none");
      }
    });

    // Register page-insert action
    $.mosaic.registerAction('remove', {
      exec: function (source) {
        $(".mosaic-selected-tile", $.mosaic.document).each(function() {
          // Get tile config
          var tile = new Tile(this);
          var tile_config = tile.getConfig();

          // Check if app tile
          if (tile_config.tile_type === 'app') {

            // Get url
            var tile_url = tile.getUrl();

            if(tile_url){
              // Remove tags
              $.mosaic.removeHeadTags(tile_url);

              // Calc delete url
              var url = tile_url.split('?')[0];
              url = url.split('@@');
              var tile_type_id = url[1].split('/');
              url = url[0] + '@@delete-tile/' + tile_type_id[0] + '/' + tile_type_id[1];
              // Calc absolute delete url
              if (url.match(/^\.\/.*/)) {
                url = $.mosaic.options.context_url + url.replace(/^\./, '');
              }

              // Ajax call to remove tile
              $.ajax({
                type: "GET",
                url: url,
                success: function (value) {
                  var authenticator = $(value).find('[name="_authenticator"]').val();
                  $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                      'buttons.delete': 'Delete',
                      '_authenticator': authenticator
                    },
                    success: function(value) {
                    }
                  });
                }
              });
            }
          }

          // Remove empty rows
          $.mosaic.options.panels.find(".mosaic-empty-row").remove();

          // Get original row
          var original_row = $(this).parent().parent();

          // Save tile value
          tile.saveForm();

          // Remove current tile
          $(this).remove();

          $.mosaic.undo.snapshot();

          // Cleanup original row
          original_row.mosaicCleanupRow();

          // Add empty rows
          $.mosaic.options.panels.mosaicAddEmptyRows();

          // Set toolbar
          $.mosaic.options.toolbar.trigger("selectedtilechange");
          $.mosaic.options.toolbar.mosaicSetResizeHandleLocation();
        });
      },
      visible: function(){
        return !$.mosaic.hasContentLayout;
      }
    });

    // Register page-insert action
    $.mosaic.registerAction('insert', {
      exec: function (source) {

        // Local variables
        var tile_config, tile_group, tile_type, x, y;

        // Check if value selected
        if ($(source).val() === "none") {
          return false;
        } else {
          tile_type = $(source).val();
        }

        // Deselect tiles
        $(".mosaic-selected-tile", $.mosaic.document)
          .removeClass("mosaic-selected-tile")
          .children(".mosaic-tile-content").blur();

        // Set actions
        $.mosaic.options.panels.trigger("selectedtilechange");

        // Get tile config
        for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
          tile_group = $.mosaic.options.tiles[x];
          for (y = 0; y < tile_group.tiles.length; y += 1) {
            if (tile_group.tiles[y].name === tile_type) {
              tile_config = tile_group.tiles[y];
            }
          }
        }

        // Create new app tile
        if (tile_config.tile_type === 'textapp') {
          // an app tile
          // generate uid for it: http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
          var uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
          });

          var tileUrl = $.mosaic.options.context_url + '/@@' + tile_type + '/' + uid;
          var html = '<html><body>' + $.mosaic.getDefaultValue(tile_config) + '</body></html>';
          $.mosaic.addAppTileHTML(tile_type, html, tileUrl);
        }else if (tile_config.tile_type === 'app') {
          // Load add form form selected tiletype
          var initial = true;
          utils.loading.show();
          $.ajax({
            type: "GET",
            url: $.mosaic.options.context_url +
              '/@@add-tile?tiletype=' + tile_type +
              '&form.button.Create=Create',
            success: function(value, xhr) {
              utils.loading.hide();
              var $value, action_url, authenticator, modalFunc;

              // Read form
              $value = $(value);
              action_url = $value.find('#add_tile').attr('action');
              authenticator = $value.find('[name="_authenticator"]').val();
              // Open add form in modal when requires user input
              modalFunc = function(html) {
                $.mosaic.overlay.app = new Modal($('.mosaic-toolbar'), {
                  html: html,
                  loadLinksWithinModal: true,
                  buttons: '.formControls > input[type="submit"], .actionButtons > input[type="submit"]'
                });
                $.mosaic.overlay.app.$el.off('after-render');
                $.mosaic.overlay.app.on(
                  'after-render',
                  function(event) {
                    /* Remove field errors since the user has not actually
                       been able to fill out the form yet */
                    if(initial){
                      $('.field.error', $.mosaic.overlay.app.$modal)
                        .removeClass('error');
                      $('.fieldErrorBox,.portalMessage', $.mosaic.overlay.app.$modal).remove();
                      initial = false;
                    }

                    $('input[name*="cancel"]',
                      $.mosaic.overlay.app.$modal)
                      .off('click').on('click', function() {
                        // Close overlay
                        $.mosaic.overlay.app.hide();
                        $.mosaic.overlay.app = null;
                    });
                  }
                );
                $.mosaic.overlay.app.show();
                $.mosaic.overlay.app.$el.off('formActionSuccess');
                $.mosaic.overlay.app.on(
                  'formActionSuccess',
                  function (event, response, state, xhr) {
                    var tileUrl = xhr.getResponseHeader('X-Tile-Url');
                    if (tileUrl) {
                      $.mosaic.addAppTileHTML(
                        tile_type, response, tileUrl);
                      $.mosaic.overlay.app.hide();
                      $.mosaic.overlay.app = null;
                    }
                  }
                );
              };

              // Auto-submit add-form when all required fields are filled
              if ($("form .required", $value).filter(function() {
                  var val = $(this).parents(".field").first()
                    .find("input, select, textarea")
                    .not('[type="hidden"]').last().val();
                  return val === null || val.length === 0; }).length > 0) {
                modalFunc(value);
              } else if (action_url) {
                $("form", $value).ajaxSubmit({
                  type: "POST",
                  url: action_url,
                  data: {
                    'buttons.save': 'Save',
                    '_authenticator': authenticator
                  },
                  success: function(value, state, xhr) {
                    var tileUrl = xhr.getResponseHeader('X-Tile-Url');
                    if (tileUrl) {
                      $.mosaic.addAppTileHTML(
                        tile_type, value, tileUrl);
                    } else {
                      modalFunc(value);
                    }
                  }
                });
              }
            }
          });

        } else {

          // Add tile
          $.mosaic.addTile(
            tile_type, $.mosaic.getDefaultValue(tile_config));
        }

        // Reset menu
        $(source).select2("val", "none"); // $(source).val("none");

        // Normal exit
        return true;
      }
    });

    // Handle keypress event, check for shortcuts
    $(document).keypress(function (e) {

      // Action name
      var action = "";

      // Loop through shortcuts
      $($.mosaic.actionManager.shortcuts).each(function () {

        // Check if shortcut matched
        if (((e.ctrlKey === this.ctrl) ||
           (navigator.userAgent.toLowerCase()
            .indexOf('macintosh') !== -1 &&
            e.metaKey === this.ctrl)) &&
          ((e.altKey === this.alt) || (e.altKey === undefined)) &&
          (e.shiftKey === this.shift) &&
          (e.charCode && String.fromCharCode(e.charCode)
            .toUpperCase().charCodeAt(0) === this.charCode)) {

          // Found action
          action = this.action;
        }
      });

      // Check if shortcut found
      if (action !== "") {

        // Exec actions
        $.mosaic.actionManager.actions[action].exec();

        if ($.mosaic.actionManager.actions[action].undoable) {
          $.mosaic.undo.snapshot();
        }

        // Prevent other actions
        return false;
      }

      // Normal exit
      return true;
    });
  };
});

/**
 * This plugin is used to define the mosaic namespace
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

/* global window: false */
/*jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 120, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.core',[
  'jquery',
  'pat-logger',
  'underscore',
  'mosaic-url/mosaic.tile',
  'mosaic-url/mosaic.panel',
  'mockup-patterns-modal',
  'mockup-utils',
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.actions'
], function($, logger, _, Tile, Panel, Modal, utils) {
  "use strict";

  var log = logger.getLogger('pat-mosaic');

  // Create the mosaic namespace
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Set variables
  $.mosaic.loaded = false;

  $.mosaic.selectLayoutTemplate = _.template('<div>' +
    '<h1>Select Layout</h1>' +
    '<div class="mosaic-select-layout">' +
      '<div class="global-layouts">' +
        '<ul>' +
          '<% _.each(available_layouts, function(layout){ ' +
            'var screenshot = layout.preview || layout.screenshot;' +
            'if(!screenshot){' +
              'screenshot = "++resource++plone.app.mosaic.images/default-layout-screenshot.png";' +
            '} %>' +
            '<li><a href="#" data-value="<%- layout.path %>">' +
              '<p><%- layout.title %></p><img src="<%- screenshot %>"></a></li>' +
          '<% }); %>' +
        '</ul>' +
      '</div>' +
      '<% if(user_layouts.length > 0){ %>' +
        '<hr />' +
        '<div class="user-layouts">' +
          '<h4>My Layouts</h4>' +
          '<ul>' +
            '<% _.each(user_layouts, function(layout){ ' +
              'var screenshot = layout.preview || layout.screenshot;' +
              'if(!screenshot){' +
                'screenshot = "++resource++plone.app.mosaic.images/default-layout-screenshot.png";' +
              '} %>' +
              '<li><a href="#" data-value="<%- layout.path %>">' +
                '<p><%- layout.title %></p><img src="<%- screenshot %>"></a></li>' +
            '<% }); %>' +
          '</ul>' +
        '</div>' +
      '<% } %>' +
      '<% if(hasCustomLayouts) { %>' +
        '<hr />' +
        '<p class="manage-custom-layouts"><a href="#">Manage custom layouts</a></p>' +
      '<% } %>' +
    '</div>' +
    '<div class="buttons">' +
      '<!-- <button class="plone-btn plone-btn-default">Select</button> -->' +
    '</div>' +
  '</div>');

  $.mosaic.saveLayoutTemplate = _.template('<div>' +
    '<h1>Save Layout</h1>' +
    '<div class="mosaic-save-layout">' +
      '<p>This process takes a copy of the existing layout and saves it to a new, ' +
          'resuable layout.</p>' +
      '<div class="form-group field">' +
        '<label for="layoutNameField">Name</label>' +
        '<input type="text" name="name" class="form-control" id="layoutNameField" />' +
      '</div>' +
      '<div class="field form-group">' +
        '<span class="option">' +
          '<input id="globalLayout" type="checkbox">' +
          '<label for="globalLayout">' +
            '<span class="label">Global</span>' +
          '</label>' +
        '</span>' +
        '<div class="formHelp">Should this layout be available for all users on the site?</div>' +
      '</div>' +
    '</div>' +
    '<div class="buttons">' +
      '<button class="plone-btn plone-btn-primary">Save</button>' +
    '</div>' +
  '</div>');

  $.mosaic.manageLayoutsTemplate = _.template('<div>' +
    '<h1>Manage custom layouts</h1>' +
    '<div class="mosaic-manage-custom-layouts">' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>Name</th>' +
            '<th>Path</th>' +
            '<th>Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<% _.each(available_layouts.concat(user_layouts), function(layout){ %>' +
            '<% if(layout.path.indexOf("custom/") !== -1){ %>' +
              '<tr>' +
                '<td><%- layout.title %></td>' +
                '<td><%- layout.path %></td>' +
                '<td><a href="#" class="btn btn-danger delete-layout" ' +
                        'data-layout="<%- layout.path %>">Delete</a></td>' +
              '</tr>' +
            '<% } %>' +
          '<% }); %>' +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>');

  $.mosaic.deleteLayoutTemplate = _.template('<div>' +
    '<h1>Delete layout</h1>' +
    '<div class="mosaic-delete-layout">' +
      '<% if(existing.length === 0 && !selected){  %>' +
        '<div class="portalMessage warning">' +
          '<strong>Warning</strong>' +
          'Are you certain you want to delete this layout? This can not be undone.' +
        '</div>' +
      '<% } else { %>' +
        '<div class="portalMessage error">' +
          '<strong>Warning</strong>' +
          'Are you certain you want to delete this layout? This can not be undone. ' +
          '<% if(existing.length > 0) { %>' +
            'There are currently <%- existing.length %> items assigned to this layout. ' +
          '<% } %>' +
          'You need to provide a replacement layout for the existing items in order to ' +
          'delete this for items currently assigned to this.' +
        '</div>' +
        '<div class="form-group field">' +
          '<label for="layoutField">Replacement Layout</label>' +
          '<select name="layout" class="form-control" id="layoutField">' +
            '<% _.each(available_layouts.concat(user_layouts), function(l){ %>' +
              '<% if(l.path !== layout.path){ %>' +
                '<option value="<%- l.path %>"><%- l.title %></option>' +
              '<% } %>' +
            '<% }); %>' +
          '</select>' +
        '</div>' +
      '<% } %>' +
    '</div>' +
    '<div class="buttons">' +
      '<button class="plone-btn plone-btn-danger delete">Yes, delete</button>' +
      '<button class="plone-btn plone-btn-default cancel">No</button>' +
    '</div>' +
  '</div>');

  /**
   * Called upon full initialization (that is: when all tiles have
   * been loaded).
   * @id jQuery.mosaic.initialized
   */
  $.mosaic.initialized = function () {
    if ($.mosaic.loaded) {
      return;
    }
    $.mosaic.loaded = true;

    // Take first snapshot
    $.mosaic.undo.snapshot();
  };

  /**
   * Initialize the Mosaic
   *
   * @id jQuery.mosaic.init
   * @param {Object} options Options used to initialize the UI
   */
  $.mosaic.init = function (options) {
    options = $.extend({
      url: window.document.location.href,
      type: '',
      ignore_context: false
    }, options);

    // Set document
    $.mosaic.document = window.document;

    // Local variables
    var match;

    // Initialize modules
    $.mosaic.initActions();

    // Get the url of the page
    match = options.url.match(/^([\w#!:.?+=&%@!\-\/]+)\/edit$/);
    if (match) {
      options.url = match[1];
    }

    // Chop add
    match = options.url
      .match(/^([\w#:.?=%@!\-\/]+)\/\+\+add\+\+([\w#!:.?+=&%@!\-\/]+)$/);
    if (match) {
      options.url = match[1];
      options.type = match[2];
      options.ignore_context = true;
    }

    // Add global options
    $.mosaic.options = options.data;
    $.mosaic.options.url = options.url;
    $.mosaic.options.ignore_context = options.ignore_context;
    $.mosaic.options.tileheadelements = [];
    $.mosaic.hasContentLayout = true;

    var contentLayout = $.mosaic.getSelectedContentLayout();
    if(contentLayout){
      $.mosaic.applyLayout(contentLayout);
    }else{
      var contentRaw = $($.mosaic.options.customContentLayout_field_selector).val();
      if(!contentRaw){
        $.mosaic.selectLayout(true);
      }else{
        var $content = $.mosaic.getDomTreeFromHtml(contentRaw);
        if($content.attr('id') === "no-layout"){
          $.mosaic.selectLayout(true);
        }else{
          $('body').addClass('mosaic-layout-customized');
          $.mosaic.hasContentLayout = false;
          $.mosaic._init($content);
        }

        // XXX There is a case where you can have an extraneous mid-edit tile
        var $helper = $('.mosaic-helper-tile-new');
        if($helper.length > 0){
          $helper.parents('.mosaic-grid-row').remove();
        }
      }
    }
  };

  $.mosaic.getSelectedContentLayout = function(){
    return $($.mosaic.options.contentLayout_field_selector).val();
  };

  $.mosaic.setSelectedContentLayout = function(value){
    if(value){
      $.mosaic.hasContentLayout = true;
      // Need to hide these buttons when not in custom content layout mode
      $('.mosaic-toolbar-secondary-functions', $.mosaic.document).hide();
      $('body').removeClass('mosaic-layout-customized');
    }else{
      $('body').addClass('mosaic-layout-customized');
      $.mosaic.hasContentLayout = false;
    }
    return $($.mosaic.options.contentLayout_field_selector).attr('value', value);
  };


  $.mosaic._initPanels = function ($content){
    $.mosaic.options.layout = $content.attr('data-layout');

    // Drop panels within panels (only the top level panels are editable)
    $('[data-panel] [data-panel]', $.mosaic.document)
      .removeAttr('data-panel');

    $content.find("[data-panel]").each(function () {
      var panel = new Panel(this);
      panel.initialize($content);
    });
    // Pre-fill new panels from the layout
    $("[data-panel]", $.mosaic.document).each(function () {
      var panel = new Panel(this);
      panel.prefill();
    });

    // Init app tiles
    $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);

    $.mosaic.options.panels.find("[data-tile]").each(function () {
      if(Tile.validTile(this)){
        var tile = new Tile($(this).parent());
        tile.initializeContent();
      }
    });
  };

  $.mosaic._init = function (content) {

    $.mosaic._initPanels(content);

    // Init overlay
    $('.mosaic-original-content', $.mosaic.document).mosaicOverlay();

    // Add toolbar div below menu
    $("body").prepend($(document.createElement("div"))
      .addClass("mosaic-toolbar")
    );

    // Add the toolbar to the options
    $.mosaic.options.toolbar = $(".mosaic-toolbar");

    // Init toolbar
    $.mosaic.options.toolbar.mosaicToolbar();

    // Init layout
    $.mosaic.options.panels.mosaicLayout();

    // Add blur to the rest of the content
    $("*", $.mosaic.document).each(function () {

      // Local variables
      var obj;

      obj = $(this);

      // Check if block element
      if (obj.css('display') === 'block') {

        // Check if panel or toolbar
        if (!obj.hasClass('mosaic-panel') &&
          !obj.hasClass('mosaic-toolbar') &&
          !obj.hasClass('mosaic-notifications') &&
          !obj.hasClass('mosaic-modal-wrapper') &&
          obj.attr('id') !== 'edit-zone') {

          // Check if inside panel or toolbar
          if (obj.parents('.mosaic-panel, .mosaic-toolbar')
            .length === 0) {

            // Check if parent of a panel or toolbar
            if (obj.find('.mosaic-panel, .mosaic-toolbar')
              .length === 0) {

              // Check if parent has a child who is a
              // panel or a toolbar
              if (obj.parent()
                .find('.mosaic-panel, .mosaic-toolbar')
                .length !== 0) {

                // Add blur class
                obj.addClass('mosaic-blur');
              }
            }
          }
        }
      }
    });

    // Init upload
    // $.mosaic.initUpload();
    $.mosaic.undo.init();

    $('body').addClass('mosaic-enabled');

    $.mosaic.initialized();
  };

  $.mosaic.applyLayout = function(layoutPath, callback){
    if(callback === undefined){
      callback = function(){};
    }
    utils.loading.show();
    $.ajax({
      url: $.mosaic.options.context_url + '/' + layoutPath
    }).done(function(layoutHtml){
      var $content = $.mosaic.getDomTreeFromHtml(layoutHtml);
      $.mosaic.setSelectedContentLayout(layoutPath);
      if($.mosaic.loaded){
        // initialize panels
        $.mosaic._initPanels($content);
        // and setup layout for the new panels
        $.mosaic.options.panels.mosaicLayout();
      }else{
        $.mosaic._init($content);
      }
    }).fail(function(xhr, type, status){
      // use backup layout
      if(status === 'Not Found'){
        window.alert('Specified layout can not be found. Loading default layout.');
      }else{
        window.alert('Error loading layout specified for this content. Falling back to basic layout.');
      }
      $.mosaic.applyLayout('++contentlayout++default/basic.html');
    }).always(function(){
      utils.loading.hide();
    });
  };

  var _hasCustomLayouts = function(){
    if($.mosaic.options.user_layouts.length > 0){
      return true;
    }
    return _.filter($.mosaic.options.available_layouts, function(layout){
      return layout.path.indexOf('custom/') !== -1;
    }).length > 0;
  };

  $.mosaic._deleteLayout = function(layout, existing, callback){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.deleteLayoutTemplate($.extend({}, true, {
        existing: existing,
        layout: layout,
        selected: $.mosaic.getSelectedContentLayout() === '++contentlayout++' + layout.path
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });

    modal.on('shown', function() {
      $('button.delete:visible', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        utils.loading.show();
        var replacement = $('#layoutField', modal.$modal).val();
        $.ajax({
          url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
          data: {
            action: 'deletelayout',
            layout: layout.path,
            replacement: replacement,
            _authenticator: utils.getAuthenticator()
          }
        }).done(function(data){
          modal.hide();
          callback(data);
          if(replacement && $.mosaic.getSelectedContentLayout() === '++contentlayout++' + layout.path){
            $.mosaic.applyLayout('++contentlayout++' + replacement);
          }
        }).fail(function(){
          window.alert('Error deleting layout');
        }).always(function(){
          utils.loading.hide();
        });
      });
      $('button.cancel:visible', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        modal.hide();
      });
    });
    modal.show();
  };

  $.mosaic.deleteLayout = function(layout, callback){
    utils.loading.show();
    $.ajax({
      url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
      data: {
        action: 'existing',
        layout: layout.path
      }
    }).done(function(data){
      $.mosaic._deleteLayout(layout, data.data, callback);
    }).fail(function(){
      window.alert('Error loading data for existing assignments');
    }).always(function(){
      utils.loading.hide();
    });
  };

  $.mosaic.manageCustomLayouts = function(){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.manageLayoutsTemplate($.extend({}, true, {

      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });

    modal.on('shown', function() {
      $('.delete-layout', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        var layout_id = $(this).attr('data-layout');
        _.each($.mosaic.options.available_layouts.concat($.mosaic.options.user_layouts), function(l){
          if(l.path === layout_id){
            return $.mosaic.deleteLayout(l, function(data){
              // callback for when the delete is complete and we need to reload data...
              // reload it...
              $.mosaic.options.available_layouts = data.available_layouts;
              $.mosaic.options.user_layouts = data.user_layouts;
              modal.hide();
              $.mosaic.manageCustomLayouts();
            });
          }
        });
      });
    });
    modal.show();
  };


  $.mosaic.selectLayout = function(initial){
    if(initial !== undefined && initial){
      // check if there is only 1 available layout and auto select
      // if that is the case.
      if($.mosaic.options.available_layouts.length === 1){
        var layout = $.mosaic.options.available_layouts[0];
        var layoutPath = '++contentlayout++' + layout.directory + '/' + layout.file;
        $.mosaic.applyLayout(layoutPath);
        return;
      }
    }
    if($.mosaic.options.available_layouts.length === 0){
      // use backup layout
      $.mosaic.applyLayout('++contentlayout++default/basic.html');
      return;
    }
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.selectLayoutTemplate($.extend({}, true, {
        hasCustomLayouts: _hasCustomLayouts()
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });
    modal.on('shown', function() {
      $('.manage-custom-layouts a', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        modal.hide();
        $.mosaic.manageCustomLayouts();
      });
      $('li a', modal.$modal).off('click').on('click', function(e){
        e.preventDefault();
        var layout;
        var layout_id = $(this).attr('data-value');
        _.each($.mosaic.options.available_layouts.concat($.mosaic.options.user_layouts), function(l){
          if(l.path === layout_id){
            layout = l;
          }
        });
        var layoutPath = '++contentlayout++' + layout.path;
        modal.hide();
        $.mosaic.applyLayout(layoutPath);
      });
    });
    modal.show();
  };

  $.mosaic.saveLayout = function(initial){
    var $el = $('<div/>').appendTo('body');
    var modal = new Modal($el, {
      html: $.mosaic.saveLayoutTemplate($.extend({}, true, {
        hasCustomLayouts: _hasCustomLayouts()
      }, $.mosaic.options)),
      content: null,
      buttons: '.plone-btn'
    });
    modal.on('shown', function() {
      $('.plone-btn:visible', modal.$modal).off('click').on('click', function(e){
        utils.loading.show();
        e.preventDefault();
        var globalLayout = 'false';
        if($('#globalLayout', modal.$modal)[0].checked){
          globalLayout = 'true';
        }
        $.ajax({
          url: $('body').attr('data-base-url') + '/@@manage-layouts-from-editor',
          method: 'POST',
          data: {
            action: 'save',
            _authenticator: utils.getAuthenticator(),
            global: globalLayout,
            name: $('#layoutNameField', modal.$modal).val(),
            layout: $.mosaic.getPageContent()
          }
        }).done(function(result){
          if(result.success){
            $.mosaic.options.available_layouts = result.available_layouts;
            $.mosaic.options.user_layouts = result.user_layouts;
            $.mosaic.applyLayout(result.layout);
          }
        }).fail(function(){
          window.alert('Error saving layout');
        }).always(function(){
          utils.loading.hide();
          modal.hide();
        });
      });
    });
    modal.show();
  };

  /**
   * Get the dom tree of the specified content
   *
   * @id jQuery.mosaic.getDomTreeFromHtml
   * @param {String} content Html content
   * @return {Object} Dom tree of the html
   */
  $.mosaic.getDomTreeFromHtml = function (content) {

    // Remove doctype and replace html, head and body tag since the are
    // stripped when converting to jQuery object
    content = content.replace(/<!DOCTYPE[\w\s\- .\/\":]+>/, '');
    content = content.replace(/<html>/, "<div class=\"temp_html_tag\">");
    content = content.replace(/<\/html>/, "</div>");
    content = content.replace(/<html\s/, "<div class=\"temp_html_tag\" ");
    content = content.replace(/<\/html\s/, "</div ");
    content = content.replace(/<head>/, "<div class=\"temp_head_tag\">");
    content = content.replace(/<\/head>/, "</div>");
    content = content.replace(/<head\s/, "<div class=\"temp_head_tag\" ");
    content = content.replace(/<\/head\s/, "</div ");
    content = content.replace(/<body>/, "<div class=\"temp_body_tag\">");
    content = content.replace(/<\/body>/, "</div>");
    content = content.replace(/<body\s/, "<div class=\"temp_body_tag\" ");
    content = content.replace(/<\/body\s/, "</div ");
    return $($(content)[0]);
  };

  /**
   * Remove head tags based on tile url
   *
   * @id jQuery.mosaic.removeHeadTags
   * @param {String} url Url of the tile
   */
  $.mosaic.removeHeadTags = function (url) {
    if(!url){
      return;
    }

    // Local variables
    var tile_type_id, html_id, headelements, i;

    // Calc delete url
    url = url.split('?')[0];
    url = url.split('@@');
    tile_type_id = url[1].split('/');
    url = url[0] + '@@delete-tile?type=' + tile_type_id[0] + '&id=' +
      tile_type_id[1] + '&confirm=true';
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];

    // Remove head elements
    headelements = $.mosaic.options.tileheadelements[html_id];
    if(headelements){
      for (i = 0; i < headelements.length; i += 1) {
        $(headelements[i], $.mosaic.document).remove();
      }
    }
    $.mosaic.options.tileheadelements[html_id] = [];
  };

  /**
   * Add head tags based on tile url and dom
   *
   * @id jQuery.mosaic.addHeadTags
   * @param {String} url Url of the tile
   * @param {Object} dom Dom object of the tile
   */
  $.mosaic.addHeadTags = function (url, dom) {

    // Local variables
    var tile_type_id, html_id;

    // Calc url
    url = url.split('?')[0];
    url = url.split('@@');
    tile_type_id = url[1].split('/');
    html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];
    $.mosaic.options.tileheadelements[html_id] = [];

    // Get head items
    dom.find(".temp_head_tag").children().each(function () {

      // Add element
      $.mosaic.options.tileheadelements[html_id].push(this);

      // Add head elements
      $('head', $.mosaic.document).append(this);
    });
  };
});

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


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

define('mosaic-url/mosaic.upload',[
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

/**
 * This plugin is used to set an element to be editable.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2011 Plone Foundation
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
immed: true, strict: true, maxlen: 100, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.editor',[
  'jquery'
], function($) {
  'use strict';

  // Define mosaic namespace if it doesn't exist
  if (typeof($.mosaic) === "undefined") {
    $.mosaic = {};
  }

  // Define the editor namespace
  $.mosaic.editor = {
  };

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
});

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

define('mosaic-url/mosaic.undo',[
  'jquery',
], function($) {
  'use strict';

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
});
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

/* global window: false */
/*jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define('mosaic-url/mosaic.overlay',[
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

    if (typeof($.mosaic.overlay_hide_fields) === "undefined") {
      $.mosaic.overlay_hide_fields = true;
    }

    // Loop through matched elements
    return this.each(function () {

      // Get current object
      var $el = $(this);
      $(document.body, $.mosaic.document).append($el);

      // Init overlay
      $el.addClass("mosaic-overlay");
      var $wrapper = $('<div class="mosaic-modal-wrapper" />');
      $el.wrap($wrapper);

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
    var form, formtabs, tile_group, x, visible_tabs,
      field_tile, field, fieldset;

    // Expand the overlay
    $('.mosaic-modal-wrapper').show().addClass('active');
    $('.mosaic-overlay-blocker').show();
    $('body').addClass('plone-modal-open');

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

    if (mode === 'all' && $.mosaic.overlay_hide_fields) {

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
      form.find($.mosaic.options.customContentLayout_selector).addClass('mosaic-hidden');
      form.find($.mosaic.options.contentLayout_selector).addClass('mosaic-hidden');

      // Hide title and description
      if($('.mosaic-IDublinCore-title-tile').size() > 0){
        form.find('#formfield-form-widgets-IDublinCore-title')
          .addClass('mosaic-hidden');
      }else{
        form.find('#formfield-form-widgets-IDublinCore-title')
          .removeClass('mosaic-hidden');
      }
      if($('.mosaic-IDublinCore-description-tile').size() > 0){
        form.find('#formfield-form-widgets-IDublinCore-description')
          .addClass('mosaic-hidden');
      }else{
        form.find('#formfield-form-widgets-IDublinCore-description')
          .removeClass('mosaic-hidden');
      }

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
      var $fieldset = form.find('#fieldset-' +
          visible_tabs.eq(0).attr('href').split('-')[1]);
      if($fieldset.size() === 0){
          $fieldset = form.find(
              'fieldset:not(.mosaic-hidden)').eq(0);
      }
      $fieldset.addClass('active');
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
    $('.mosaic-modal-wrapper').hide().removeClass('active');
    $('.mosaic-overlay-blocker').hide();
    $('body').removeClass('plone-modal-open');
  };
});

/* Layout Mosaic pattern.
 *
 * Options:
 *
 * Documentation:
 *
 * License:
 *    Copyright (C) 2014 Plone Foundation
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
window.DEBUG = true;
require([
  'jquery',
  'mockup-patterns-base',
  'mosaic-url/mosaic.core',
  'mosaic-url/mosaic.layout',
  'mosaic-url/mosaic.toolbar',
  'mosaic-url/mosaic.actions',
  'mosaic-url/mosaic.upload',
  'mosaic-url/mosaic.editor',
  'mosaic-url/mosaic.undo',
  'mosaic-url/mosaic.overlay',
], function($, Base) {
  'use strict';

  var Layout = Base.extend({
    name: 'layout',
    trigger: '.pat-layout',
    parser: 'mockup',
    defaults: {
      attribute: 'class'
    },
    init: function() {
      var self = this;
      self.options.data.$el = self.$el;
      $.mosaic.init({'data': self.options.data});
    }
  });

  return Layout;
});
define("/Users/nathan/code/coredev5/src/plone.app.mosaic/src/plone/app/mosaic/browser/static/js/mosaic.pattern.js", function(){});

