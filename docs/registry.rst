Mosaic registry configuration
=============================

.. WIP documentation about Mosaic registry configuration

It's possibly to hide specific content layouts being available in Mosaic
editor's *Select layout*-menu with a custom regisry configuration. For
example, the following configuration will

1) hide ``custom/basic.html`` from all content types

2) hide ``default/basic.html`` from *MyPortalType*

.. code:: xml

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


Enabling review action
----------------------

Mosaic includes a layout preview action (for previewing the
currently edited layout without the editor) in Layout menu
button. It's hidden by default, but can be enabled with the
following registry.xml entry:

.. code:: xml

  <record name="plone.app.mosaic.default_available_actions">
    <value purge="false">
      <element>preview</element>
    </value>
  </record>


In addition, preview action can be moved out of the layout as a separate
toolbar button with:k

.. code:: xml

  <records prefix="plone.app.mosaic.primary_actions.preview"
           interface='plone.app.mosaic.interfaces.IAction'>
    <value key="fieldset"></value>
    <value key="weight">40</value>
  </records>
