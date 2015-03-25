RJS_CMD = node_modules/requirejs/bin/r.js
WATCH_CMD = node_modules/watch/cli.js

STATIC = src/plone/app/mosaic/browser/static

SOURCE_JS = $(shell find $(STATIC)/js -name "*.js")
BUNDLE_JS = $(STATIC)/plone-mosaic.js

# if mode variable is empty, setting debug build mode
ifeq ($(mode),release)
    RJS_ARGS = -o build.js generateSourceMaps=false preserveLicenseComments=true
else
    RJS_ARGS = -o build.js
endif

all: $(BUNDLE_JS)

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

watch:
	$(WATCH_CMD) make $(STATIC)/js

clean:
	rm -f $(BUNDLE_JS)

.PHONY: clean $(RJS_CMD)
