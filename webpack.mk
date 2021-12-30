##############################################################################
# SETUP MAKE

## Defensive settings for make: https://tech.davis-hansson.com/p/make/
SHELL:=bash
.ONESHELL:
# for Makefile debugging purposes add -x to the .SHELLFLAGS
.SHELLFLAGS:=-eu -o pipefail -O inherit_errexit -c
.SILENT:
.DELETE_ON_ERROR:
MAKEFLAGS+=--warn-undefined-variables
MAKEFLAGS+=--no-builtin-rules

#export PATH := $(PATH):node_modules/.bin

JS_STATIC = src/plone/app/mosaic/browser/static
SOURCE_JS = build.js $(shell find $(JS_STATIC)/js -name "*.js")
BUNDLE_JS = $(JS_STATIC)/plone-mosaic.js
JS_CURRENT_DIR = $(shell pwd)
RJS_OPTIONS = paths.pat-logger=$(JS_CURRENT_DIR)/components/patternslib/src/core/logger paths.logging=$(JS_CURRENT_DIR)/components/logging/src/logging

# if mode variable is empty, setting debug build mode
ifeq ($(mode),release)
	RJS_ARGS = -o build.js generateSourceMaps=false preserveLicenseComments=true $(RJS_OPTIONS)
else
	RJS_ARGS = -o build.js $(RJS_OPTIONS)
endif

js_build: $(BUNDLE_JS)

js_install:
	@npm install
	@./node_modules/bower/bin/bower install

$(BUNDLE_JS): $(SOURCE_JS)
	r.js $(RJS_ARGS)
	cp $(BUNDLE_JS) $(BUNDLE_JS).tmp
	grep -v sourceMapping $(BUNDLE_JS).tmp > $(BUNDLE_JS)
ifeq ($(mode),release)
else
	echo '' >> $(BUNDLE_JS)
	grep sourceMapping $(BUNDLE_JS).tmp >> $(BUNDLE_JS)
endif
	rm $(BUNDLE_JS).tmp

js_watch:
	watch make $(JS_STATIC)

js_clean:
	rm -f $(BUNDLE_JS) $(BUNDLE_JS).map

js_watch_instance:
	RELOAD_PATH=src @${PYBIN}runwsgi -v instance/etc/zope.ini

js_watch_webpack: node_modules webpack.config.js
js_watch_webpack: $(wildcard resources/src/plone-mosaic/*)
	webpack-dev-server || sleep 10 && webpack-dev-server

js_watch_theme:
	rm -rf resources/theme/plone-mosaic
	make -j js_watch_instance js_watch_webpack

###

.PHONY: clean r.js

node_modules: package.json
	npm install
	touch node_modules
