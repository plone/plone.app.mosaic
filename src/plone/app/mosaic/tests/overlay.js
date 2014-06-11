$.deco.options = {
    panels: $(document.body),
    tiles: [{
        'name': 'fields',
        'label': 'Fields',
        'tiles': [
            {
                'name': 'title',
                'type': 'field',
                'id': 'title-field'
            },
            {
                'name': 'pony',
                'type': 'app'
            },
            {
                'name': 'text',
                'type': 'structure'
            },
        ]
    }]
};

module("overlay", {
    setup: function () {
        // We'll create a div element for the overlay
        $.deco.options.panels = $(document.body);
        var overlay = $(document.createElement("div"))
            .append($(document.createElement("form"))
                .append($(document.createElement("ul"))
                    .addClass("formTabs")
                    .append($(document.createElement("li"))
                        .addClass("formTab firstFormTab")
                        .append($(document.createElement("a"))
                            .addClass("selected")
                            .attr("href", "#fieldsetlegend-default")
                        )
                    )
                    .append($(document.createElement("li"))
                        .addClass("formTab")
                        .append($(document.createElement("a"))
                            .attr("href", "#fieldsetlegend-1")
                        )
                    )
                    .append($(document.createElement("li"))
                        .addClass("formTab lastFormTab")
                        .append($(document.createElement("a"))
                            .attr("href", "#fieldsetlegend-2")
                        )
                    )
                )
                .append($(document.createElement("fieldset"))
                    .attr("id", "fieldset-default")
                    .append($(document.createElement("div"))
                        .attr("id", "title-field")
                    )
                )
                .append($(document.createElement("fieldset"))
                    .attr("id", "fieldset-1")
                    .append($(document.createElement("div"))
                        .attr("id", "some-field")
                    )
                )
                .append($(document.createElement("fieldset"))
                    .attr("id", "fieldset-2")
                    .append($(document.createElement("div"))
                        .attr("id", "formfield-form-widgets-ILayoutAware-layout")
                    )
                )
                .append($(document.createElement("div"))
                    .addClass("formControls")
                    .append($(document.createElement("input")))
                )
            )
            .attr("id", "content");
        $(document.body).append(overlay);
        $(document.body)
            .append($(document.createElement("div"))
                .addClass("deco-title-tile")
            );
        $.deco.document = document;
        overlay.decoOverlay();
    },
    teardown: function () {
        $("#content").remove();
        $(".deco-overlay-blocker").remove();
        $(".deco-title-tile").remove();
    }
});

test("Initialisation", function() {
    expect(1);

    ok($.deco.overlay, "$.deco.overlay");
});

test("decoOverlay", function() {
    expect(3);

    // Init overlay
    $("#content").find(".button-field").trigger("click");

    equals($(".deco-overlay").length, 1, "Overlay added");
    equals($(".deco-overlay-blocker").length, 1, "Overlay blocker added");
    equals($("#content").find("input:visible").length, 0, "Inputs are hidden");
});

test("overlay.open", function() {
    expect(20);

    $.deco.overlay.open("all", {});

    equals($("a[href=#fieldsetlegend-default]").hasClass("selected"), false, "First tab is deselected");
    equals($("a[href=#fieldsetlegend-default]").parent().hasClass("firstFormTab"), false, "First tab marker is removed");
    equals($("a[href=#fieldsetlegend-default]").parent().hasClass("deco-hidden"), true, "First tab is hidden");

    equals($("a[href=#fieldsetlegend-1]").hasClass("selected"), true, "Second tab is selected");
    equals($("a[href=#fieldsetlegend-1]").parent().hasClass("firstFormTab"), true, "Second tab has firstTab marker");
    equals($("a[href=#fieldsetlegend-1]").parent().hasClass("lastFormTab"), true, "Second tab has lastTab marker");
    equals($("a[href=#fieldsetlegend-1]").parent().hasClass("deco-hidden"), false, "Second tab is shown");

    equals($("a[href=#fieldsetlegend-2]").parent().hasClass("lastFormTab"), false, "Last tab marker is removed");
    equals($("a[href=#fieldsetlegend-2]").parent().hasClass("deco-hidden"), true, "Last tab is hidden");

    equals($('#formfield-form-widgets-ILayoutAware-layout').hasClass('deco-hidden'), true, "Row with layoutfield is hidden");

    equals($('#fieldset-1').hasClass('hidden'), false, "Second fieldset is shown");

    $.deco.overlay.close();
    equals($(".deco-overlay-blocker:visible").length, 0, "Overlay blocker removed");
    equals($("#content:visible").length, 0, "Overlay removed");

    $.deco.overlay.open("field", {id: "title-field"});

    equals($('#fieldset-default').hasClass('hidden'), true, "First fieldset is hidden");
    equals($('#fieldset-1').hasClass('hidden'), false, "Second fieldset is shown");
    equals($('#fieldset-2').hasClass('hidden'), true, "Third fieldset is hidden");

    equals($('#title-field').hasClass('deco-hidden'), false, "Title field is shown");

    equals($('.formTabs').hasClass('deco-hidden'), true, "Tabs are hidden");

    $(".formControls input[value=Ok]").trigger("click");
    equals($(".deco-overlay-blocker:visible").length, 0, "Overlay blocker removed");
    equals($("#content:visible").length, 0, "Overlay removed");
});

test("overlay.openIframe", function() {
    expect(3);

    $.deco.overlay.openIframe("about:blank");
    equals($(".deco-iframe-overlay").length, 1, "Iframe overlay added");

    $.deco.overlay.close();
    equals($(".deco-overlay-blocker:visible").length, 0, "Overlay blocker removed");
    equals($(".deco-iframe-overlay").length, 0, "Iframe overlay removed");
});
