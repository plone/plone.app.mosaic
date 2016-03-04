#!/bin/sh

# bootstrap using pip
rm -r ./lib ./include ./local ./bin
virtualenv --clear .
./bin/pip install -r requirements.txt
./bin/buildout $*
