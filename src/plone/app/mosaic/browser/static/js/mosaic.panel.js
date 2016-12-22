/* jslint white: true, browser: true, onevar: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 150, maxerr: 9999, quotmark: false */

define([
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
    var panel_id = this.$el.attr("data-panel"), panel_attr_id,
        target = $("[data-panel=" + panel_id + "]", $.mosaic.document),
        max_columns = parseInt(this.$el.attr('data-max-columns'), 10) || 4;

    // Ensure max columns on new panels
    target.attr('data-max-columns', max_columns);

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
      if ($('.mosaic-original-content', $.mosaic.document).length === 0) {
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
            .addClass('mosaic-original-content')
            .hide();
      } else {
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

  return Panel;
});
