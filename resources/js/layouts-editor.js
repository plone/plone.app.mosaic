import "regenerator-runtime/runtime"; // needed for ``await`` support
import "@patternslib/patternslib/src/globals";
import $ from "jquery";
import _ from "underscore";
import utils from "@plone/mockup/src/core/utils";
import "../scss/layouts-editor.scss";

$(document).ready(function () {
    var EditorTemplate = _.template(
        '<table class="table listing">' +
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
            "</table>"
    );

    var loadEditor = function () {
        var baseUrl = window.location.origin + window.location.pathname;
        var url = baseUrl + "?list-contentlayouts=true";
        utils.loading.show();
        $.ajax({
            url: url,
            dataType: "JSON",
        })
            .done(function (data) {
                var $el = $("#show-hide-editor");
                if ($el.length === 0) {
                    $el = $('<div id="show-hide-editor" />');
                    $(".show-hide-layouts").append($el);
                }
                $el.empty();
                $el.html(
                    EditorTemplate({
                        items: data,
                    })
                );
                $(".showit,.hideit", $el).click(function (e) {
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
                        loadEditor();
                    });
                });
            })
            .always(function () {
                utils.loading.hide();
            });
    };

    $("#content-core").on("clicked", "#autotoc-item-autotoc-2", function (e) {
        e.preventDefault();
        loadEditor();
    });
});
