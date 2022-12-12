import "regenerator-runtime/runtime"; // needed for ``await`` support
import $ from "jquery";
import _ from "underscore";
import utils from "@plone/mockup/src/core/utils";
import Base from "@patternslib/patternslib/src/core/base";

export default Base.extend({
    name: "layouts-editor",
    trigger: ".pat-layouts-editor",
    parser: "mockup",

    defaults: {
        editor_markup: '<table class="table listing">' +
            "<thead>" +
            "<th>Title</th>" +
            "<th>Path</th>" +
            "<th>Types</th>" +
            "<th>Actions</th>" +
            "</thead>" +
            "<tbody>" +
            "<% _.each(items, function(item){ %>" +
            '<tr data-layout-key="<%- item.key %>">' +
            "<td><%- item.title %></td>" +
            "<td><%- item.key %></td>" +
            '<td><%- item._for || "all" %></td>' +
            "<td>" +
            "<% if(item.hidden){ %>" +
            '<a href="#" class="showit">Show</a>' +
            "<% }else{ %>" +
            '<a href="#" class="hideit">Hide</a>' +
            "<% } %>" +
            "</td>" +
            "</tr>" +
            "<% }); %>" +
            "</tbody" +
            "</table>",
    },

    init: async function() {
        var self = this;

        import("../scss/layouts-editor.scss");

        await self.loadEditor();
    },

    loadEditor: function () {
        var self = this;
        var baseUrl = window.location.origin + window.location.pathname;
        var url = baseUrl + "?list-contentlayouts=true";
        utils.loading.show();

        $.ajax({
            url: url,
            dataType: "JSON",
        })
            .done(function (data) {
                self.$el.empty();
                self.$el.html(
                    _.template(self.options.editor_markup)({
                        items: data,
                    })
                );
                $(".showit,.hideit", self.$el).click(function (e) {
                    utils.loading.show();
                    e.preventDefault();
                    $.ajax({
                        url: baseUrl,
                        data: {
                            action: ($(this).hasClass("showit") && "show") || "hide",
                            layout: $(this).parents("tr").attr("data-layout-key"),
                            _authenticator: utils.getAuthenticator(),
                        },
                    }).done(function () {
                        self.loadEditor();
                    });
                });
            })
            .always(function () {
                utils.loading.hide();
            });
    }
});
