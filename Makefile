RJS_CMD = node_modules/requirejs/bin/r.js
LESS_CMD = node_modules/less/bin/lessc
WATCH_CMD = node_modules/watch/cli.js

STATIC = src/plone/app/mosaic/browser/static

SOURCE_JS = $(shell find $(STATIC)/js -name "*.js")
BUNDLE_JS = $(STATIC)/plone-mosaic.js
SOURCE_LESS = $(shell find $(STATIC)/css -name "*.less")
BUNDLE_LESS = $(STATIC)/plone-mosaic.css
CURRENT_DIR = $(shell pwd)
LESS_OPTS = '--modify-var=staticPath="$(CURRENT_DIR)"'
RJS_OPTIONS = paths.pat-logger=$(CURRENT_DIR)/components/patternslib/src/core/logger paths.logging=$(CURRENT_DIR)/components/logging/src/logging


# if mode variable is empty, setting debug build mode
ifeq ($(mode),release)
    RJS_ARGS = -o build.js generateSourceMaps=false preserveLicenseComments=true $(RJS_OPTIONS)
else
    RJS_ARGS = -o build.js $(RJS_OPTIONS)
endif

all: $(BUNDLE_JS) $(BUNDLE_LESS)

install:
	npm install
	./node_modules/.bin/bower install

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
	$(LESS_CMD) $(LESS_OPTS) $(STATIC)/css/mosaic.pattern.less > $(BUNDLE_LESS)

watch:
	$(WATCH_CMD) make $(STATIC)

clean:
	rm -f $(BUNDLE_JS) $(BUNDLE_JS).map $(BUNDLE_LESS)

.PHONY: clean $(RJS_CMD)
