// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";
import logging from "@patternslib/patternslib/src/core/logging";

const log = logging.getLogger("pat-mosaic/overlay");

export default class Overlay {
    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
    }

    initialize() {
        var self = this;
        var originalContent = document.querySelector(".mosaic-original-content");
        // we don't want to show the original el.
        originalContent.style.display = "none";

        self.modal = new Modal(originalContent, {
            content: "#content-core",
            modalSizeClass: "modal-xl",
        });
        self.modal.init();
    }

    open (mode, tile_config) {
        // Local variables
        var self = this;

        // setup visibility of fields before showing modal
        self.modal.on("after-render", function() {
            self.setup_visibility(mode, tile_config);
        });

        // show modal
        self.modal.show();
    }

    setup_visibility(mode, tile_config) {
        var self = this;
        var modalContent = self.modal.$modalContent;

        if (mode === "all" && self.options.overlay_hide_fields) {
            // Get form tabs
            var formtabs = modalContent.find("nav");

            // Show form tabs
            formtabs.removeClass("mosaic-hidden");

            // Show all fields
            modalContent.find("fieldset").children().removeClass("mosaic-hidden");

            // Hide all fieldsets
            modalContent.find("fieldset").removeClass("active");

            // Deselect all tabs
            formtabs.find("a").removeClass("active");

            // Hide layout field
            modalContent.find(self.options.customContentLayout_selector).addClass("mosaic-hidden");
            modalContent.find(self.options.contentLayout_selector).addClass("mosaic-hidden");

            // Hide title and description
            modalContent.find("#formfield-form-widgets-IDublinCore-title").toggleClass(
                "mosaic-hidden",
                $(".mosaic-IDublinCore-title-tile").length > 0
            );
            modalContent.find("#formfield-form-widgets-IDublinCore-description").toggleClass(
                "mosaic-hidden",
                $(".mosaic-IDublinCore-description-tile").length > 0
            );

            // Hide field which are on the wysiwyg area
            for (const tg of self.options.tiles) {
                if (tg.name === "fields") {
                    for (const field_tile of tg.tiles) {
                        if (
                            self.panels.find(
                                ".mosaic-" + field_tile.name + "-tile"
                            ).length !== 0
                        ) {
                            log.info(`Hide field.tile #${field_tile.id}`);
                            $(`#${field_tile.id}`, modalContent).addClass("mosaic-hidden");
                        }
                    }
                }
            }

            // Hide tab if fieldset has no visible items
            modalContent.find("fieldset").each(function () {
                if ($(this).children("div:not(.mosaic-hidden)").length === 0) {
                    $(
                        "a[href=#fieldsetlegend-" + $(this).attr("id").split("-")[1] + "]"
                    ).addClass("mosaic-hidden");
                }
            });

            // Get visible tabs
            var visible_tabs = formtabs.children(":not(.mosaic-hidden)");

            // Select first tab
            visible_tabs.eq(0).addClass("active");
            var $fieldset = modalContent.find(
                "#fieldset-" + visible_tabs.eq(0).attr("href").split("-")[1]
            );
            if ($fieldset.length === 0) {
                $fieldset = modalContent.find("fieldset:not(.mosaic-hidden)").eq(0);
            }
            $fieldset.addClass("active");
        } else if (mode === "field") {
            // Get fieldset and field
            var field = $("#" + tile_config.id);
            var fieldset = field.parents("fieldset");

            // Hide all fieldsets
            modalContent.find("fieldset").removeClass("active");

            // Show current fieldset
            fieldset.addClass("active");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            modalContent.find("nav").addClass("mosaic-hidden");
        }
    }

}
