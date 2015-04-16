RJS_CMD = node_modules/requirejs/bin/r.js
LESS_CMD = node_modules/less/bin/lessc
WATCH_CMD = node_modules/watch/cli.js

STATIC = src/plone/app/mosaic/browser/static

SOURCE_JS = $(shell find $(STATIC)/js -name "*.js")
BUNDLE_JS = $(STATIC)/plone-mosaic.js
SOURCE_LESS = $(STATIC)/css/mosaic.pattern.less
BUNDLE_LESS = $(STATIC)/plone-mosaic.css
LESS_OPTS = '--modify-var=plone-mosaic-bootstrap="bower_components/bootstrap"'

# if mode variable is empty, setting debug build mode
ifeq ($(mode),release)
    RJS_ARGS = -o build.js generateSourceMaps=false preserveLicenseComments=true
else
    RJS_ARGS = -o build.js
endif

all: $(BUNDLE_JS) $(BUNDLE_LESS)

$(BUNDLE_JS): $(SOURCE_JS)
	$(RJS_CMD) $(RJS_ARGS)
	cp $(BUNDLE_JS) $(BUNDLE_JS).tmp
	grep -v sourceMapping $(BUNDLE_JS).tmp > $(BUNDLE_JS)
	cat $(STATIC)/js/mosaic.pattern.js >> $(BUNDLE_JS)
ifeq ($(mode),release)
else
	echo '' >> $(BUNDLE_JS)
	grep sourceMapping $(BUNDLE_JS).tmp >> $(BUNDLE_JS)
endif
	rm $(BUNDLE_JS).tmp

$(BUNDLE_LESS): $(SOURCE_LESS)
	$(LESS_CMD) $(LESS_OPTS) $(SOURCE_LESS) > $(BUNDLE_LESS)

watch:
	$(WATCH_CMD) make $(STATIC)

clean:
	rm -f $(BUNDLE_JS) $(BUNDLE_JS).map $(BUNDLE_LESS)

.PHONY: clean $(RJS_CMD)
