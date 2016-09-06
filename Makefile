BUILDOUT_BIN ?= $(shell command -v buildout || echo 'bin/buildout')
BUILDOUT_ARGS ?=

SHELL = /usr/bin/env bash
export PATH := $(PATH):node_modules/.bin

STATIC = src/plone/app/mosaic/browser/static

SOURCE_JS = build.js $(shell find $(STATIC)/js -name "*.js")
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

all: build

build: $(BUNDLE_JS) $(BUNDLE_LESS)

install:
	npm install
	./node_modules/bower/bin/bower install

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

$(BUNDLE_LESS): $(SOURCE_LESS)
	lessc $(LESS_OPTS) $(STATIC)/css/mosaic.pattern.less > $(BUNDLE_LESS)

watch:
	watch make $(STATIC)

clean:
	rm -f $(BUNDLE_JS) $(BUNDLE_JS).map $(BUNDLE_LESS)

watch_instance: bin/instance
	RELOAD_PATH=src bin/instance fg

watch_webpack: node_modules webpack.config.js
watch_webpack: $(wildcard resources/src/plone-mosaic/*)
	webpack-dev-server || sleep 10 && webpack-dev-server

watch_theme: bin/instance
	rm -rf resources/theme/plone-mosaic
	make -j watch_instance watch_webpack

###

.PHONY: clean r.js

node_modules: package.json
	npm install
	touch node_modules

bootstrap-buildout.py:
	curl -k -O https://bootstrap.pypa.io/bootstrap-buildout.py

bin/buildout: bootstrap-buildout.py buildout.cfg
	python bootstrap-buildout.py -c buildout.cfg

bin/instance: $(BUILDOUT_BIN) buildout.cfg develop.cfg
	$(BUILDOUT_BIN) -N $(BUILDOUT_ARGS) -c develop.cfg \
	  install instance plonesite
