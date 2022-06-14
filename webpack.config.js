process.traceDeprecation = true;
const mf_config = require("@patternslib/dev/webpack/webpack.mf");
const package_json = require("./package.json");
const path = require("path");
const patternslib_config = require("@patternslib/dev/webpack/webpack.config.js");

module.exports = async (env, argv) => {
    let config = {
        entry: {
            "plone-mosaic.min": path.resolve(__dirname, "resources/index-plone-mosaic"),
            "layouts-editor.min": path.resolve(__dirname, "resources/index-layouts-editor"), // prettier-ignore
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    tinymce: {
                        name: "tinymce",
                        test: /[\\/]node_modules[\\/]tinymce.*[\\/]/,
                        chunks: "all",
                    },
                    select2: {
                        name: "select2",
                        test: /[\\/]node_modules[\\/]select2.*[\\/]/,
                        chunks: "all",
                    },
                },
            },
        },
    };

    config = patternslib_config(env, argv, config, ["@plone/mockup"]);
    config.output.path = path.resolve(__dirname, "src/plone/app/mosaic/browser/static");

    config.plugins.push(
        mf_config({
            filename: "plone-mosaic-remote.min.js",
            package_json: package_json,
            remote_entry: config.entry["plone-mosaic.min"],
        })
    );
    config.plugins.push(
        mf_config({
            name: "layouts-editor",
            filename: "layouts-editor-remote.min.js",
            package_json: package_json,
            remote_entry: config.entry["layouts-editor.min"],
        })
    );

    if (process.env.NODE_ENV === "development") {
        config.devServer.port = "8011";
        config.devServer.static.directory = __dirname;
    }

    //console.log(JSON.stringify(config, null, 4));

    return config;
};
