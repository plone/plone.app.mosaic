process.traceDeprecation = true;
const path = require("path");
const mockup_config = require("mockup/webpack.config.js");

module.exports = async (env, argv) => {
    let config = {
        entry: {
            "plone-mosaic": path.resolve(__dirname, "resources/plone-mosaic-config"),
            "layouts-editor": path.resolve(__dirname, "resources/js/layouts-editor"),
        },
    };
    config = await mockup_config(env, argv, __dirname);
    config.output.path = path.resolve(__dirname, "src/plone/app/mosaic/browser/static");

    return config;
};
