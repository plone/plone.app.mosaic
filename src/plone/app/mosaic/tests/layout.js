// Create executed property
$.deco.executed = [];

$.deco.options = {
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
        },
        { "available_actions" : [ "tile-align-block",
              "tile-align-right",
              "tile-align-left"
            ],
          "category" : "fields",
          "default_value" : null,
          "favorite" : false,
          "label" : "Alcohol volume",
          "name" : "alcohol_volume",
          "read_only" : false,
          "rich_text" : false,
          "settings" : false,
          "tile_type" : "field",
          "weight" : 20,
          "widget" : "z3c.form.browser.text.TextWidget",
          "id" : "formfield-form-widgets-alcohol_volume"
        },
        { "available_actions" : [ "tile-align-block",
              "tile-align-right",
              "tile-align-left"
            ],
          "category" : "structure",
          "default_value" : null,
          "favorite" : false,
          "label" : "Text",
          "name" : "text",
          "read_only" : false,
          "rich_text" : true,
          "settings" : true,
          "tile_type" : "text",
          "weight" : 20
        }
      ],
    "weight" : 30
    }
    ]
};

$.fn.decoEditor = function() {
    $.deco.executed.push("decoEditor");
};

// Create ajax stub function
$.ajax = function (options) {
    options.success();
};


module("layout", {
    setup: function () {
        // We'll create a div element for the overlay
        $(document.body)
            .append($('<div data-panel="content"><div class="deco-grid-row"><div class="deco-grid-cell"><div class="deco-tile deco-alcohol_volume-tile"><div class="deco-tile-content"><span data-tile="./@@plone.app.standardtiles.field?field=alcohol_volume">5.4</span></div></div><div class="deco-tile deco-text-tile"><div class="deco-tile-content"><p>Free <strong>text</strong></p></div></div></div></div></div><div data-panel="portal-column-one"><div class="deco-grid-row"><div class="deco-grid-cell"><div class="deco-tile deco-plone.app.standardtiles.title-tile"><div class="deco-tile-content"><span data-tile="./@@plone.app.standardtiles.title">Samuel L. Ipsum</span></div></div></div></div></div>'));
        $(document.body)
            .append(
                $(document.createElement("div"))
                    .addClass("deco-toolbar")
            );
        $(document.body).append($('<div id="formfield-form-widgets-IDublinCore-title"><input type="text" /></div>'));
        $(document.body).append($('<div id="formfield-form-widgets-alcohol_volume"><input type="text" /></div>'));
        $.deco.options.panels = $("[data-panel]");
        $.deco.options.toolbar = $(".deco-toolbar");

        // Empty executed
        $.deco.executed = [];
        $.deco.document = document;
    },
    teardown: function () {
        $("[data-panel=content]").remove();
        $("[data-panel=portal-column-one]").remove();
        $("#formfield-form-widgets-IDublinCore-title").remove();
        $("#formfield-form-widgets-alcohol_volume").remove();
    }
});

test("Initialisation", function() {
    expect(4);

    ok($.deco, "$.deco");
    ok($.deco.layout, "$.deco");
    ok($.deco.layout.widthClasses, "$.deco");
    ok($.deco.layout.positionClasses, "$.deco");
});

test("Init without data", function() {
    expect(8);

    // Init panel
    $.deco.options.panels.decoLayout();
    // simulate app tile init
    $('.deco-plone\\.app\\.standardtiles\\.title-tile [data-tile]').before($('<p class="hiddenStructure tileUrl">./@@plone.app.standardtiles.title</p>'));
    // simulate layout init
    $.deco.options.layout = "./@@test-layout";
    var saved_html = $.deco.getPageContent();
    equals($.deco.getPageContent().indexOf('<div data-panel="content">') != -1, true, "getPageContent is round-tripable");
    equals($.deco.getPageContent().indexOf('<div data-panel="portal-column-one">') != -1, true, "getPageContent is round-tripable");
    equals(saved_html.indexOf('<span data-tile="./@@plone.app.standardtiles.title"></span>') != -1, true, "getPageContent preserves tiles");
    equals($("#formfield-form-widgets-IDublinCore-title input").val(), "Samuel L. Ipsum", "title value preserved in form");
    equals(saved_html.indexOf('<span data-tile="./@@plone.app.standardtiles.field?field=alcohol_volume"></span>') != -1, true, "getPageContent preserves custom field");
    equals($("#formfield-form-widgets-alcohol_volume input").val(), "5.4", "custom field value preserved in form");
    equals(saved_html.indexOf("<p>Free <strong>text</strong></p>") != -1, true, "text tiles are preserved");
    equals(saved_html.indexOf('data-layout="./@@test-layout"') != -1, true, "layout attribute preserved");
});
