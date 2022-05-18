// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";

export default class Overlay {
    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
    }

    initialize() {
        var self = this;
        var $el = $(".mosaic-original-content");
        self.form = $("form", $el);

        // we don't want to show the original el.
        $el.hide();

        self.modal = new Modal($(".outer-wrapper"), {
            title: $("h1", $el).text(),
            target: ".mosaic-original-content form",
            modalSizeClass: "modal-xl",
        });
    }

    open (mode, tile_config) {
        // Local variables
        var self = this;
        var formtabs, tile_group, visible_tabs, field, fieldset;

        // Expand the overlay
        self.modal.show();

        if (mode === "all" && self.options.overlay_hide_fields) {
            // Get form tabs
            formtabs = self.form.find("nav");

            // Show form tabs
            formtabs.removeClass("mosaic-hidden");

            // Show all fields
            self.form.find("fieldset").children().removeClass("mosaic-hidden");

            // Hide all fieldsets
            self.form.find("fieldset").removeClass("active");

            // Deselect all tabs
            formtabs.find("a").removeClass("active");

            // Hide layout field
            self.form.find(self.options.customContentLayout_selector).addClass("mosaic-hidden");
            self.form.find(self.options.contentLayout_selector).addClass("mosaic-hidden");

            // Hide title and description
            if ($(".mosaic-IDublinCore-title-tile").length > 0) {
                self.form.find("#formfield-form-widgets-IDublinCore-title").addClass(
                    "mosaic-hidden"
                );
            } else {
                self.form.find("#formfield-form-widgets-IDublinCore-title").removeClass(
                    "mosaic-hidden"
                );
            }
            if ($(".mosaic-IDublinCore-description-tile").length > 0) {
                self.form.find("#formfield-form-widgets-IDublinCore-description").addClass(
                    "mosaic-hidden"
                );
            } else {
                self.form.find("#formfield-form-widgets-IDublinCore-description").removeClass(
                    "mosaic-hidden"
                );
            }

            // Hide field which are on the wysiwyg area
            var tile_group = {};
            for (const tg of self.options.tiles) {
                if (tg.name === "fields") {
                    tile_group = tg;
                    break;
                }
            }
            for (const field_tile of tile_group.tiles) {
                if (
                    self.panels.find(
                        ".mosaic-" + field_tile.name + "-tile"
                    ).length !== 0
                ) {
                    $("#" + field_tile.id).addClass("mosaic-hidden");
                }
            }

            // Hide tab if fieldset has no visible items
            self.form.find("fieldset").each(function () {
                if ($(this).children("div:not(.mosaic-hidden)").length === 0) {
                    $(
                        "a[href=#fieldsetlegend-" + $(this).attr("id").split("-")[1] + "]"
                    ).addClass("mosaic-hidden");
                }
            });

            // Get visible tabs
            visible_tabs = formtabs.children(":not(.mosaic-hidden)");

            // Select first tab
            visible_tabs.eq(0).addClass("active");
            var $fieldset = self.form.find(
                "#fieldset-" + visible_tabs.eq(0).attr("href").split("-")[1]
            );
            if ($fieldset.length === 0) {
                $fieldset = self.form.find("fieldset:not(.mosaic-hidden)").eq(0);
            }
            $fieldset.addClass("active");
        } else if (mode === "field") {
            // Get fieldset and field
            field = $("#" + tile_config.id);
            fieldset = field.parents("fieldset");

            // Hide all fieldsets
            self.form.find("fieldset").removeClass("active");

            // Show current fieldset
            fieldset.addClass("active");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            self.form.find("nav").addClass("mosaic-hidden");
        }
    }

}
