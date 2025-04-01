// This plugin is used to display an overlay
import $ from "jquery";
import Modal from "@plone/mockup/src/pat/modal/modal";

export default class Overlay {
    original_content = null;

    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
        if(!this.original_content) {
            this.original_content = document.querySelector(".mosaic-original-content");
            this.$el = $(this.original_content);
        }
    }

    properties_edit_url() {
        const edit_url = window.location.href.split("?");
        return `${edit_url[0]}?ajax_load=${new Date().getTime()}${
            edit_url.length > 1 ? "&" + edit_url[1] : ""
        }`;
    }

    before_modal_render() {
        // remove the original form inside ".mosaic-original-content #content-core"
        // to fix doubled IDs in DOM which leads to UI problems inside the
        // modal form
        this.$el.find("#content-core > form").remove();
        this.$el.removeClass("properties-reloaded");
    }

    prepare_properties_form() {
        // we have to disable "pat-layout" inside the modal form
        this.modal.$modalContent.find("#fieldset-layout").addClass("disable-patterns");
    }

    load_properties_form() {
        // Load the original form again
        const self = this;
        if(self.$el.hasClass("properties-reloaded")) {
            return;
        }
        self.$el.find("#content-core").load(
            self.properties_edit_url() + " #content-core > form"
        );
        self.$el.addClass("properties-reloaded");
    }

    initialize() {
        const self = this;
        self.modal = new Modal(".mosaic-original-content", {
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
        // override modal initialization
        self.modal.on("before-render", (e) => {
            self.before_modal_render();
        });
        self.modal.on("rendered", (e) => {
            self.prepare_properties_form();
        });
        self.modal.on("hide", (e) => {
            self.load_properties_form();
        })
        self.modal.init();
    }

    open(mode, tile_config) {
        // setup visibility of fields before showing modal
        this.modal.on("after-render", (e) => {
            this.setup_visibility(mode, tile_config);
        });
        this.modal.on("shown", (e) => {
            window.setTimeout(this.setup_tabs.bind(this), 1000);
        });
        // show modal
        this.modal.show();
    }

    setup_visibility(mode, tile_config) {
        var self = this;
        var modalContent = self.modal.$modalContent;

        if (mode === "all" && self.options.overlay_hide_fields) {
            // reset visibility state if we come from field settings back to "all"
            modalContent[0].querySelectorAll(".mosaic-hidden").forEach(
                (el) => el.classList.remove("mosaic-hidden"));

            // Hide layout fields
            modalContent[0].querySelectorAll("#fieldset-layout .field").forEach(
                (el) => el.classList.add("mosaic-hidden"));

            // Hide fields which are on the wysiwyg area
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
            fieldset.find(".field").addClass("mosaic-hidden");
            // Hide legend
            fieldset.find("legend").addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            modalContent.find("nav").addClass("mosaic-hidden");
        }
    }

    setup_tabs() {
        // remove the tab if fieldset only contains hidden fields.
        var self = this;
        const modalContent = self.modal.$modalContent;
        let fieldset_count = 0;

        for (const fieldset of modalContent[0].querySelectorAll("fieldset")) {
            if (
                fieldset.querySelectorAll(".field:not(.mosaic-hidden)").length === 0
            ) {
                const tab = modalContent[0].querySelector(`.autotoc-level-${fieldset_count}`);
                tab?.remove();
            }
            fieldset_count += 1;
        }
    }
}
