// Create executed property
$.deco.executed = [];

$.deco.options = {
    "primary_actions": [
        {
            "name": "save",
            "actions": [{
                "name": "save",
                "menu": false,
                "label": "Save",
                "items": [],
                "action": "save",
                "icon": false
            }],
            "label": "Save"
        },
        {
            "name": "cancel",
            "menu": false,
            "label": "Cancel",
            "items": [],
            "action": "cancel",
            "icon": false
        },
    ],
    "secondary_actions": [
        {
            "name": "format",
            "menu": true,
            "label": "Format",
            "items": [
                {"value": "none", "label": "Format"},
                {
                    "value": "submenu", "label": "Submenu", "items": [
                        {"value": "none", "label": "Submenu item"}
                    ]
                }
            ],
            "action": "format",
            "icon": true
        },
        {
            "name": "insert",
            "menu": true,
            "label": "Insert",
            "items": [
                {"value": "none", "label": "Insert"},
                {
                    "value": "submenu", "label": "Submenu", "items": [
                        {"value": "none", "label": "Submenu item"}
                    ]
                }
            ],
            "action": "insert",
            "icon": false
        }
    ],
    "formats": [
        {
            "name": "text",
            "label": "Text",
            "actions": [
                {
                    "action": "strong",
                    "icon": false,
                    "favorite": true,
                    "name": "strong",
                    "label": "B"
                },
                {
                    "action": "heading",
                    "icon": false,
                    "favorite": false,
                    "name": "heading",
                    "label": "Heading"
                }
            ]
        },
        {
            "name": "empty",
            "label": "Empty",
            "actions": []
        }
    ],
    "tiles": [{
        'name': 'fields',
        'label': 'Fields',
        'tiles': [
            {
                "name": "title",
                "label": "Title",
                "type": "field",
                "id": "title-field",
                "available_actions": ["strong"]
            },
            {
                "name": "description",
                "type": "field",
                "label": "Description",
                "id": "description-field",
                "available_actions": []
            }
        ]
    },
    {
        'name': 'app',
        'label': 'App',
        'tiles': [
            {
                'name': 'pony',
                "label": "Pony",
                'type': 'app'
            },
            {
                'name': 'text',
                "label": "Text",
                'type': 'structure'
            },
        ]
    },
    {
        'name': 'other',
        'label': 'Other',
        'tiles': []
    }],
    "default_available_actions": [
        "save",
        "cancel",
        "page-properties",
        "format",
        "insert"
    ]
};

// Create disableEditHtmlSource stub function
$.deco.disableEditHtmlSource = function () {
    $.deco.executed.push("decoExecAction");
};

// Create decoExecAction stub function
$.fn.decoExecAction = function() {
    $.deco.executed.push("decoExecAction");
};

module("toolbar", {
    setup: function () {
        $(document.body)
            .append($(document.createElement("div"))
                .addClass("deco-toolbar")
        );
        $(document.body)
            .append($(document.createElement("div"))
                .addClass("deco-panel")
                .append($(document.createElement("div"))
                    .addClass("deco-title-tile deco-selected-tile")
            )
        );
        $.deco.options.panels = $(".deco-panel");

        // Empty executed
        $.deco.executed = [];
    },
    teardown: function () {
        $(".deco-toolbar").remove();
        $(".deco-panel").remove();
    }
});

test("Init with just the title field", function() {
    expect(4);

    // Backup tiles and remove description
    var tiles_backup = $.deco.options.tiles;
    $.deco.options.tiles = [{
        'name': 'fields',
        'label': 'Fields',
        'tiles': [
            {
                "name": "title",
                "label": "Title",
                "type": "field",
                "id": "title-field",
                "available_actions": []
            }
        ]
    }];

    // Setup toolbar
    $(".deco-toolbar").decoToolbar();

    equals($(".deco-inline-toolbar").length, 1, 'Inline toolbar div is added');
    equals($(".deco-toolbar-content").length, 1, 'Content toolbar div is added');
    equals($(".deco-toolbar-primary-functions").length, 1, 'Primary functions div is added');
    equals($(".deco-toolbar-secondary-functions").length, 1, 'Secondary functions div is added');

    // Restore tiles
    $.deco.options.tiles = tiles_backup;
});

test("Init with multiple fields", function() {
    expect(14);

    // Setup toolbar
    $(".deco-toolbar").decoToolbar();

    equals($(".deco-button-strong").length, 1, 'Strong button is added');
    equals($(".deco-button-group-save").length, 1, 'Save group is added');
    equals($(".deco-button-save").length, 1, 'Save button is added');

    equals($(".deco-button-save").length, 1, 'Save button is added');

    equals($(".deco-button-group-text").length, 1, 'Format text group is added');
    equals($(".deco-button-group-empty").length, 0, 'Empty group is removed');

    equals($(".deco-button-strong:visible").length, 1, 'Strong button is shown');
    equals($(".deco-button-heading:visible").length, 0, 'Heading button is hidden');

    equals($(".deco-option-title").attr("disabled"), true, 'Title option is disabled');
    equals($(".deco-option-description").attr("disabled"), "", 'Description option is enabled');

    equals($(".deco-menu-empty").length, 0, 'Empty menu is removed');

    // Trigger action
    $.deco.executed = [];
    $(".deco-button-strong").trigger("mousedown");

    equals($.deco.executed.indexOf("decoExecAction") != -1, true, 'Strong action triggered');

    // Trigger action
    $.deco.executed = [];
    $(".deco-menu-insert").trigger("change");

    equals($.deco.executed.indexOf("decoExecAction") != -1, true, 'Insert action triggered');

    // Trigger action
    $.deco.executed = [];
    $(".deco-menu-format").trigger("change");

    equals($.deco.executed.indexOf("decoExecAction") != -1, true, 'Format action triggered');
});

test("Window scroll", function() {
    expect(2);

    // Setup toolbar
    $(".deco-toolbar").decoToolbar();

    // Add dummy div
    $(document.body).append(
        $(document.createElement("div"))
            .css("height", "5000px")
            .addClass("dummyheight")
    );

    // Scroll window
    window.scroll(0, 5000);

    // Setup toolbar
    $(window).trigger("scroll");

    equals($(".deco-toolbar > div").hasClass("deco-external-toolbar"), true, "Toolbar set to external");

    // Scroll window
    window.scroll(0, 0);

    // Setup toolbar
    $(window).trigger("scroll");

    equals($(".deco-toolbar > div").hasClass("deco-inline-toolbar"), true, "Toolbar set to internal");

    // Remove dummy
    $(".dummyheight").remove();
});
