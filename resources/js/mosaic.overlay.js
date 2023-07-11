// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";
import logging from "@patternslib/patternslib/src/core/logging";

const log = logging.getLogger("pat-mosaic/overlay");

export default class Overlay {
    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
        this.modal = null;
    }

    ajax_edit_url() {
        const edit_url = window.location.href.split("?");
        return `${edit_url[0]}?ajax_load=${new Date().getTime()}${
            edit_url.length > 1 ? "&" + edit_url[1] : ""
        }`;
    }

    initialize() {
        // we load the original edit form via ajax to get updated content
        // when saving properties
        var self = this;
        self.modal = new Modal(".mosaic-original-content", {
            ajaxUrl: self.ajax_edit_url(),
            content: "#content-core",
            modalSizeClass: "modal-xl",
            position: "center top",
            actionOptions: {
                isForm: true,
                displayInModal: false,
                reloadWindowOnClose: false,
            },
        });
        self.modal.init();
    }

    open(mode, tile_config) {
        var self = this;
        self.modal.on("after-ajax", (e, m) => {
            // make sure 'pat-layout' isn't initialized twice from the loaded edit form
            $(self.options.customContentLayout_selector, m.$raw).addClass(
                "disable-patterns"
            );
        });
        // setup visibility of fields before showing modal
        self.modal.on("after-render", () => {
            self.setup_visibility(mode, tile_config);
        });
        // we have to reload "original" form on page when changing the properties form
        // here in this modal, otherwise we loose the changed data when saving the mosaic page
        const ajax_url_parts = self.ajax_edit_url().split("?");
        self.modal.on("formActionSuccess", (e) => {
            $("#content-core", $(e.target)).load(
                `${ajax_url_parts[0]} #content-core > *`,
                ajax_url_parts[1],
                () => {}
            );
        });
        // show modal
        self.modal.show();
    }

    setup_visibility(mode, tile_config) {
        var self = this;
        var modalContent = self.modal.$modalContent;

        if (mode === "all" && self.options.overlay_hide_fields) {
            // Hide layout field
            modalContent
                .find(self.options.customContentLayout_selector)
                .addClass("mosaic-hidden");
            modalContent
                .find(self.options.contentLayout_selector)
                .addClass("mosaic-hidden");

            // Hide title and description
            modalContent
                .find("#formfield-form-widgets-IDublinCore-title")
                .toggleClass(
                    "mosaic-hidden",
                    $(".mosaic-IDublinCore-title-tile").length > 0
                );
            modalContent
                .find("#formfield-form-widgets-IDublinCore-description")
                .toggleClass(
                    "mosaic-hidden",
                    $(".mosaic-IDublinCore-description-tile").length > 0
                );

            // Hide field which are on the wysiwyg area
            for (const tg of self.options.tiles) {
                if (tg.name === "fields") {
                    for (const field_tile of tg.tiles) {
                        if (
                            self.panels.find(".mosaic-" + field_tile.name + "-tile")
                                .length !== 0
                        ) {
                            $(`#${field_tile.id}`, modalContent).addClass(
                                "mosaic-hidden"
                            );
                        }
                    }
                }
            }
        } else if (mode === "field") {
            // Get fieldset and field
            var field = $("#" + tile_config.id, modalContent);
            var fieldset = field.parents("fieldset");

            // Hide all fieldsets
            modalContent.find("fieldset").removeClass("active").addClass("d-none");
            modalContent.find("form").removeClass("pat-autotoc");

            // Show current fieldset
            fieldset.addClass("active").removeClass("d-none");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            modalContent.find("nav").addClass("mosaic-hidden");
        }
    }
}
