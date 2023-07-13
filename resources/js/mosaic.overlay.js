// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";

export default class Overlay {
    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
        this.original_content = document.querySelector(".mosaic-original-content");
        this.$el = $(this.original_content);
    }

    properties_edit_url() {
        const edit_url = window.location.href.split("?");
        return `${edit_url[0]}?ajax_load=${new Date().getTime()}${
            edit_url.length > 1 ? "&" + edit_url[1] : ""
        }`;
    }

    initialize() {
        const self = this;
        this.modal = new Modal(".mosaic-original-content", {
            ajaxUrl: self.properties_edit_url(),
            content: "#content-core",
            modalSizeClass: "modal-xl",
            position: "center top",
            actionOptions: {
                isForm: true,
                displayInModal: false,
                reloadWindowOnClose: false,
            },
        });
        this.modal.init();
    }

    open(mode, tile_config) {
        // setup visibility of fields before showing modal
        this.modal.on("after-render", (e) => {
            this.setup_visibility(mode, tile_config);
            this.sync_changes();
        });
        // show modal
        this.modal.show();
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

            // Hide field which are on the wysiwyg area
            for (const tg of self.options.tiles) {
                if (tg.name === "fields") {
                    for (const field_tile of tg.tiles) {
                        if (
                            self.panels.find(`.mosaic-${field_tile.name}-tile`)
                                .length === 0
                        ) {
                            continue;
                        }
                        $(`#${field_tile.id}`, modalContent).addClass("mosaic-hidden");
                    }
                }
            }

            // hide fieldsets which only has hidden fields
            for (fieldset of modalContent.find("fieldset")) {
                if (
                    fieldset.querySelectorAll(".field:not(.mosaic-hidden)").length === 0
                ) {
                    fieldset.classList.remove("active");
                }
            }
        } else if (mode === "field") {
            // Get fieldset and field
            var field = $("#" + tile_config.id, modalContent);
            var fieldset = field.parents("fieldset");

            // Hide all fieldsets
            modalContent
                .find("fieldset")
                .removeClass("active")
                .addClass("mosaic-hidden");
            modalContent.find("form").removeClass("pat-autotoc");

            // Show current fieldset
            fieldset.addClass("active").removeClass("mosaic-hidden");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            modalContent.find("nav").addClass("mosaic-hidden");
        }
    }

    sync_changes() {
        this.modal.$modalContent.find("input,select,textarea").on("change", (e) => {
            var source_name = e.target.name;
            var target_el = document.querySelector(
                `.mosaic-original-content [name="${source_name}"]`,
            );
            // sync value
            target_el.value = e.target.value;
            // and possible checkbox state
            target_el.checked = e.target.checked;
        });
    }
}
