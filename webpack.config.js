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
            "plone-mosaic.min": path.resolve(__dirname, "resources/index-plone-mosaic"),
            "layouts-editor.min": path.resolve(__dirname, "resources/index-layouts-editor"), // prettier-ignore
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
    config.plugins.push(
        mf_config({
            name: "layouts-editor",
            filename: "layouts-editor-remote.min.js",
            remote_entry: config.entry["layouts-editor.min"],
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
