requirejs.config({
    baseUrl: PORTAL_URL,
    paths: {
    "ace-mode-css": "++plone++static/components/ace-builds/src/mode-css",
    "ace-mode-javascript": "++plone++static/components/ace-builds/src/mode-javascript",
    "ace-mode-text": "++plone++static/components/ace-builds/src/mode-text",
    "ace-theme-monokai": "++plone++static/components/ace-builds/src/theme-monokai",
    "ace": "++plone++static/components/ace-builds/src/ace",
    "backbone": "++plone++static/components/backbone/backbone",
    "backbone.paginator": "++plone++static/components/backbone.paginator/lib/backbone.paginator",
    "bootstrap-alert": "++plone++static/components/bootstrap/js/alert",
    "bootstrap-collapse": "++plone++static/components/bootstrap/js/collapse",
    "bootstrap-dropdown": "++plone++static/components/bootstrap/js/dropdown",
    "bootstrap-tooltip": "++plone++static/components/bootstrap/js/tooltip",
    "bootstrap-transition": "++plone++static/components/bootstrap/js/transition",
    "datatables.net-autofill-bs": "++plone++static/components/datatables.net-autofill-bs/js/autoFill.bootstrap",
    "datatables.net-autofill": "++plone++static/components/datatables.net-autofill/js/dataTables.autoFill.min",
    "datatables.net-bs": "++plone++static/components/datatables.net-bs/js/dataTables.bootstrap",
    "datatables.net-buttons-bs": "++plone++static/components/datatables.net-buttons-bs/js/buttons.bootstrap.min",
    "datatables.net-buttons-colvis": "++plone++static/components/datatables.net-buttons/js/buttons.colVis.min",
    "datatables.net-buttons-flash": "++plone++static/components/datatables.net-buttons/js/buttons.flash.min",
    "datatables.net-buttons-html5": "++plone++static/components/datatables.net-buttons/js/buttons.html5.min",
    "datatables.net-buttons-print": "++plone++static/components/datatables.net-buttons/js/buttons.print.min",
    "datatables.net-buttons": "++plone++static/components/datatables.net-buttons/js/dataTables.buttons.min",
    "datatables.net-colreorder": "++plone++static/components/datatables.net-colreorder/js/dataTables.colReorder.min",
    "datatables.net-fixedcolumns": "++plone++static/components/datatables.net-fixedcolumns/js/dataTables.fixedColumns.min",
    "datatables.net-fixedheader": "++plone++static/components/datatables.net-fixedheader/js/dataTables.fixedHeader.min",
    "datatables.net-keytable": "++plone++static/components/datatables.net-keytable/js/dataTables.keyTable.min",
    "datatables.net-responsive-bs": "++plone++static/components/datatables.net-responsive-bs/js/responsive.bootstrap.min",
    "datatables.net-responsive": "++plone++static/components/datatables.net-responsive/js/dataTables.responsive.min",
    "datatables.net-rowreorder": "++plone++static/components/datatables.net-rowreorder/js/dataTables.rowReorder.min",
    "datatables.net-scroller": "++plone++static/components/datatables.net-scroller/js/dataTables.scroller.min",
    "datatables.net-select": "++plone++static/components/datatables.net-select/js/dataTables.select.min",
    "datatables.net": "++plone++static/components/datatables.net/js/jquery.dataTables",
    "dropzone": "++plone++static/components/dropzone/dist/dropzone-amd-module",
    "filemanager": "++plone++static/filemanager",
    "jqtree-contextmenu": "++plone++static/components/cs-jqtree-contextmenu/src/jqTreeContextMenu",
    "jqtree": "++plone++static/components/jqtree/tree.jquery",
    "jquery.browser": "++plone++static/components/jquery.browser/dist/jquery.browser",
    "jquery": "++plone++static/components/jquery/dist/jquery.min",
    "jquery.cookie": "++plone++static/components/jquery.cookie/jquery.cookie",
    "jquery.event.drag": "++resource++mockuplib/jquery.event.drag",
    "jquery.event.drop": "++resource++mockuplib/jquery.event.drop",
    "jquery.form": "++plone++static/components/jquery-form/src/jquery.form",
    "jquery.recurrenceinput": "++plone++static/components/jquery.recurrenceinput.js/src/jquery.recurrenceinput",
    "jquery.tmpl": "++plone++static/components/jquery.recurrenceinput.js/lib/jquery.tmpl",
    "layouts-editor": "++plone++mosaic/js/layouts-editor",
    "less": "++plone++static/components/less/dist/less",
    "logging": "++plone++static/components/logging/src/logging",
    "mockup-i18n": "++resource++mockupjs/i18n",
    "mockup-patterns-autotoc": "++resource++mockup/autotoc/pattern",
    "mockup-patterns-backdrop": "++resource++mockup/backdrop/pattern",
    "mockup-patterns-base": "++resource++mockup/base/pattern",
    "mockup-patterns-contentloader": "++resource++mockup/contentloader/pattern",
    "mockup-patterns-cookietrigger": "++resource++mockup/cookietrigger/pattern",
    "mockup-patterns-datatables": "++resource++mockup/datatables/pattern",
    "mockup-patterns-filemanager": "++resource++mockup/filemanager/pattern",
    "mockup-patterns-filemanager-url": "++resource++mockup/filemanager",
    "mockup-patterns-formautofocus": "++resource++mockup/formautofocus/pattern",
    "mockup-patterns-formunloadalert": "++resource++mockup/formunloadalert/pattern",
    "mockup-patterns-inlinevalidation": "++resource++mockup/inlinevalidation/pattern",
    "mockup-patterns-livesearch": "++resource++mockup/livesearch/pattern",
    "mockup-patterns-markspeciallinks": "++resource++mockup/markspeciallinks/pattern",
    "mockup-patterns-modal": "++resource++mockup/modal/pattern",
    "mockup-patterns-moment": "++resource++mockup/moment/pattern",
    "mockup-patterns-navigationmarker": "++resource++mockup/navigationmarker/pattern",
    "mockup-patterns-pickadate": "++resource++mockup/pickadate/pattern",
    "mockup-patterns-preventdoublesubmit": "++resource++mockup/preventdoublesubmit/pattern",
    "mockup-patterns-querystring": "++resource++mockup/querystring/pattern",
    "mockup-patterns-recurrence": "++resource++mockup/recurrence/pattern",
    "mockup-patterns-relateditems-upload": "++resource++mockup/relateditems/upload",
    "mockup-patterns-relateditems": "++resource++mockup/relateditems/pattern",
    "mockup-patterns-relateditems-url": "++resource++mockup/relateditems",
    "mockup-patterns-resourceregistry": "++resource++mockup/resourceregistry/pattern",
    "mockup-patterns-resourceregistry-url": "++resource++mockup/resourceregistry",
    "mockup-patterns-select2": "++resource++mockup/select2/pattern",
    "mockup-patterns-sortable": "++resource++mockup/sortable/pattern",
    "mockup-patterns-structure": "++resource++mockup/structure/pattern",
    "mockup-patterns-structure-url": "++resource++mockup/structure",
    "mockup-patterns-structureupdater": "++resource++mockup/structure/pattern-structureupdater",
    "mockup-patterns-textareamimetypeselector": "++resource++mockup/textareamimetypeselector/pattern",
    "mockup-patterns-texteditor": "++resource++mockup/texteditor/pattern",
    "mockup-patterns-thememapper": "++resource++mockup/thememapper/pattern",
    "mockup-patterns-thememapper-url": "++resource++mockup/thememapper",
    "mockup-patterns-tinymce": "++resource++mockup/tinymce/pattern",
    "mockup-patterns-tinymce-url": "++resource++mockup/tinymce",
    "mockup-patterns-toggle": "++resource++mockup/toggle/pattern",
    "mockup-patterns-tooltip": "++resource++mockup/tooltip/pattern",
    "mockup-patterns-tree": "++resource++mockup/tree/pattern",
    "mockup-patterns-upload": "++resource++mockup/upload/pattern",
    "mockup-patterns-upload-url": "++resource++mockup/upload",
    "mockup-router": "++resource++mockupjs/router",
    "mockup-ui-url": "++resource++mockupjs/ui",
    "mockup-utils": "++resource++mockupjs/utils",
    "moment": "++plone++static/components/moment/min/moment.min",
    "moment-url": "++plone++static/components/moment/locale",
    "mosaic-base-url": "++plone++mosaic/js",
    "mosaic": "++plone++mosaic/js/mosaic.pattern",
    "mosaic-url": "++plone++mosaic/js",
    "pat-base": "++plone++static/components/patternslib/src/core/base",
    "pat-compat": "++plone++static/components/patternslib/src/core/compat",
    "pat-jquery-ext": "++plone++static/components/patternslib/src/core/jquery-ext",
    "pat-logger": "++plone++static/components/patternslib/src/core/logger",
    "pat-mockup-parser": "++plone++static/components/patternslib/src/core/mockup-parser",
    "pat-registry": "++plone++static/components/patternslib/src/core/registry",
    "pat-utils": "++plone++static/components/patternslib/src/core/utils",
    "picker": "++plone++static/components/pickadate/lib/picker",
    "picker.date": "++plone++static/components/pickadate/lib/picker.date",
    "picker.time": "++plone++static/components/pickadate/lib/picker.time",
    "plone-app-discussion": "++plone++plone.app.discussion.javascripts/comments",
    "plone-app-event": "++plone++plone.app.event/event",
    "plone-base": "++resource++plone-base",
    "plone-datatables": "++resource++plone-datatables",
    "plone-editor-tools": "++resource++plone-editor-tools",
    "plone-logged-in": "++resource++plone-logged-in",
    "plone-moment": "++resource++plone-moment",
    "plone-patterns-portletmanager": "++resource++manage-portlets",
    "plone-patterns-toolbar": "++resource++mockup/toolbar/pattern",
    "plone-tinymce": "++resource++plone-tinymce",
    "plone": "++resource++plone",
    "resource-plone-app-jquerytools-dateinput-js": "++plone++static/components/jquery.recurrenceinput.js/lib/jquery.tools.dateinput",
    "resource-plone-app-jquerytools-js": "++plone++static/components/jquery.recurrenceinput.js/lib/jquery.tools.overlay",
    "resourceregistry": "++plone++static/resourceregistry",
    "select2": "++plone++static/components/select2/select2",
    "text": "++plone++static/components/requirejs-text/text",
    "thememapper": "++plone++static/thememapper",
    "tinymce-advlist": "++plone++static/components/tinymce-builded/js/tinymce/plugins/advlist/plugin",
    "tinymce-anchor": "++plone++static/components/tinymce-builded/js/tinymce/plugins/anchor/plugin",
    "tinymce-autolink": "++plone++static/components/tinymce-builded/js/tinymce/plugins/autolink/plugin",
    "tinymce-autoresize": "++plone++static/components/tinymce-builded/js/tinymce/plugins/autoresize/plugin",
    "tinymce-autosave": "++plone++static/components/tinymce-builded/js/tinymce/plugins/autosave/plugin",
    "tinymce-bbcode": "++plone++static/components/tinymce-builded/js/tinymce/plugins/bbcode/plugin",
    "tinymce-charmap": "++plone++static/components/tinymce-builded/js/tinymce/plugins/charmap/plugin",
    "tinymce-code": "++plone++static/components/tinymce-builded/js/tinymce/plugins/code/plugin",
    "tinymce-colorpicker": "++plone++static/components/tinymce-builded/js/tinymce/plugins/colorpicker/plugin",
    "tinymce-compat3x": "++plone++static/components/tinymce-builded/js/tinymce/plugins/compat3x/plugin",
    "tinymce-contextmenu": "++plone++static/components/tinymce-builded/js/tinymce/plugins/contextmenu/plugin",
    "tinymce-directionality": "++plone++static/components/tinymce-builded/js/tinymce/plugins/directionality/plugin",
    "tinymce-emoticons": "++plone++static/components/tinymce-builded/js/tinymce/plugins/emoticons/plugin",
    "tinymce-fullpage": "++plone++static/components/tinymce-builded/js/tinymce/plugins/fullpage/plugin",
    "tinymce-fullscreen": "++plone++static/components/tinymce-builded/js/tinymce/plugins/fullscreen/plugin",
    "tinymce-hr": "++plone++static/components/tinymce-builded/js/tinymce/plugins/hr/plugin",
    "tinymce-image": "++plone++static/components/tinymce-builded/js/tinymce/plugins/image/plugin",
    "tinymce-importcss": "++plone++static/components/tinymce-builded/js/tinymce/plugins/importcss/plugin",
    "tinymce-insertdatetime": "++plone++static/components/tinymce-builded/js/tinymce/plugins/insertdatetime/plugin",
    "tinymce-legacyoutput": "++plone++static/components/tinymce-builded/js/tinymce/plugins/legacyoutput/plugin",
    "tinymce-link": "++plone++static/components/tinymce-builded/js/tinymce/plugins/link/plugin",
    "tinymce-lists": "++plone++static/components/tinymce-builded/js/tinymce/plugins/lists/plugin",
    "tinymce-media": "++plone++static/components/tinymce-builded/js/tinymce/plugins/media/plugin",
    "tinymce-modern-theme": "++plone++static/components/tinymce-builded/js/tinymce/themes/modern/theme",
    "tinymce-nonbreaking": "++plone++static/components/tinymce-builded/js/tinymce/plugins/nonbreaking/plugin",
    "tinymce-noneditable": "++plone++static/components/tinymce-builded/js/tinymce/plugins/noneditable/plugin",
    "tinymce-pagebreak": "++plone++static/components/tinymce-builded/js/tinymce/plugins/pagebreak/plugin",
    "tinymce-paste": "++plone++static/components/tinymce-builded/js/tinymce/plugins/paste/plugin",
    "tinymce-preview": "++plone++static/components/tinymce-builded/js/tinymce/plugins/preview/plugin",
    "tinymce-print": "++plone++static/components/tinymce-builded/js/tinymce/plugins/print/plugin",
    "tinymce-save": "++plone++static/components/tinymce-builded/js/tinymce/plugins/save/plugin",
    "tinymce-searchreplace": "++plone++static/components/tinymce-builded/js/tinymce/plugins/searchreplace/plugin",
    "tinymce-spellchecker": "++plone++static/components/tinymce-builded/js/tinymce/plugins/spellchecker/plugin",
    "tinymce-tabfocus": "++plone++static/components/tinymce-builded/js/tinymce/plugins/tabfocus/plugin",
    "tinymce-table": "++plone++static/components/tinymce-builded/js/tinymce/plugins/table/plugin",
    "tinymce-template": "++plone++static/components/tinymce-builded/js/tinymce/plugins/template/plugin",
    "tinymce-textcolor": "++plone++static/components/tinymce-builded/js/tinymce/plugins/textcolor/plugin",
    "tinymce-textpattern": "++plone++static/components/tinymce-builded/js/tinymce/plugins/textpattern/plugin",
    "tinymce-visualblocks": "++plone++static/components/tinymce-builded/js/tinymce/plugins/visualblocks/plugin",
    "tinymce-visualchars": "++plone++static/components/tinymce-builded/js/tinymce/plugins/visualchars/plugin",
    "tinymce-wordcount": "++plone++static/components/tinymce-builded/js/tinymce/plugins/wordcount/plugin",
    "tinymce": "++plone++static/components/tinymce-builded/js/tinymce/tinymce",
    "translate": "++resource++mockupjs/i18n-wrapper",
    "underscore": "++plone++static/components/underscore/underscore"
},
    shim: {
        "backbone": {
            exports: "window.Backbone",
            deps: ["underscore", "jquery"]
        },
        "backbone.paginator": {
            exports: "window.Backbone.Paginator",
            deps: ["backbone"]
        },
        "bootstrap-alert": {
            deps: ["jquery"]
        },
        "bootstrap-collapse": {
            exports: "window.jQuery.fn.collapse.Constructor",
            deps: ["jquery"]
        },
        "bootstrap-dropdown": {
            deps: ["jquery"]
        },
        "bootstrap-tooltip": {
            deps: ["jquery"]
        },
        "bootstrap-transition": {
            exports: "window.jQuery.support.transition",
            deps: ["jquery"]
        },
        "jqtree-contextmenu": {
            deps: ["jqtree"]
        },
        "jqtree": {
            deps: ["jquery"]
        },
        "jquery.browser": {
            deps: ["jquery"]
        },
        "jquery.cookie": {
            deps: ["jquery"]
        },
        "jquery.event.drag": {
            deps: ["jquery"]
        },
        "jquery.event.drop": {
            exports: "$.drop",
            deps: ["jquery"]
        },
        "jquery.recurrenceinput": {
            deps: ["jquery", "resource-plone-app-jquerytools-js", "resource-plone-app-jquerytools-dateinput-js", "jquery.tmpl"]
        },
        "jquery.tmpl": {
            deps: ["jquery"]
        },
        "picker.date": {
            deps: ["picker"]
        },
        "picker.time": {
            deps: ["picker"]
        },
        "resource-plone-app-jquerytools-dateinput-js": {
            deps: ["jquery"]
        },
        "resource-plone-app-jquerytools-js": {
            deps: ["jquery"]
        },
        "tinymce-advlist": {
            deps: ["tinymce"]
        },
        "tinymce-anchor": {
            deps: ["tinymce"]
        },
        "tinymce-autolink": {
            deps: ["tinymce"]
        },
        "tinymce-autoresize": {
            deps: ["tinymce"]
        },
        "tinymce-autosave": {
            deps: ["tinymce"]
        },
        "tinymce-bbcode": {
            deps: ["tinymce"]
        },
        "tinymce-charmap": {
            deps: ["tinymce"]
        },
        "tinymce-code": {
            deps: ["tinymce"]
        },
        "tinymce-colorpicker": {
            deps: ["tinymce"]
        },
        "tinymce-compat3x": {
            deps: ["tinymce"]
        },
        "tinymce-contextmenu": {
            deps: ["tinymce"]
        },
        "tinymce-directionality": {
            deps: ["tinymce"]
        },
        "tinymce-emoticons": {
            deps: ["tinymce"]
        },
        "tinymce-fullpage": {
            deps: ["tinymce"]
        },
        "tinymce-fullscreen": {
            deps: ["tinymce"]
        },
        "tinymce-hr": {
            deps: ["tinymce"]
        },
        "tinymce-image": {
            deps: ["tinymce"]
        },
        "tinymce-importcss": {
            deps: ["tinymce"]
        },
        "tinymce-insertdatetime": {
            deps: ["tinymce"]
        },
        "tinymce-legacyoutput": {
            deps: ["tinymce"]
        },
        "tinymce-link": {
            deps: ["tinymce"]
        },
        "tinymce-lists": {
            deps: ["tinymce"]
        },
        "tinymce-media": {
            deps: ["tinymce"]
        },
        "tinymce-modern-theme": {
            deps: ["tinymce"]
        },
        "tinymce-nonbreaking": {
            deps: ["tinymce"]
        },
        "tinymce-noneditable": {
            deps: ["tinymce"]
        },
        "tinymce-pagebreak": {
            deps: ["tinymce"]
        },
        "tinymce-paste": {
            deps: ["tinymce"]
        },
        "tinymce-preview": {
            deps: ["tinymce"]
        },
        "tinymce-print": {
            deps: ["tinymce"]
        },
        "tinymce-save": {
            deps: ["tinymce"]
        },
        "tinymce-searchreplace": {
            deps: ["tinymce"]
        },
        "tinymce-spellchecker": {
            deps: ["tinymce"]
        },
        "tinymce-tabfocus": {
            deps: ["tinymce"]
        },
        "tinymce-table": {
            deps: ["tinymce"]
        },
        "tinymce-template": {
            deps: ["tinymce"]
        },
        "tinymce-textcolor": {
            deps: ["tinymce"]
        },
        "tinymce-textpattern": {
            deps: ["tinymce"]
        },
        "tinymce-visualblocks": {
            deps: ["tinymce"]
        },
        "tinymce-visualchars": {
            deps: ["tinymce"]
        },
        "tinymce-wordcount": {
            deps: ["tinymce"]
        },
        "tinymce": {
            exports: "window.tinyMCE",
            init: function () { this.tinyMCE.DOM.events.domLoaded = true; return this.tinyMCE; }
        },
        "underscore": {
            exports: "window._"
        }
    },
    optimize: 'uglify',
    wrapShim: true
});