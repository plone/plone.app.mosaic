
define([
  'expect',
  'jquery',
  'mockup-registry',
  'pattern-mosaic'
], function(expect, $, Registry, Layout) {
  'use strict';

  window.mocha.setup('bdd');
  $.fx.off = true;

  /* ==========================
   TEST: Layout Mosaic
  ========================== */

  describe('Layout', function () {
    beforeEach(function() {
      this.$el = $('' +
        '<input class="pat-layout"/>').appendTo('body');
    });
    afterEach(function() {
      this.$el.remove();
    });
    it('custom className', function() {
      this.$el.attr('data-pat-layout', 'className:SOMETHING');
      Registry.scan(this.$el);
      expect(this.$el.hasClass('SOMETHING')).to.equal(true);
    });
  });

});
