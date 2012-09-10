/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/FeatureEditorGrid.js
 * @requires GeoExt/widgets/Popup.js
 * @requires OpenLayers/Control/ModifyFeature.js
 */
 
 /** api: constructor
 *  .. class:: FeatureEditPopup(config)
 *
 *      Create a new popup which displays the attributes of a feature and
 *      makes the feature editable,
 *      using an ``OpenLayers.Control.ModifyFeature``.
 */
 
Ext.namespace("gxp");
gxp.FeatureEditPopupValidate = Ext.extend(gxp.FeatureEditPopup, {
    initComponent: function() {
        gxp.FeatureEditPopupValidate.superclass.initComponent.call(this);
        
        var plugin = this;
        this.saveButton.handler = function() {
            var feature = plugin.feature;
            
            var geom = feature.geometry.clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
                        
            var wkt = geom.toString();
            
            //console.log(wkt);
           
            var jsonRequest = {
                geom : wkt,
                fid : feature.fid,
                typeName : app.selectedLayer.data.name,
                bounds : geom.getBounds().toString() 
            };
            
            var jsonFormat = new OpenLayers.Format.JSON();
            var requestData = jsonFormat.write(jsonRequest);
            var responseDataJson = null;
            
           // console.log(requestData);
            
            OpenLayers.Request.POST({
                url: addressOfWPS + "validate",
                proxy: null,
                data: requestData,
                headers: {
                    "Content-Type": "application/json"
                },
                success: function(response){
                    responseDataJson = JSON.parse(response.responseText);
                    if(responseDataJson.intersects == true)
                        plugin.stopEditing(true);
                    else
                        plugin.stopEditing(false);
                }
            });
        };
    }
});

Ext.reg('gxp_featureeditpopupvalidate', gxp.FeatureEditPopupValidate);