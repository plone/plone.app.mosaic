# -*- coding: utf-8 -*-
from setuptools import find_packages
from setuptools import setup


version = "3.0.0.dev0"

long_description = open("README.rst").read() + "\n" + open("CHANGES.rst").read() + "\n"

setup(
    name="plone.app.mosaic",
    version=version,
    description="Plone Mosaic Site Builder and Site Layout",
    long_description=long_description,
    # Get more strings from
    # http://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Web Environment",
        "Framework :: Plone",
        "Framework :: Plone :: 6.0",
        "License :: OSI Approved :: GNU General Public License v2 (GPLv2)",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords="site builder collage",
    author="The Plone Community",
    author_email="foundation@plone.org",
    url="https://github.com/plone/plone.app.mosaic",
    license="gpl",
    packages=find_packages("src"),
    package_dir={"": "src"},
    namespace_packages=["plone", "plone.app"],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        "setuptools",
        "Products.CMFPlone>=6.0.0a4",
        "plone.subrequest",
        "plone.app.blocks",
        "plone.app.tiles",
        "plone.app.drafts",
        "plone.app.standardtiles",
    ],
    extras_require={
        "test": [
            "plone.app.testing",
            "plone.app.contenttypes",
            "plone.app.robotframework",
            "robotframework-selenium2library",
        ]
    },
    entry_points="""
    # -*- Entry points: -*-
    [z3c.autoinclude.plugin]
    target = plone
    """,
)
