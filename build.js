({
    baseUrl: 'src/plone/app/mosaic/browser/static/js',
    name: 'mosaic.core',
    include: [
      'mosaic.actions',
      'mosaic.editor',
      'mosaic.layout',
      'mosaic.overlay',
      'mosaic.tile',
      'mosaic.toolbar',
      'mosaic.undo',
      'mosaic.upload'
    ],
    out: 'src/plone/app/mosaic/browser/static/plone-mosaic.js',
    optimize: 'uglify2',
    generateSourceMaps: true,
    preserveLicenseComments: false,
    paths: {
        'jquery': 'empty:',
        'tinymce': 'empty:',
        'underscore': 'empty:',
        'mockup-utils': 'empty:',
        'mockup-patterns-modal': 'empty:',
        'mockup-patterns-tinymce': 'empty:',
        'mosaic-url': ''
    }
})

