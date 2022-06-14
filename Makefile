# Makefile to configure and run Plone instance

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

# Colors
# OK=Green, warn=yellow, error=red
ifeq ($(TERM),)
# no colors if not in terminal
	MARK_COLOR=
	OK_COLOR=
	WARN_COLOR=
	ERROR_COLOR=
	NO_COLOR=
else
	MARK_COLOR=`tput setaf 6`
	OK_COLOR=`tput setaf 2`
	WARN_COLOR=`tput setaf 3`
	ERROR_COLOR=`tput setaf 1`
	NO_COLOR=`tput sgr0`
endif

##############################################################################
# SETTINGS AND VARIABLE
# adjust to your project needs
PROJECT_NAME=plone.app.mosaic
IMAGE_NAME=${PROJECT_NAME}
CONSTRAINTS_IN=constraints.txt
CONSTRAINTS_IN=constraints.txt
CONSTRAINTS_MXDEV=constraints-mxdev.txt
PIP_REQUIREMENTS_IN_FILE=requirements.txt
ADDONBASE=./
ADDONFOLDER=${ADDONBASE}src/
INSTANCE_YAML=instance.yaml
INSTANCE_FOLDER=instance

PIP_PARAMS= --pre

##############################################################################
# targets and prerequisites
# target has to be one file, otherwise step gets executes for each file separate
PREPARE_PREREQUISITES=${PIP_REQUIREMENTS_IN_FILE} ${CONSTRAINTS_IN} sources.ini ${ADDONBASE}setup.py
PREPARE_TARGET=requirements-mxdev.txt
INSTALL_PREREQUSISTES=${PREPARE_TARGET}
INSTALL_TARGET=.installed.txt
INSTANCE_PREREQUISITES=${INSTALL_TARGET} ${INSTANCE_YAML}
INSTANCE_TARGET=${INSTANCE_FOLDER}/etc/zope.ini ${INSTANCE_FOLDER}/etc/zope.conf ${INSTANCE_FOLDER}/etc/site.zcml
TEST_PREREQUISITES=${INSTALL_TARGET}
RUN_PREREQUISITES=${INSTANCE_TARGET}

##############################################################################
# CONVINIENCE

# install and run
.PHONY: all # full install, test and run
all:style test run

# Add the following 'help' target to your Makefile
# And add help text after each target name starting with '\#\#'
.PHONY: help
help: ## This help message
	@echo "${OK_COLOR}This is the Makefile for ${WARN_COLOR}${PROJECT_NAME}${NO_COLOR}"
	@echo
	@echo "${WARN_COLOR}Additional parameters:${NO_COLOR}"
	@echo "${MARK_COLOR}PYTHON${NO_COLOR}:       python interpreter to be used (default: python3)"
	@echo "${MARK_COLOR}VENV${NO_COLOR}:        [on|off] wether to create a Python virtual environment or not (default: off)"
	@echo "${MARK_COLOR}VENV_FOLDER${NO_COLOR}: location of the virtual environment (default: ./venv)"
	@echo
	@echo "${WARN_COLOR}Targets:${NO_COLOR}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

##############################################################################
# targets and prerequisites
# target has to be one file, otherwise step gets executes for each file separate
PREPARE_PREREQUISITES=${PIP_REQUIREMENTS_IN_FILE} ${CONSTRAINTS_IN} sources.ini ${ADDONBASE}setup.cfg
PREPARE_TARGET=requirements-mxdev.txt
INSTALL_PREREQUSISTES=${PREPARE_TARGET}
INSTALL_TARGET=.installed.txt
INSTANCE_PREREQUISITES=${INSTALL_TARGET} ${INSTANCE_YAML}
INSTANCE_TARGET=${INSTANCE_FOLDER}/etc/zope.ini ${INSTANCE_FOLDER}/etc/zope.conf ${INSTANCE_FOLDER}/etc/site.zcml
TEST_PREREQUISITES=${INSTALL_TARGET}
RUN_PREREQUISITES=${INSTANCE_TARGET}

##############################################################################
# BASE

SENTINELFOLDER=.make-sentinels/
SENTINEL=${SENTINELFOLDER}ABOUT.txt
${SENTINEL}:
	@mkdir -p ${SENTINELFOLDER}
	@echo "Sentinels for the Makefile process." > ${SENTINEL}

# PYTHON, VENV, PIP
# venv and pybin
PYTHON?=python3
VENV?=off
ifeq ("${VENV}", "on")
	VENV_FOLDER?=./venv
	PYBIN=${VENV_FOLDER}/bin/
else
	VENV_FOLDER?=
	ifneq ("${VENV_FOLDER}", "")
		PYBIN=${VENV_FOLDER}/bin/
		PYTHON=${PYBIN}python
	else
		PYBIN=
	endif
endif

# installed?
ifeq (, $(shell which $(PYTHON) ))
  $(error "PYTHON=$(PYTHON) not found in $(PATH)")
endif

# version ok?
PYTHON_VERSION_MIN=3.7
PYTHON_VERSION_OK=$(shell $(PYTHON) -c 'import sys; print(int(float("%d.%d"% sys.version_info[0:2]) >= float($(PYTHON_VERSION_MIN))))' )
ifeq ($(PYTHON_VERSION_OK),0)
  $(error "Need python $(PYTHON_VERSION) >= $(PYTHON_VERSION_MIN)")
endif

VENV_SENTINEL=${SENTINELFOLDER}venv.sentinel
${VENV_SENTINEL}: ${SENTINEL}
ifeq ("${VENV}", "on")
	@echo "$(OK_COLOR)Setup Python Virtual Environment under '${VENV_FOLDER}' $(NO_COLOR)"
	@${PYTHON} -m venv ${VENV_FOLDER}
else
	@echo "$(OK_COLOR)Use current local or global Python: `which ${PYTHON}` $(NO_COLOR)"
endif
	@touch ${VENV_SENTINEL}

PIP_SENTINEL=${SENTINELFOLDER}pip.sentinel
${PIP_SENTINEL}: ${VENV_SENTINEL} ${CONSTRAINTS_IN} ${SENTINEL}
	@echo "$(OK_COLOR)Install pip$(NO_COLOR)"
	@${PYBIN}pip install -U "pip>=22.0.2" wheel setuptools
	@touch ${PIP_SENTINEL}

##############################################################################
# MXDEV

MXDEV_SENTINEL=${SENTINELFOLDER}pip-mxdev.sentinel
${MXDEV_SENTINEL}: ${PIP_SENTINEL}
	@echo "$(OK_COLOR)Install mxdev$(NO_COLOR)"
	@${PYBIN}pip install "mxdev>=2.0.0" libvcs==0.11.1
	@touch ${MXDEV_SENTINEL}

.PHONY: prepare
prepare: ${PREPARE_TARGET} ## prepare soures and dependencies

${PREPARE_PREREQUISITES}:
	@touch $@

${PREPARE_TARGET}: ${MXDEV_SENTINEL} ${PREPARE_PREREQUISITES}
	@echo "$(OK_COLOR)Prepare sources and dependencies$(NO_COLOR)"
	@${PYBIN}mxdev -c sources.ini

.PHONY: install
install: ${INSTALL_TARGET} ## pip install all dependencies and scripts

${INSTALL_TARGET}: ${PREPARE_TARGET}
	@echo "$(OK_COLOR)Install dependencies and scripts$(NO_COLOR)"
	@${PYBIN}pip install -r ${PREPARE_TARGET} ${PIP_PARAMS}
	@${PYBIN}pip freeze >${INSTALL_TARGET}

##############################################################################
# INSTANCE

COOKIECUTTER_SENTINEL=${SENTINELFOLDER}pip-cookiecutter.sentinel
${COOKIECUTTER_SENTINEL}:
	@echo "$(OK_COLOR)Install cookiecutter$(NO_COLOR)"
	@${PYBIN}pip install git+https://github.com/cookiecutter/cookiecutter.git#egg=cookiecutter
	@touch ${COOKIECUTTER_SENTINEL}

${INSTANCE_YAML}:
	@touch ${INSTANCE_YAML}

.PHONY: instance
instance: ${INSTANCE_TARGET} ## create configuration for an zope (plone) instance

${INSTANCE_TARGET}: ${INSTANCE_PREREQUISITES} ${COOKIECUTTER_SENTINEL}
	@echo "$(OK_COLOR)Create Plone/Zope configuration$(NO_COLOR)"
	@${PYBIN}cookiecutter -f --no-input --config-file ${INSTANCE_YAML} https://github.com/bluedynamics/cookiecutter-zope-instance
##############################################################################
# TESTING

TESTRUNNER_SENTINEL=${SENTINELFOLDER}pip-testrunner.sentinel
${TESTRUNNER_SENTINEL}: ${PIP_SENTINEL}
	@echo "$(OK_COLOR)Install zope.testrunner$(NO_COLOR)"
	@${PYBIN}pip install -c ${CONSTRAINTS_MXDEV} zope.testrunner
	@touch ${TESTRUNNER_SENTINEL}

.PHONY: test
test: ${TEST_PREREQUISITES} ${TESTRUNNER_SENTINEL} ## run tests
	@echo "$(OK_COLOR)Run addon tests$(NO_COLOR)"
	@${PYBIN}zope-testrunner --all --auto-color --auto-progress --test-path=${ADDONFOLDER}

.PHONY: test-ignore-warnings
test-ignore-warnings: ${TEST_PREREQUISITES} ${TESTRUNNER_SENTINEL}  ## run tests (hide warnins)
	@echo "$(OK_COLOR)Run addon tests$(NO_COLOR)"
	@PYTHONWARNINGS=ignore ${PYBIN}zope-testrunner --all --auto-color --auto-progress --test-path=${ADDONFOLDER}

##############################################################################
# CODE FORMATTING

BLACK_SENTINEL=${SENTINELFOLDER}pip-black.sentinel
${BLACK_SENTINEL}: ${PREPARE_TARGET}
	@echo "$(OK_COLOR)Install black$(NO_COLOR)"
	@${PYBIN}pip install -c ${CONSTRAINTS_MXDEV} black
	@touch ${BLACK_SENTINEL}

ISORT_SENTINEL=${SENTINELFOLDER}pip-isort.sentinel
${ISORT_SENTINEL}: ${PREPARE_TARGET}
	@echo "$(OK_COLOR)Install isort$(NO_COLOR)"
	@${PYBIN}pip install -c ${CONSTRAINTS_MXDEV} isort
	@touch ${ISORT_SENTINEL}

ZPRETTY_SENTINEL=${SENTINELFOLDER}pip-zpretty.sentinel
${ZPRETTY_SENTINEL}: ${PREPARE_TARGET}
	@echo "$(OK_COLOR)Install zpretty$(NO_COLOR)"
	@${PYBIN}pip install -c ${CONSTRAINTS_MXDEV} "zpretty>=2.2.0"
	@touch ${ZPRETTY_SENTINEL}

.PHONY: apply-style-black
apply-style-black: ${BLACK_SENTINEL}  ## apply/format code style black (to Python files)
	@echo "$(OK_COLOR)Apply style black rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@${PYBIN}black ${ADDONFOLDER}

.PHONY: apply-style-isort
apply-style-isort: ${ISORT_SENTINEL} ## apply/format code style isort (sorted imports in Python files)
	@echo "$(OK_COLOR)Apply style isort rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@${PYBIN}isort ${ADDONFOLDER}

.PHONY: apply-style-zpretty
apply-style-zpretty: ${ZPRETTY_SENTINEL}   ## apply/format code style zpretty (to XML/ZCML files)
	@echo "$(OK_COLOR)Apply style zpretty rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@find ${ADDONFOLDER} -name '*.zcml' -exec ${PYBIN}zpretty -iz {} +
	@find ${ADDONFOLDER} -name "*.xml"|grep -v locales|xargs ${PYBIN}zpretty -ix

.PHONY: style ## apply code styles black, isort and zpretty
style: apply-style-black apply-style-isort apply-style-zpretty

.PHONY: format ## alias for "style"
FORMATTING: style

.PHONY: lint-black
lint-black: ${BLACK_SENTINEL}  ## lint code-style black (to Python files)
	@echo "$(OK_COLOR)Lint black rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@${PYBIN}black --check ${ADDONFOLDER}

.PHONY: lint-isort
lint-isort: ${ISORT_SENTINEL} ## lint code-style isort (sorted imports in Python files)
	@echo "$(OK_COLOR)Apply style isort rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@${PYBIN}isort --check-only ${ADDONFOLDER}

.PHONY: lint-zpretty
lint-zpretty: ${ZPRETTY_SENTINEL}   ## lint code-style zpretty (to XML/ZCML files)
	@echo "$(OK_COLOR)Apply style zpretty rules to code in ${ADDONFOLDER}/*$(NO_COLOR)"
	@find ${ADDONFOLDER} -name '*.zcml' -exec ${PYBIN}zpretty --check -z {} +
	@find ${ADDONFOLDER} -name '*.xml'|grep -v locales|xargs zpretty --check -x

.PHONY: lint ## lint all: check if complies with code-styles black, isort and zpretty
lint: lint-black lint-isort lint-zpretty

##############################################################################
# RUN

.PHONY: run
run: ${RUN_PREREQUISITES} ## run/start Plone
	@echo "$(OK_COLOR)Run Plone$(NO_COLOR)"
	@${PYBIN}runwsgi -v instance/etc/zope.ini

##############################################################################
# CLEAN
.PHONY: clean-venv
clean-venv: ## remove Python virtual environment
ifeq ("${VENV}", "on")
	@echo "$(OK_COLOR)Remove Virtualenv.$(NO_COLOR)"
	rm -rf ${VENV_FOLDER} ${SENTINELFOLDER}/pip*.sentinel ${VENV_SENTINEL}
else:
	@echo "$(OK_WARN)No self-created Python virtualenv at '${VENV_FOLDER}'! Nothing to do.$(NO_COLOR)"
endif

.PHONY: clean-pyc
clean-pyc: ## remove Python file artifacts
	@echo "$(OK_COLOR)Remove Python file artifacts (like byte-code) of code in current directory.$(NO_COLOR)"
	find . -name '*.py[c|o]' -delete
	find . -name '*.mo' -delete
	find . -name '*~' -exec rm -f {} +
	find . -name '__pycache__' -exec rm -fr {} +

.PHONY: clean-make
clean-make:  ## remove make artifact	@echo "$(OK_COLOR)Remove Plone/Zope configuration (keeps data) and sentinel files.$(NO_COLOR)"
	rm -rf ${INSTALL_PREREQUSISTES} ${INSTANCE_TARGET} ${SENTINELFOLDER}

.PHONY: clean-instance
clean-instance:  ## remove instance configuration (keeps data)
	@echo "$(OK_COLOR)Remove Plone/Zope configuration (keeps data) and sentinel files.$(NO_COLOR)"
	rm -f ${INSTANCE_TARGET}

.PHONY: clean-resources
clean-resources:  ## clean npm packages
	@echo "$(OK_COLOR)Remove npm packages.$(NO_COLOR)"
	rm -rf node_modules/

.PHONY: clean-tests
clean-tests:  ## clean test output
	@echo "$(OK_COLOR)Remove test output files.$(NO_COLOR)"
	rm -rf robot_* test_*

.PHONY: clean
clean:  clean-venv clean-pyc clean-make clean-instance clean-resources clean-tests   ## clean all (except local database and pip installed packages)

##############################################################################
# DOCKER/CONTAINER

# this needs a Dockerfile, which is not provided by plone-kickstarter
.PHONY: build-image
build-image:  ## Build Docker Image
ifneq ("$(wildcard Dockerfile)", "")
	@docker build . -t $(IMAGE_NAME) -f Dockerfile
else
	@echo "$(ERROR_COLOR)A 'Dockerfile' is required to build an image.$(NO_COLOR)"
endif


YARN   ?= npx yarn


.PHONY:
watch:
	$(YARN) run watch:webpack


.PHONY:
bundle:
	$(YARN) run build


#
