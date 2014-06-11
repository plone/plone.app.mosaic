// Create executed property
$.deco.executed = [];

$.deco.options = {};

// Create decoSetResizeHandleLocation stub function
$.fn.decoSetResizeHandleLocation = function () {
    $.deco.executed.push("decoSetResizeHandleLocation");
};

// Create addTiel stub function
$.deco.addTile = function () {
    $.deco.executed.push("addTile");
};

module("upload", {
    setup: function () {
        // We'll create a div element for the overlay
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .attr("id", "content")
                    .addClass("deco-panel")
                    .append(
                        $(document.createElement("div"))
                            .addClass("deco-text-tile deco-tile")
                            .html("text content")
                            .append(
                                $(document.createElement("div"))
                                    .addClass("deco-tile-content")
                                    .append(
                                        $(document.createElement("p"))
                                            .html("text content")
                                    )
                            )
                    )
            );
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .attr("id", "portal-column-one")
                    .addClass("deco-panel")
            );
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .addClass("deco-toolbar")
            );

        $.deco.options.panels = $(".deco-panel");
        $.deco.options.toolbar = $(".deco-toolbar");

        // Empty executed
        $.deco.executed = [];
    },
    teardown: function () {
        $("#content").remove();
        $("#content-edit").remove();
        $("#portal-column-one").remove();
        $("#form-widgets-ILayoutAware-layout").remove();
    }
});

test("Initialisation", function() {
    expect(2);

    // Initialise
    $.deco.initUpload();

    // Trigger dragover
    $("#content").trigger('dragover');
    equals($.deco.executed.indexOf("decoSetResizeHandleLocation") != -1, true, 'Resize handle is called after dragover');
    equals($.deco.executed.indexOf("addTile") != -1, true, 'Add tile is called after dragover');

    // Trigger drop
    $(document).trigger('drop');
});
