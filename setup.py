# -*- coding: utf-8 -*-
from setuptools import find_packages
from setuptools import setup


setup(
    # metadata in setup.cfg
    name="plone.app.mosaic",
    packages=find_packages("src"),
    package_dir={"": "src"},
    namespace_packages=["plone", "plone.app"],
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.8",
    install_requires=[
        "setuptools",
        "Products.CMFPlone",
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
