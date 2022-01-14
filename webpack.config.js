process.traceDeprecation = true;
const path = require("path");
const mockup_config = require("mockup/webpack.config.js");

module.exports = async (env, argv) => {

    let config = {
        entry: {
            mosaic-bundle: path.resolve(__dirname, "resources/mosaic-bundle-config"),
        },
    };
    const config = await mockup_config(env, argv, __dirname);
    config.output.path = path.resolve(
        __dirname,
        "src/plone/app/mosaic/browser/static"
    );

    return config;
};
