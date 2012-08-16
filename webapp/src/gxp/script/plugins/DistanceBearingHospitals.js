/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/DistanceBearing.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = DistanceBearingHospitals
 */

/** api: (extends)
 *  plugins/DistanceBearing.js
 */
 Ext.namespace("gxp.plugins");
 
 /** api: constructor
 *  .. class:: DistanceBearing(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
gxp.plugins.DistanceBearingHospitals = Ext.extend(gxp.plugins.DistanceBearing, {
    
    /** api: ptype = gxp_distancebearing */
    ptype: "gxp_distancebearinghospitals",
    
    /** api: config[outputTarget]
     *  ``String`` Popups created by this tool are added to the map by default.
     */
    outputTarget: "map",

    /** private: property[popupCache]
     *  ``Object``
     */
    popupCache: null,

    /** api: config[infoActionTip]
     *  ``String``
     *  Text for feature info action tooltip (i18n).
     */
    infoActionTip: "Distance/Bearing of hospitals from click location",

    /** api: config[popupTitle]
     *  ``String``
     *  Title for info popup (i18n).
     */
    popupTitle: "Distance/Bearing of hospitals",
    
    /** api: config[format]
     *  ``String`` Either "html" or "grid". If set to "grid", GML will be
     *  requested from the server and displayed in an Ext.PropertyGrid.
     *  Otherwise, the html output from the server will be displayed as-is.
     *  Default is "html".
     */
    format: "html",
    
    /** api: config[vendorParams]
     *  ``Object``
     *  Optional object with properties to be serialized as vendor specific
     *  parameters in the requests (e.g. {buffer: 10}).
     */
    
    /** api: config[layerParams]
     *  ``Array`` List of param names that should be taken from the layer and
     *  added to the GetFeatureInfo request (e.g. ["CQL_FILTER"]).
     */
     
    /** api: config[itemConfig]
     *  ``Object`` A configuration object overriding options for the items that
     *  get added to the popup for each server response or feature. By default,
     *  each item will be configured with the following options:
     *
     *  .. code-block:: javascript
     *
     *      xtype: "propertygrid", // only for "grid" format
     *      title: feature.fid ? feature.fid : title, // just title for "html" format
     *      source: feature.attributes, // only for "grid" format
     *      html: text, // responseText from server - only for "html" format
     */
     
     /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt, title, text) {
        var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
            return x.get("queryable");
        });
        
        var layers = [];
        queryableLayers.each(function(x){
            var layer = x.getLayer();
            layers.push([layer.url, x.get("name")]);
        });
        
        // Create the combo box, attached to the states data store
        /*var combo = new Ext.form.ComboBox({
        	editable:		false,
        	mode:			"local",
        	lazyRender:		true,
            fieldLabel:		"Choose Layer",
            store:			layers,
            autoSelect:		true // BUG: "true to select the first result gathered by the data store (defaults to true)." - From docs - doesn't seem to work
        });*/
        
        
        //Project the mouse XY coordinates to WGS84 LatLon
        var map = this.target.mapPanel.map;
        var geographic = new OpenLayers.Projection("EPSG:4326");
        var clickLocation = map.getLonLatFromPixel(evt.xy);
        clickLocation = clickLocation.transform(new OpenLayers.Projection(map.getProjection()), geographic);
        
        var plugin = this;
        this.win = new Ext.Window({
			title:			"Distance/Bearing of hospitals",
			closable:		true,
			closeAction:	"destroy",
			width:			400,
			height:			350,
			layout:			"form",
			bodyStyle:		"padding: 5px;",
			items: [
			//	combo,
				new Ext.form.Field({
					fieldLabel:	"Longitude",
					id: "lon",
					value:		clickLocation.lon
				}),
				new Ext.form.Field({
					fieldLabel:	"Latitude",
					id: "lat",
					value:		clickLocation.lat
				}),
				new Ext.form.Field({
					fieldLabel:	"Radius (m)",	// TODO: Needs validation event handler to prevent empty radius being submitted
					id: "radius"
				}),
				new Ext.Button({
					text: 		"Cancel",
					handler:	function(b, e) {
						plugin.win.destroy();
                        plugin.popupVisible = false;
					}
				}),
				new Ext.Button({
					text: 		"OK",
					handler:	function(b, e) {
				        /**
				         * Post the request and expect success.
				         */
						
				        var jsonFormat = new OpenLayers.Format.JSON();
							   
						var lon = Ext.getCmp("lon").getValue();
						var lat = Ext.getCmp("lat").getValue();
						var radius = Ext.getCmp("radius").getValue();
							   
						if(!plugin.validateLon(lon))
							   return;
						if(!plugin.validateLat(lat))
							   return;
						if(!plugin.validateRadius(radius))
							   return;
				        
						//TODO: use radius field from dialog
				        //var requestData = jsonFormat.write({ x: lon, y: lat, radius: radius, wfs: "http://geoserver.rogue.lmnsolutions.com/geoserver/wfs", typeName: "medford:schools" });
                        var requestData = jsonFormat.write({ x: lon, y: lat, radius: radius });
				        var responseDataJson = null;
				        
				        OpenLayers.Request.POST({
				            url: "http://geoserver.rogue.lmnsolutions.com/medfordhospitals",
				            proxy: null,
				            data: requestData,
				            headers: {
				            	"Content-Type": "application/json"
					        },
				            success: function(response) {
				                console.log("success: ", response);
				                responseDataJson = eval(response.responseText);
				                //console.log("responseDataJson: ", responseDataJson);
				                
				                //----------------------------
				        		//Once you have your json, pass it to addJsonFeatures
				        		//var responseData = [{endPoint:{x: -100.4589843750024, y: 44.480830278562756}, distance:551.9238246859647,bearing:95.71837619624442},{endPoint:{x: -106.1059570312543, y: 34.49750272138203}, distance:561.9445569621694,bearing:60.2591284662917}];
								var lonlat = new OpenLayers.LonLat(lon, lat);
				        		plugin.addJsonFeatures(plugin.target.mapPanel.map, lonlat, responseDataJson, "medfordhospitals"); //responseData);                
				            }
				        });
					}
				})
			]
		}).show();
    }
});

Ext.preg(gxp.plugins.DistanceBearingHospitals.prototype.ptype, gxp.plugins.DistanceBearingHospitals);