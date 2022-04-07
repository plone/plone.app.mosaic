// This plugin is used to display an overlay
import $ from "jquery";
import "bootstrap";

export default class Overlay {
    constructor(options, panels) {
        this.options = options;
        this.panels = panels;
    }

    initialize() {
        var self = this;
        var $el = $(".mosaic-original-content");
        var $form = $("form", $el);
        var $h1 = $("h1", $el);

        // Init overlay
        var $modalStructure = $(
            '<div class="modal fade" id="mosaic-original-content-modal">' +
                '<div class="modal-dialog modal-xl">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
                        '<div class="modal-body"></div>' +
                        '<div class="modal-footer">' +
                            '<div class="pattern-modal-buttons"></div>' +
                        "</div>" +
                    "</div>" +
                "</div>" +
            "</div>"
        );

        // Destroy possible TinyMCE patterns before DOM move
        $(".pat-tinymce", $form).each(function () {
            if ($(this).data("pattern-tinymce")) {
                try {
                    $(this).data("pattern-tinymce").destroy();
                } catch (e) {
                    // ignore.
                }
            }
        });

        $(".modal-header", $modalStructure).prepend("<h2 class='modal-title'>" + $h1.text() + "</h2>");
        $(".modal-body", $modalStructure).append($form);
        $(document.body).append($modalStructure);
        self.$overlay = $modalStructure;
        self.modal = new bootstrap.Modal(document.getElementById('mosaic-original-content-modal'), {});

        // Re-initialize possible TinyMCE patterns after DOM move
        $(".pat-tinymce", $form).each(function () {
            if ($(this).data("pattern-tinymce")) {
                try {
                    $(this).data("pattern-tinymce").init();
                } catch (e) {
                    // ignore.
                }
            }
        });
        try {
            $(".pat-textareamimetypeselector").trigger("change");
        } catch (e) {
            // ignore.
        }

        // we don't want to show the original el.
        $el.hide();
    }

    open (mode, tile_config) {
        // Local variables
        var self = this;
        var form, formtabs, tile_group, x, visible_tabs, field_tile, field, fieldset;

        // Expand the overlay
        self.modal.show();

        // Get form
        form = self.$overlay.find("form");

        // Clear actions
        if ($(".mosaic-overlay-ok-button").length === 0) {
            $(".mosaic-overlay .formControls").children("button").hide();
            $(".mosaic-overlay .pattern-modal-buttons").append(
                $(document.createElement("input"))
                    .attr({
                        type: "button",
                        value: "Done",
                    })
                    .addClass("mosaic-overlay-ok-button plone-btn plone-btn-primary")
                    .on("click", function () {
                        self.modal.close();
                    })
            );

            $(".mosaic-overlay .modal-header h2").html("Properties");
        }

        if (mode === "all" && self.options.overlay_hide_fields) {
            // Get form tabs
            formtabs = form.find("nav");

            // Show form tabs
            formtabs.removeClass("mosaic-hidden");

            // Show all fields
            form.find("fieldset").children().removeClass("mosaic-hidden");

            // Hide all fieldsets
            form.find("fieldset").removeClass("active");

            // Deselect all tabs
            formtabs.find("a").removeClass("active");

            // Hide layout field
            form.find(self.options.customContentLayout_selector).addClass(
                "mosaic-hidden"
            );
            form.find(self.options.contentLayout_selector).addClass("mosaic-hidden");

            // Hide title and description
            if ($(".mosaic-IDublinCore-title-tile").length > 0) {
                form.find("#formfield-form-widgets-IDublinCore-title").addClass(
                    "mosaic-hidden"
                );
            } else {
                form.find("#formfield-form-widgets-IDublinCore-title").removeClass(
                    "mosaic-hidden"
                );
            }
            if ($(".mosaic-IDublinCore-description-tile").length > 0) {
                form.find("#formfield-form-widgets-IDublinCore-description").addClass(
                    "mosaic-hidden"
                );
            } else {
                form.find("#formfield-form-widgets-IDublinCore-description").removeClass(
                    "mosaic-hidden"
                );
            }

            // Hide field which are on the wysiwyg area
            for (x = 0; x < self.options.tiles.length; x += 1) {
                if (self.options.tiles[x].name === "fields") {
                    tile_group = self.options.tiles[x];
                }
            }
            for (x = 0; x < tile_group.tiles.length; x += 1) {
                field_tile = tile_group.tiles[x];
                if (
                    self.panels.find(".mosaic-" + field_tile.name + "-tile")
                        .length !== 0
                ) {
                    $("#" + field_tile.id).addClass(
                        "mosaic-hidden"
                    );
                }
            }

            // Hide tab if fieldset has no visible items
            form.find("fieldset").each(function () {
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
            var $fieldset = form.find(
                "#fieldset-" + visible_tabs.eq(0).attr("href").split("-")[1]
            );
            if ($fieldset.length === 0) {
                $fieldset = form.find("fieldset:not(.mosaic-hidden)").eq(0);
            }
            $fieldset.addClass("active");
        } else if (mode === "field") {
            // Get fieldset and field
            field = $("#" + tile_config.id);
            fieldset = field.parents("fieldset");

            // Hide all fieldsets
            form.find("fieldset").removeClass("active");

            // Show current fieldset
            fieldset.addClass("active");

            // Hide all fields in current fieldset
            fieldset.children().addClass("mosaic-hidden");

            // Show current field
            field.removeClass("mosaic-hidden");

            // Hide form tabs
            form.find("nav").addClass("mosaic-hidden");
        }
    }

}
