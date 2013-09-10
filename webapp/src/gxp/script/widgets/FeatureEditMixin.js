Ext.namespace("gxp");

gxp.FeatureEditMixin = {
    
        /** i18n **/
        closeMsgTitle: 'Save Changes?',
        closeMsg: 'This feature has unsaved changes. Would you like to save your changes?',
        deleteMsgTitle: 'Delete Feature?',
        deleteMsg: 'Are you sure you want to delete this feature?',
        editButtonText: 'Edit',
        editButtonTooltip: 'Make this feature editable',
        deleteButtonText: 'Delete',
        deleteButtonTooltip: 'Delete this feature',
        cancelButtonText: 'Cancel',
        cancelButtonTooltip: 'Stop editing, discard changes',
        saveButtonText: 'Save',
        saveButtonTooltip: 'Save changes',
        orthoButtonText: 'Right Angle',
        orthoButtonTooltip: 'Make a polygon orthogonalized',
        /** private config overrides **/
        layout: "fit",
        
        /** api: config[feature]
         *  ``OpenLayers.Feature.Vector``|``GeoExt.data.FeatureRecord`` The feature
         *  to edit and display.
         */
        
        /** api: config[vertexRenderIntent]
         *  ``String`` renderIntent for feature vertices when modifying. Undefined
         *  by default.
         */
        
        /** api: property[feature]
         *  ``OpenLayers.Feature.Vector`` The feature being edited/displayed.
         */
        feature: null,
        
        /** api: config[schema]
         *  ``GeoExt.data.AttributeStore`` Optional. If provided, available
         *  feature attributes will be determined from the schema instead of using
         *  the attributes that the feature has currently set.
         */
        schema: null,
        
        /** api: config[fields]
         *  ``Array``
         *  List of field config names corresponding to feature attributes.  If
         *  not provided, fields will be derived from attributes. If provided,
         *  the field order from this list will be used, and fields missing in the
         *  list will be excluded.
         */

        /** api: config[excludeFields]
         *  ``Array`` Optional list of field names (case sensitive) that are to be
         *  excluded from the editor plugin.
         */
        
        /** private: property[excludeFields]
         */
        
        /** api: config[propertyNames]
         *  ``Object`` Property name/display name pairs. If specified, the display
         *  name will be shown in the name column instead of the property name.
         */

        /** api: config[readOnly]
         *  ``Boolean`` Set to true to disable editing. Default is false.
         */
        readOnly: false,
        
        /** api: config[allowDelete]
         *  ``Boolean`` Set to true to provide a Delete button for deleting the
         *  feature. Default is false.
         */
        allowDelete: false,
        
        /** api: config[editing]
         *  ``Boolean`` Set to true to open the panel in editing mode.
         *  Default is false.
         */
        
        /** api: config[dateFormat]
         *  ``String`` Date format. Default is the value of
         *  ``Ext.form.DateField.prototype.format``.
         */
            
        /** api: config[timeFormat]
         *  ``String`` Time format. Default is the value of
         *  ``Ext.form.TimeField.prototype.format``.
         */

        /** private: property[editing]
         *  ``Boolean`` If we are in editing mode, this will be true.
         */
        editing: false,

        /** api: editorPluginConfig
         *  ``Object`` The config for the plugin to use as the editor, its ptype
         *  property can be one of "gxp_editorgrid" (default) or "gxp_editorform" 
         *  for form-based editing.
         */
        editorPluginConfig: {
            ptype: "gxp_editorgrid"
        },

        /** private: property[modifyControl]
         *  ``OpenLayers.Control.ModifyFeature`` If in editing mode, we will have
         *  this control for editing the geometry.
         */
        modifyControl: null,
        
        /** private: property[geometry]
         *  ``OpenLayers.Geometry`` The original geometry of the feature we are
         *  editing.
         */
        geometry: null,
        
        /** private: property[attributes]
         *  ``Object`` The original attributes of the feature we are editing.
         */
        attributes: null,
        
        /** private: property[cancelButton]
         *  ``Ext.Button``
         */
        cancelButton: null,
        
        /** private: property[saveButton]
         *  ``Ext.Button``
         */
        saveButton: null,
        
        /** private: property[editButton]
         *  ``Ext.Button``
         */
        editButton: null,
        
        /** private: property[deleteButton]
         *  ``Ext.Button``
         */
        deleteButton: null,

        orthoButton: null,
        
        pointEditButton: null,

        map: null,
        
        /** private: method[getDirtyState]
         *  Get the appropriate OpenLayers.State value to indicate a dirty feature.
         *  We don't cache this value because the panel may remain open through
         *  several state changes.
         */
        getDirtyState: function() {
            return this.feature.state === OpenLayers.State.INSERT ?
                    this.feature.state : OpenLayers.State.UPDATE;
        },
    
        /** private: method[setFeatureState]
         *  Set the state of this popup's feature and trigger a featuremodified
         *  event on the feature's layer.
         */
        setFeatureState: function(state) {
            this.feature.state = state;
            var layer = this.feature.layer;
            layer && layer.events.triggerEvent("featuremodified", {
            feature: this.feature
            });
        },
        

        
        initHelper: function() {                
            var feature = this.feature;
            if (feature instanceof GeoExt.data.FeatureRecord) {
                feature = this.feature = feature.getFeature();
            }
            if (!this.location) {
                this.location = feature;
            }
                
            this.editButton = new Ext.Button({
                text: this.editButtonText,
                tooltip: this.editButtonTooltip,
                iconCls: "edit",
                handler: this.startEditing,
                scope: this
            });
                
            this.deleteButton = new Ext.Button({
                text: this.deleteButtonText,
                tooltip: this.deleteButtonTooltip,
                iconCls: "delete",
                hidden: !this.allowDelete,
                handler: this.deleteFeature,
                scope: this
            });
                
            this.cancelButton = new Ext.Button({
                text: this.cancelButtonText,
                tooltip: this.cancelButtonTooltip,
                iconCls: "cancel",
                hidden: true,
                handler: function() {
                    this.stopEditing(false);
                },
                scope: this
            });
                
            this.saveButton = new Ext.Button({
                text: this.saveButtonText,
                tooltip: this.saveButtonTooltip,
                iconCls: "save",
                hidden: true,
                handler: function() {
                    this.stopEditing(true);
                },
                scope: this
            });
                
            this.orthoButton = new Ext.Button({
                text: this.orthoButtonText,
                tooltip: this.orthoButtonTooltip,
                hidden: true,
                iconCls: 'salamati-icon-rightangles',
                handler: function() {
                    var point;
                    var dragControl = this.modifyControl.dragControl;
                    var geometry = this.feature.geometry;

                    var success = gxp.Orthogonalization.orthogonalize(this.feature, this.map);
                    if(success === true) {
                        this.feature.layer.redraw();

                        for(var i = 0; i < geometry.components.length; i++){
                            for(var j = 0; j < geometry.components[i].components.length; j++){
                                for(var y = 0; y < geometry.components[i].components[j].components.length;y++){
                                    point = geometry.components[i].components[j].components[y];
                                    dragControl.feature = this.feature;
                                    pixel = new OpenLayers.Pixel(point.x, point.y);
                                    dragControl.downFeature(pixel);
                                    dragControl.moveFeature(pixel);
                                    dragControl.upFeature(pixel);
                                    dragControl.doneDragging(pixel);
                                }
                            }
                        }
                    }
                },
                scope: this
            });

            this.pointEditButton = new Ext.Button({
                text: "Lat/Lon",
                tooltip: "Move Point to specified Lat/Lon.",
                hidden: true,
                iconCls: 'salamati-icon-latlon',
                handler: function() { 
                    var geom = this.feature.geometry.clone();
                    geom.transform(GoogleMercator, WGS84);
                    var dragControl = this.modifyControl.dragControl;
                    var window = new Ext.Window({
                        closable: true,
                        modal: true,
                        draggable: false,
                        resizable: false,
                        hidden: false,
                        height: 200,
                        width: 500,
                        title: "Edit Point",
                        layout: "absolute",
                        items: [{
                            xtype: 'textfield',
                            allowBlank: false,
                            x: 75,
                            y: 30,
                            height: 30,
                            anchor: '95%',
                            emptyText: "Longitude",
                            minLength: 1,
                            value: OpenLayers.Util.getFormattedLonLat(geom.x, "lon", "dms")
                        },{
                            xtype: 'label',
                            x: 10,
                            y: 35,
                            text: "Longitude:"
                        },{
                            xtype: 'textfield',
                            allowBlank: false,
                            height: 30,
                            anchor: '95%',
                            x: 75,
                            y: 70,
                            emptyText: "Latitude",
                            minLength: 1,
                            value: OpenLayers.Util.getFormattedLonLat(geom.y, "lat", "dms")
                        },{
                            xtype: 'label',
                            x: 10,
                            y: 75,
                            text: "Latitude:"
                        },{
                            xtype: 'button',
                            text: "Apply",
                            y: 130,
                            x: 25,
                            height: 30,
                            anchor: '95%',
                            handler: function(){
                                var lon = window.items.items[0].getValue();
                                lon = lon.replace(/[^\dEWew\.]/g, " ").split(" ");
                                if(lon.length === 4) {
                                    var newlon = parseInt(lon[0]) + ((parseInt(lon[1]) + (parseFloat(lon[2])/60))/60);
                                    if(newlon < 0 || newlon > 180) {
                                        window.items.items[0].setValue(window.items.items[0].originalValue);
                                        alert("Invalid coordinates, goes outside of max/min boundaries for longitude");
                                        return;
                                    }
                                    if(lon[3] === "W" || lon[3] === "w") {
                                        newlon = -newlon;
                                    }   
                                } else {
                                    window.items.items[0].setValue(window.items.items[0].originalValue);
                                    alert("Invalid format, must have Degrees Minutes Seconds Direction");
                                    return;
                                }
                                var lat = window.items.items[2].getValue();
                                lat = lat.replace(/[^\dNSns\.]/g, " ").split(" ");
                                if(lat.length === 4) {
                                    var newlat = (parseInt(lat[0]) + ((parseInt(lat[1]) + (parseFloat(lat[2])/60))/60));
                                    if(newlat < 0 || newlat > 90) {
                                        window.items.items[2].setValue(window.items.items[2].originalValue);
                                        alert("Invalid coordinates, goes outside of max/min boundaries for latitude");
                                        return;
                                    }
                                    if(lat[3] === "S" || lat[3] === "s") {
                                        newlat = -newlat;
                                    }                                       
                                } else {
                                    window.items.items[2].setValue(window.items.items[2].originalValue);
                                    alert("Invalid format, must have Degrees Minutes Seconds Direction");
                                    return;
                                }                              
                                
                                geom.x = newlon;
                                geom.y = newlat;
                                
                                geom.transform(WGS84, GoogleMercator);

                                this.feature.geometry.x = geom.x;
                                this.feature.geometry.y = geom.y;
                                this.feature.layer.redraw();
                                dragControl.feature = this.feature;
                                pixel = new OpenLayers.Pixel(geom.x, geom.y);
                                dragControl.downFeature(pixel);
                                dragControl.moveFeature(pixel);
                                dragControl.upFeature(pixel);
                                dragControl.doneDragging(pixel);
                                app.mapPanel.map.setCenter([geom.x, geom.y]);
                                window.close();
                            }, scope: this
                        }]
                    });
                },
                scope: this
            });
                
            this.plugins = [Ext.apply({
                feature: feature,
                schema: this.schema,
                fields: this.fields,
                excludeFields: this.excludeFields,
                propertyNames: this.propertyNames,
                readOnly: this.readOnly
            }, this.editorPluginConfig)];
                
            this.bbar = new Ext.Toolbar({
                hidden: this.readOnly,
                items: [
                    this.editButton,
                    this.deleteButton,
                    this.saveButton,
                    this.cancelButton,
                    this.orthoButton,
                    this.pointEditButton
                ]
            });
        },
        
        /** private: method[startEditing]
         */
        startEditing: function() {
            if(!this.editing) {
                this.fireEvent("startedit", this);
                this.editing = true;
                if(this.anchored) {
                    this.anc && this.unanchorPopup();
                }
            
                this.editButton.hide();
                this.deleteButton.hide();
                this.saveButton.show();
                this.cancelButton.show();
                var bySegment = false;
                if(this.feature.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPolygon"
                    || this.feature.geometry.CLASS_NAME === "OpenLayers.Geometry.Polygon") {
                    this.orthoButton.show();
                    bySegment = true;
                } else if (this.feature.geometry.CLASS_NAME === "OpenLayers.Geometry.Point") {
                    this.pointEditButton.show();
                }

                this.geometry = this.feature.geometry && this.feature.geometry.clone();
                this.attributes = Ext.apply({}, this.feature.attributes);

                this.modifyControl = new OpenLayers.Control.ModifyFeature(
                        this.feature.layer,
                        {bySegment: bySegment, standalone: true, vertexRenderIntent: this.vertexRenderIntent}
                );
                this.feature.layer.map.addControl(this.modifyControl);
                this.modifyControl.activate();
                if (this.feature.geometry) {
                    this.modifyControl.selectFeature(this.feature);
                }
            }
        },
        
        /** private: method[stopEditing]
         *  :arg save: ``Boolean`` If set to true, changes will be saved and the
         *      ``featuremodified`` event will be fired.
         */
        stopEditing: function(save) {
            if(this.editing) {
                this.fireEvent("stopedit", this);
                //TODO remove the line below when
                // http://trac.openlayers.org/ticket/2210 is fixed.
                this.modifyControl.deactivate();
                this.modifyControl.destroy();
                
                var feature = this.feature;
                if (feature.state === this.getDirtyState()) {
                    if (save === true) {
                        this.fireEvent("beforefeaturemodified", this, feature);
                        //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                        // is resolved, remove the if clause below
                        if (this.schema) {
                            var attribute, rec;
                            for (var i in feature.attributes) {
                                rec = this.schema.getAt(this.schema.findExact("name", i));
                                attribute = feature.attributes[i];
                                if (attribute instanceof Date) {
                                    var type = rec.get("type").split(":").pop();
                                    feature.attributes[i] = attribute.format(
                                        type == "date" ? "Y-m-d" : "c"
                                    );
                                }
                            }
                        }
                        this.fireEvent("featuremodified", this, feature);
                        app.fireEvent("reloadHistory");
                    } else if(feature.state === OpenLayers.State.INSERT) {
                        this.editing = false;
                        feature.layer && feature.layer.destroyFeatures([feature]);
                        this.fireEvent("canceledit", this, null);
                        if(this.closable) {
                            this.close();
                        }
                    } else {
                        var layer = feature.layer;
                        layer.drawFeature(feature, {display: "none"});
                        feature.geometry = this.geometry;
                        feature.attributes = this.attributes;
                        this.setFeatureState(null);
                        layer.drawFeature(feature);
                        this.fireEvent("canceledit", this, feature);
                    }
                }

                if (!this.isDestroyed) {
                    this.cancelButton.hide();               
                    this.saveButton.hide();
                    if(!this.orthoButton.hidden) {
                        this.orthoButton.hide();
                    }
                    if(!this.pointEditButton.hidden) {
                        this.pointEditButton.hide();
                    }
                    this.editButton.show();
                    this.allowDelete && this.deleteButton.show();
                }
                
                this.editing = false;
            }
        },
        
        deleteFeature: function() {
            Ext.Msg.show({
                title: this.deleteMsgTitle,
                msg: this.deleteMsg,
                buttons: Ext.Msg.YESNO,
                fn: function(button) {
                    if(button === "yes") {
                        this.setFeatureState(OpenLayers.State.DELETE);
                        this.fireEvent("featuremodified", this, this.feature);
                        if(this.closable) {
                            this.close();
                        }
                    }
                },
                scope: this,
                icon: Ext.MessageBox.QUESTION,
                animEl: this.getEl()
            });
        }
};