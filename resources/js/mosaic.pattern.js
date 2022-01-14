// Layout Mosaic pattern.
import "regenerator-runtime/runtime"; // needed for ``await`` support
import Base from "@patternslib/patternslib/src/core/base";
import Parser from "@patternslib/patternslib/src/core/parser";

export const parser = new Parser("layout");
parser.addArgument("attribute", "class");

export default Base.extend({
    name: "layout",
    trigger: ".pat-layout",

    async init() {
        this.options = parser.parse(this.el);

        const $ = (await import("jquery")).default;
        (await import("./mosaic.core")).default;
        (await import("./mosaic.layout")).default;
        (await import("./mosaic.toolbar")).default;
        (await import("./mosaic.actions")).default;
        (await import("./mosaic.editor")).default;
        (await import("./mosaic.overlay")).default;

        var self = this;
        self.options.data.$el = self.$el;
        $.mosaic.init({
            data: {
                attribute: this.options.attribute,
                $el: this.$el,
            },
        });
    },
});
