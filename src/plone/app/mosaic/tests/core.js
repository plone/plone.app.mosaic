// Create executed property
$.deco.executed = [];

// Create initActions stub function
$.deco.initActions = function () {
    $.deco.executed.push("initActions");
};

// Create initNotify stub function
$.deco.initNotify = function () {
    $.deco.executed.push("initNotify");
};

$.deco.execCommand = function () {
    $.deco.executed.push("execCommand");
};

// Create undo stub class
$.deco.undo = {
    init : function () {
        $.deco.executed.push("undo.init");
    },
    snapshot : function () {
        $.deco.executed.push("undo.snapshot");
    }
};

// Create initUpload stub function
$.deco.initUpload = function () {
    $.deco.executed.push("initUpload");
};

// Create decoToolbar stub function
$.fn.decoToolbar = function() {
    $.deco.executed.push("decoToolbar");
};

// Create decoLayout stub function
$.fn.decoLayout = function() {
    $.deco.executed.push("decoLayout");
};

// Create ajax stub function
$.ajax = function (options) {
    if (options.url ===  "http://nohost/test/@@deco-config") {
        options.success({test: 1,
            tiles: [
                { "label" : "Fields",
                "name" : "fields",
                "tiles" : [ { "available_actions" : [ "tile-align-block",
                          "tile-align-right",
                          "tile-align-left"
                        ],
                      "category" : "fields",
                      "default_value" : null,
                      "favorite" : false,
                      "label" : "Title",
                      "name" : "plone.app.standardtiles.title",
                      "read_only" : false,
                      "rich_text" : true,
                      "settings" : false,
                      "tile_type" : "app",
                      "weight" : 10
                    },
                    { "available_actions" : [ "tile-align-block",
                          "tile-align-right",
                          "tile-align-left"
                        ],
                      "category" : "fields",
                      "default_value" : null,
                      "favorite" : false,
                      "label" : "Description",
                      "name" : "plone.app.standardtiles.description",
                      "read_only" : false,
                      "rich_text" : true,
                      "settings" : false,
                      "tile_type" : "app",
                      "weight" : 20
                    }
                  ],
                "weight" : 30
                }
            ]
        });
    }
    else if (options.url === "./@@plone.app.standardtiles.field?field=title?ignore_context=false") {
        options.success('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en"</head><body><p>Samuel L. Ipsum</p></body></html>');
    }
};

module("core", {
    setup: function () {
        // We'll create a div element for the overlay
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .attr("data-panel", "content")
            );
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .attr("data-panel", "portal-column-one")
            );
        $(document.body)
            .append($(document.createElement("textarea"))
                .attr('id', 'form-widgets-ILayoutAware-content')
                .val('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="./@@test-layout"><head></head><body><div data-panel="content">content text</div><div data-panel="portal-column-one">portal-column-one text</div></body></html>')
            );

        // Empty executed
        $.deco.executed = [];
    },
    teardown: function () {
        $("[data-panel=content]").remove();
        $("#content-edit").remove();
        $("[data-panel=portal-column-one]").remove();
        $(".deco-toolbar").remove();
        $("#form-widgets-ILayoutAware-content").remove();
        $("#content-views").remove();
        $(".contentActions").remove();
        $("#edit-bar").remove();
        $(".deco-blur").removeClass("deco-blur");
    }
});

test("Initialisation", function() {
    expect(1);

    ok($.deco, "$.deco");
});

test("Init without data", function() {
    expect(3);

    // Empty data
    $("#form-widgets-ILayoutAware-content").val('');

    $.deco.init({url: 'http://nohost/test/edit'});
    equals($("[data-panel=content]").html(), "", 'Region content is still empty');
    equals($("[data-panel=portal-column-one]").html(), "", 'Portal column one is still empty');
    equals($.deco.executed.indexOf("initActions") != -1, true, 'Init actions is called');
});

test("Init with data", function() {
    expect(13);

    $.deco.init({url: 'http://nohost/test/edit'});

    equals($("[data-panel=content]").html(), "content text", 'Region content is populated');
    equals($("[data-panel=portal-column-one]").html(), "portal-column-one text", 'Portal column one is populated');

    equals($("[data-panel=content]").hasClass('deco-panel'), true, 'Region content has deco-panel class');
    equals($("[data-panel=portal-column-one]").hasClass('deco-panel'), true, 'Portal column one has deco-panel class');

    equals($.deco.options.test, 1, 'Options are stored');
    equals($.deco.options.url, 'http://nohost/test', 'Url is stripped of /edit');

    equals($(".deco-toolbar").length, 1, 'Toolbar div is added');

    equals($.deco.options.panels.length, 2, "Two panels are stored on the options");
    equals($.deco.options.toolbar.length, 1, "Toolbar is stored on the options");

    equals($.deco.executed.indexOf("decoToolbar") != -1, true, "Toolbar init is called");

    equals($(".deco-panel").hasClass('deco-blur'), false, "Panels are not blurred");
    equals($(".deco-toolbar").hasClass('deco-blur'), false, "Toolbar is not blurred");
    equals($.deco.options.layout, "./@@test-layout", "site layout is preserved");
});

test("Init with tile data", function() {
    expect(2);

    // Set layout content
    $("#form-widgets-ILayoutAware-content").val('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="./@@test-layout"><body><div data-panel="content">content text</div><div data-panel="portal-column-one"><div class="deco-tile deco-plone.app.standardtiles.title-tile"><div class="deco-tile-content"><span data-tile="./@@plone.app.standardtiles.field?field=title"></span></div></div></div></body></html>');

    // Init with add url
    $.deco.init({url: 'http://nohost/test/edit'});

    equals($("[data-panel=content]").html(), "content text", 'Region content is populated');
    equals($('[data-panel=portal-column-one]').html().indexOf("Samuel L. Ipsum") != -1, true, 'App tile is loaded');
});

test("Add/remove head tags", function() {
    expect(2);

    // Add head tag
    $.deco.addHeadTags('http://nohost/test/@@plone.app.standardtiles.pony/tile-1', $.deco.getDomTreeFromHtml('<html><head><link href="test.css" media="screen" type="text/css" rel="stylesheet"/></head></html>'));
    equals($("head link[href=test.css]").length, 1, 'Stylesheet is added to the head');

    // Remove head tag
    $.deco.removeHeadTags('http://nohost/test/@@plone.app.standardtiles.pony/tile-1');
    equals($("head link[href=test.css]").length, 0, 'Stylesheet is removed from the head');
});
