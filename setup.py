from pathlib import Path
from setuptools import find_packages
from setuptools import setup


long_description = (
    f"{Path('README.rst').read_text()}\n" f"{Path('CHANGES.rst').read_text()}"
)


setup(
    # metadata in setup.cfg
    name="plone.app.mosaic",
    version="3.2.5",
    description="Plone Mosaic Site Builder and Site Layout",
    long_description=long_description,
    long_description_content_type="text/x-rst",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Web Environment",
        "Framework :: Plone",
        "Framework :: Plone :: 6.0",
        "Framework :: Plone :: 6.1",
        "Framework :: Plone :: Addon",
        "Framework :: Zope :: 5",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
        "License :: OSI Approved :: GNU General Public License v2 (GPLv2)",
    ],
    keywords="Python Plone javascript mosaic grideditor",
    author="Plone Foundation",
    author_email="foundation@plone.org",
    url="https://github.com/plone/plone.app.mosaic",
    packages=find_packages("src"),
    package_dir={"": "src"},
    namespace_packages=["plone", "plone.app"],
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.8",
    install_requires=[
        "lxml",
        "plone.api",
        "plone.app.blocks",
        "plone.app.content",
        "plone.app.contentmenu",
        "plone.app.contenttypes",
        "plone.app.dexterity",
        "plone.app.drafts",
        "plone.app.layout",
        "plone.app.standardtiles",
        "plone.app.tiles",
        "plone.app.z3cform >= 4.1.0",  # deprecated plone.app.widgets
        "plone.autoform",
        "plone.base",
        "plone.dexterity",
        "plone.i18n",
        "plone.indexer",
        "plone.memoize",
        "plone.portlets",
        "plone.protect",
        "plone.resource",
        "plone.supermodel",
        "plone.tiles",
        "plone.transformchain",
        "repoze.xmliter",
        "Products.CMFCore",
        "Products.CMFPlone",
        "setuptools",
        "z3c.form",
    ],
    extras_require={
        "test": [
            "plone.testing",
            "plone.app.testing",
            "plone.app.contenttypes",
            "plone.app.robotframework",
            "plone.browserlayer",
            "robotsuite",
        ],
        "docs": [],
    },
    entry_points="""
    # -*- Entry points: -*-
    [z3c.autoinclude.plugin]
    target = plone
    """,
)
