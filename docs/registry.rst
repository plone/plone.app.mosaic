Mosaic registry configuration
=============================

.. WIP documentation about Mosaic registry configuration

It's possibly to hide specific content layouts being available in Mosaic
editor's *Select layout*-menu with a custom regisry configuration. For
example, the following configuration will

1) hide ``custom/basic.html`` from all content types

2) hide ``default/basic.html`` from *MyPortalType*

.. code::

   <record name="plone.app.mosaic.hidden_content_layouts">
     <field type="plone.registry.field.List">
       <title>Hidden content layouts</title>
       <value_type type="plone.registry.field.TextLine" />
     </field>
     <value purge="true">
       <element>custom/basic.html</element>
       <element>default/basic.html::MyPortalType</element>
     </value>
   </record>
