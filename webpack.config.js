process.traceDeprecation = true;
const path = require("path");
const patternslib_config = require("@patternslib/patternslib/webpack/webpack.config");

module.exports = async (env, argv) => {
    let config = {
        entry: {
            "plone-mosaic": path.resolve(__dirname, "resources/plone-mosaic-config"),
            "layouts-editor": path.resolve(__dirname, "resources/js/layouts-editor"),
        },
    };

    config = patternslib_config(env, argv, config, ["mockup"]);
    config.output.path = path.resolve(__dirname, "src/plone/app/mosaic/browser/static");

    return config;
};
