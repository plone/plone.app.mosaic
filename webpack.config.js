process.traceDeprecation = true;
const mf_config = require("@patternslib/dev/webpack/webpack.mf");
const path = require("path");
const package_json = require("./package.json");
const package_json_mockup = require("@plone/mockup/package.json");
const package_json_patternslib = require("@patternslib/patternslib/package.json");
const webpack_config = require("@patternslib/dev/webpack/webpack.config").config;

module.exports = () => {
    let config = {
        entry: {
            "plone-mosaic.min": path.resolve(__dirname, "resources/index"),
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    // `module.resource` contains the absolute path of the file on disk.
                    // We need to substitute the path separators to make it work on different OSes.
                    tinymce_plugins: {
                        name: "tinymce_plugins",
                        test(module) {
                            const default_plugins = [
                                "fullscreen",
                                "hr",
                                "lists",
                                "media",
                                "nonbreaking",
                                "noneditable",
                                "pagebreak",
                                "paste",
                                "preview",
                                "print",
                                "searchreplace",
                                "tabfocus",
                                "table",
                                "visualchars",
                                "wordcount",
                                "code",
                            ];
                            if (
                                /node_modules.tinymce.plugins/.test(module.resource) ===
                                false
                            ) {
                                return false;
                            }

                            for (const plugin of default_plugins) {
                                if (module.resource.includes(plugin)) {
                                    return true;
                                }
                            }
                            return false;
                        },
                        chunks: "async",
                    },
                    tinymce: {
                        name: "tinymce",
                        test(module) {
                            return (
                                /node_modules.tinymce/.test(module.resource) === true &&
                                !module.resource.includes("tinymce-i18n") &&
                                !module.resource.includes("plugins")
                            );
                        },
                        chunks: "async",
                    },
                    select2: {
                        name: "select2",
                        test: /[\\/]node_modules[\\/]select2.*[\\/]/,
                        chunks: "async",
                    },
                    mosaic: {
                        name: "mosaic",
                        test: /[\\/]resources[\\/]/,
                        chunks: "async",
                    },
                },
            },
        },
    };

    config = webpack_config({
        config: config,
        package_json: package_json,
    });
    config.output.path = path.resolve(__dirname, "src/plone/app/mosaic/browser/static");

    config.plugins.push(
        mf_config({
            name: "plone-mosaic",
            filename: "plone-mosaic-remote.min.js",
            remote_entry: config.entry["plone-mosaic.min"],
            dependencies: {
                ...package_json_patternslib.dependencies,
                ...package_json_mockup.dependencies,
                ...package_json.dependencies,
            },
        })
    );

    if (process.env.NODE_ENV === "development") {
        config.devServer.port = "8011";
        config.devServer.static.directory = __dirname;
    }

    // console.log(JSON.stringify(config, null, 4));

    return config;
};
