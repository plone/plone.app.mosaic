import $ from "jquery";

/* Panel class */
class Panel {
    constructor(el) {
        this.$el = $(el);
    }
    initialize($content) {
        // Local variables
        var panel_id = this.$el.data("panel"),
            panel_attr_id,
            $panel_markup,
            target = $("[data-panel=" + panel_id + "]"),
            max_columns = this.$el.data("max-columns") || 6;

        // Implicitly initialize required panels with id matching element
        if (panel_id === "content" && target.length === 0) {
            $("#" + panel_id).each(function () {
                target = $(this);
                target.attr("data-panel", panel_id);
            });
        }

        // If content, create a new div since the form data is in
        // this panel
        if (panel_id === "content") {
            panel_attr_id = target.attr("id");
            $panel_markup = $(document.createElement("div"))
                .attr("id", panel_attr_id)
                .attr("class", target.attr("class"))
                .addClass("mosaic-panel")
                .attr("data-panel", "content")
                .attr("data-max-columns", max_columns)
                .html($content.find("[data-panel=" + panel_id + "]").html());
            if ($(".mosaic-original-content").length === 0) {
                target.before($panel_markup);
                target
                    .removeAttr("data-panel")
                    .removeAttr("id")
                    .addClass("mosaic-original-content disable-patterns");
            } else {
                // re-initializing, so we just have to replace existing
                target.replaceWith($panel_markup);
            }
            // hide original edit form
            target.hide();
        } else {
            target.attr(
                "class",
                $content.find(`[data-panel="${panel_id}"]`).attr("class"),
            );
            target.addClass("mosaic-panel");
            target.html($content.find("[data-panel=" + panel_id + "]").html());
        }
    }
    prefill() {
        if (!this.$el.hasClass("mosaic-panel")) {
            $(this).addClass("mosaic-panel");
            $(this)
                .children()
                .wrap(
                    $(
                        '<div class="mosaic-grid-row">' +
                            '<div class="mosaic-grid-cell col-12">' +
                            '<div class="movable removable copyable mosaic-tile mosaic-text-tile">' +
                            '<div class="mosaic-tile-content">' +
                            "</div>" +
                            "</div>" +
                            "</div>" +
                            "</div>",
                    ),
                );
        }
    }
}

export default Panel;
