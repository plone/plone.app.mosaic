({
    baseUrl: 'src/plone/app/mosaic/browser/static/js',
    name: 'mosaic.pattern',
    out: 'src/plone/app/mosaic/browser/static/plone-mosaic.js',
    optimize: 'uglify2',
    generateSourceMaps: true,
    preserveLicenseComments: false,
    paths: {
        'jquery': 'empty:',
        'tinymce': 'empty:',
        'underscore': 'empty:',
        'pat-base': 'empty:',
        'pat-logger': 'empty:',
        'pat-registry': 'empty:',
        'mockup-patterns-modal': 'empty:',
        'mockup-patterns-tinymce': 'empty:',
        'mockup-patterns-relateditems': 'empty:',
        'mockup-utils': 'empty:',
        'mosaic-url': ''
    }
})
