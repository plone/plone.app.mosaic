Structure tiles in mosaic layout
================================

Problem
-------

You can not have structure tiles (e.g Text, Table, Bulleted list ...) in a saved layout that are editable. The reason for this is, that the text is saved in the layout.

..  image:: _screenshots/add_structure_tile.png

You can see it, if you change the view of a content type with customized layout back to something else than "Mosaic layout" (e.g. "View Document"). Now edit the object, chose Layout and have a look at "Custom layout" field.

..  image:: _screenshots/custom_layout_field.png

If you save this layout and use it for an other content objects you will not be able to edit the value of the field because it is saved in layout.

Solution
--------

There is a hidden tile named `plone.app.standardtiles.html` that stores its data at content object (see registry.xml in plone.app.mosaic). To enable it you has to set the value of `category` to `structure`. You can do this in a registry.xml in your project.

.. code-block:: xml

  <records prefix="plone.app.mosaic.app_tiles.plone_app_standardtiles_html"
           interface="plone.app.mosaic.interfaces.ITile">
    <value key="category">structure</value>
  </records>


If you reinstall plone.app.mosaic this tile will be hidden again, so you have to reinstall your product too.
You can also register this tile with a new prefix:

.. code-block:: xml

  <records prefix="plone.app.mosaic.app_tiles.plone_app_standardtiles_html_my"
           interface="plone.app.mosaic.interfaces.ITile">
    <value key="name">plone.app.standardtiles.html</value>
    <value key="label">my Rich Text</value>
    <value key="category">structure</value>
    <value key="tile_type">textapp</value>
    <value key="default_value">Hallo Welt</value>
    <value key="read_only">false</value>
    <value key="settings">false</value>
    <value key="favorite">false</value>
    <value key="rich_text">true</value>
    <value key="weight">110</value>
  </records>

But now you might notice that the tinyMCE buttons are missing. To add them add the following to your registry.xml

.. code-block:: xml

  <record name="plone.app.mosaic.app_tiles.plone_app_standardtiles_html_my.available_actions">
    <field type="plone.registry.field.List">
      <title>Available actions for my html tile</title>
      <value_type type="plone.registry.field.TextLine" />
    </field>
    <value>
      <element>toolbar-bold</element>
      <element>toolbar-italic</element>
      <element>toolbar-alignleft</element>
      <element>toolbar-aligncenter</element>
      <element>toolbar-alignright</element>
      <element>toolbar-alignjustify</element>
    </value>
  </record>

Make sure that the first part of the name of this record matches the prefix of your tile record! You can find more names of tinyMCE buttons in plone.app.mosaics registry.xml.

Question: Can I add multiple tiles with different names and different tinyMCE buttons set?
