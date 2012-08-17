/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @requires GeoExt/widgets/Popup.js
 * @requires OpenLayers/Control/WMSGetFeatureInfo.js
 * @requires OpenLayers/Format/WMSGetFeatureInfo.js
 * @requires OpenLayers/StyleMap.js
 * @requires OpenLayers/Rule.js
 * @requires OpenLayers/Layer/Vector.js
 * @requires OpenLayers/Renderer/SVG.js
 * @requires OpenLayers/Renderer/VML.js
 * @requires OpenLayers/Renderer/Canvas.js
 * @requires OpenLayers/Feature/Vector.js
 * @requires OpenLayers/Geometry/LineString.js
 * @requires OpenLayers/Geometry/Point.js
 * @requires OpenLayers/Symbolizer/Point.js
 * @requires OpenLayers/Projection.js
 * @requires OpenLayers/Format/JSON.js
 * @requires OpenLayers/Request.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = DistanceBearing
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: DistanceBearing(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
gxp.plugins.DistanceBearing = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_distancebearing */
    ptype: "gxp_distancebearing",
    
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
    infoActionTip: "Distance/Bearing of features from click location",

    /** api: config[popupTitle]
     *  ``String``
     *  Title for info popup (i18n).
     */
    popupTitle: "Distance/Bearing",
    
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

    /**
     * Is the popup visible?
     */
    popupVisible: false,
    
    wpsType: null,
    
    /**
     * Popup Window
     */
    win: null,
    
    /** api: method[addActions]
     */
    addActions: function() {
        this.popupCache = {};
        
        var plugin = this;
        var actions = gxp.plugins.DistanceBearing.superclass.addActions.call(this, [{
            tooltip: this.infoActionTip,
            iconCls: "gxp-icon-getfeatureinfo",
            toggleGroup: this.toggleGroup,
            enableToggle: true,
            allowDepress: true,
            toggleHandler: function(button, pressed) {
                for (var i = 0, len = info.controls.length; i < len; i++){
                    if (pressed) {
                        info.controls[i].activate();
                    } else {
                        info.controls[i].deactivate();
                        if(plugin.popupVisible && plugin.win)
                            plugin.win.destroy();
                        plugin.popupVisible = false;
                    }
                }
             }
        }]);
        
        var infoButton = this.actions[0].items[0];

        var info = {controls: []};
        var updateInfo = function() {
            var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
                return x.get("queryable");
            });

            var map = this.target.mapPanel.map;
            var control;
            for (var i = 0, len = info.controls.length; i < len; i++){
                control = info.controls[i];
                control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
                control.destroy();
            }
            
            info.controls = [];
            queryableLayers.each(function(x){
                var layer = x.getLayer();
                var vendorParams = Ext.apply({}, this.vendorParams), param;
                if (this.layerParams) {
                    for (var i=this.layerParams.length-1; i>=0; --i) {
                        param = this.layerParams[i].toUpperCase();
                        vendorParams[param] = layer.params[param];
                    }
                }
                var infoFormat = x.get("infoFormat");
                if (infoFormat === undefined) {
                    // TODO: check if chosen format exists in infoFormats array
                    // TODO: this will not work for WMS 1.3 (text/xml instead for GML)
                    infoFormat = this.format == "html" ? "text/html" : "application/vnd.ogc.gml";
                }
                var control = new OpenLayers.Control.WMSGetFeatureInfo(Ext.applyIf({
                    url: layer.url,
                    queryVisible: true,
                    layers: [layer],
                    infoFormat: infoFormat,
                    vendorParams: vendorParams,
                    eventListeners: {
                        getfeatureinfo: function(evt) {
                            var title = x.get("title") || x.get("name");
                            if (infoFormat == "text/html") {
                                var match = evt.text.match(/<body[^>]*>([\s\S]*)<\/body>/);
                                if (match && !match[1].match(/^\s*$/)) {
                                    if(this.popupVisible){
                                        if(this.win)
                                            this.win.destroy();
                                        this.displayPopup(evt, title, match[1]);
                                    }else{
                                        this.popupVisible = true;
                                        this.displayPopup(evt, title, match[1]);
                                    }
                                }
                            } else if (infoFormat == "text/plain") {
                                this.displayPopup(evt, title, '<pre>' + evt.text + '</pre>');
                            } else if (evt.features && evt.features.length > 0) {
                                this.displayPopup(evt, title);
                            }
                        },
                        scope: this
                    }
                }, this.controlOptions));
                map.addControl(control);
                info.controls.push(control);
                if(infoButton.pressed) {
                    control.activate();
                }
            }, this);
        };
        
        this.target.mapPanel.layers.on("update", updateInfo, this);
        this.target.mapPanel.layers.on("add", updateInfo, this);
        this.target.mapPanel.layers.on("remove", updateInfo, this);
        
        return actions;
    }, 

    addJsonFeatures: function(map, center, jsonFeatures, type) {
		
        var prefix;
        
        if(type == "medfordhospitals")
                prefix = "Hospitals ";
        else
                prefix = "Schools ";
                
		//Create a new layer to store all the features.
		var LineLayer = new OpenLayers.Layer.Vector(prefix + "Distance Lines", {
			projection: new OpenLayers.Projection(map.getProjection()),
			styleMap: new OpenLayers.StyleMap(OpenLayers.Util.applyDefaults( {
					graphicName:"arrow",
					rotation : "${angle}",
					strokeColor: "black",
                    strokeOpacity: 1,
                    strokeWidth: 3,
                    fillColor: "black",
                    fillOpacity: 1,
                    pointerEvents: "visiblePainted"
				},
				OpenLayers.Feature.Vector.style["default"]
			))
		});
		
		var PointLayer = new OpenLayers.Layer.Vector(prefix + "Markers", {
			projection: new OpenLayers.Projection(map.getProjection()),
			styleMap: new OpenLayers.StyleMap({'default':{
                    strokeColor: "${markerColor}",
                    strokeOpacity: 1,
                    strokeWidth: 2,
                    fillColor: "${markerColor}",
                    fillOpacity: 0.5,
                    pointRadius: 8,
                    pointerEvents: "visiblePainted",
                    // label with \n linebreaks
                    label : "${label}",
                    
                    fontColor: "${fontColor}",
                    fontSize: "14px",
                    fontFamily: "Courier New, monospace",
                    fontWeight: "bold",
                    labelAlign: "${align}",
                    labelXOffset: "${xOffset}",
                    labelYOffset: "${yOffset}",
                    labelOutlineColor: "black",
                    labelOutlineWidth: 4
                }})
		});
		
		//Create an array of features
		var features = [];
		var pointFeatures = [];
		
		var centerPoint = new OpenLayers.Geometry.Point(center.lon, center.lat).transform(
				new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection(map.getProjection()));
				
		var startPoint = new OpenLayers.Feature.Vector(centerPoint);
			startPoint.attributes = {
                label: "Start",
                markerColor: "green",
                fontColor: 'white',
                align: "cm",
                xOffset: 0,
                yOffset: 15
            };
		pointFeatures.push(startPoint);
		
		//Loop through the json object and parse the data.
		// - TODO: Base the loop on the json data
		for(var i = 0; i < jsonFeatures.length; i++) {		
			
			var feature = jsonFeatures[i];
			
			//Given the center point, calculate the point based on the distance and bearing
			var endPoint = new OpenLayers.Geometry.Point(feature.endPoint.x, feature.endPoint.y).transform(
				new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection(map.getProjection()));
			
			line = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([centerPoint, endPoint]));
			line.attributes = {
				bearing: feature.bearing.toFixed(1)
			};
										 
			features.push(line);
			
			var point = new OpenLayers.Feature.Vector(endPoint);
			point.attributes = {
                label: "Distance: " + (feature.distance / 1000.0).toFixed(3) + " km\nBearing: " + feature.bearing.toFixed(1),
                markerColor: "red",
                fontColor: 'white',
                align: "cm",
                xOffset: 0,
                yOffset: 30,
                fid: feature.fid
            };
			
            console.log(point.attributes.fid);
			//Create a feature based on the new point.
			pointFeatures.push(point);
		}
	
		//Finally add all the features to the new layer...
		LineLayer.addFeatures(features);
		PointLayer.addFeatures(pointFeatures);
		
		//and add the layer to the map!
		map.addLayer(PointLayer);
		map.addLayer(LineLayer);
		
		//Add arrow
		OpenLayers.Renderer.symbol.arrow = [0,2, 1,0, 2,2, 1,0, 0,2];
		
		var arrowHead = [];
		for (var i = 0; i < features.length; i++) {
			var linePoints = this.createDirection(features[i].geometry, features[i].attributes.bearing);
			for (var j=0; j < linePoints.length; j++ ) {
				linePoints[j].attributes.lineFid = features[i].fid;
			}
			arrowHead = arrowHead.concat(linePoints);
		}
		LineLayer.addFeatures(arrowHead);
		//map.addLayer(ArrowLayer);	
    },
    
    createDirection: function(line,bearing) {
		if(line instanceof OpenLayers.Geometry.MultiLineString) {
			//TODO
		} else if(line instanceof OpenLayers.Geometry.LineString) {
			return this.createLineStringDirection(line,bearing);
		} else {
			return [];
		}
	},

	createLineStringDirection: function(line,bearing) {
		var points = [];
		var allSegs = this.getSegments(line);
		var segs = [];

		segs.push(allSegs[allSegs.length-1]);
			
		for (var i = 0; i < segs.length; i++) {
			points = points.concat(this.createSegDirection(segs[i],bearing));
		}
		return points;
	},

	createSegDirection: function(seg,bearing) {
		//var segBearing = this.bearing(seg);
		var positions = [];
		var points = [];
		
		positions.push([seg.x2,seg.y2]);
										 
		for (var i=0;i<positions.length;i++ ) {
			var pt = new OpenLayers.Geometry.Point(positions[i][0],positions[i][1]);
			var ptFeature = new OpenLayers.Feature.Vector(pt,{angle:bearing}); 
			points.push(ptFeature);
		}
		return points;	
	},

	getSegmentLength: function(seg) {
	    return Math.sqrt( Math.pow((seg.x2 -seg.x1),2) + Math.pow((seg.y2 -seg.y1),2) );
	},

	getSegments: function(line) {	
		var numSeg = line.components.length - 1;
		var segments = new Array(numSeg), point1, point2;
		for(var i=0; i<numSeg; ++i) {
	    	point1 = line.components[i];
	    	point2 = line.components[i + 1];
	    	segments[i] = {
	        	x1: point1.x,
	        	y1: point1.y,
	        	x2: point2.x,
	        	y2: point2.y
	    	};
		}
		return segments;
	},

	validateLon: function(lon){
		if(isNaN(lon) || (radius == ""))
			return false;
	 
		if((lon >= -180) && (lon <= 180))
			return true;
	 
			return false;
	},
	 
	validateLat: function(lat){
		if(isNaN(lat) || (radius == ""))
			return false;
	 
		if((lat >= -90) && (lat <= 90))
			return true;
	 
			return false;
	},
	 
	validateRadius: function(radius){
		if(isNaN(radius) || (radius == ""))
			return false;
	 
		if(radius >= 0)
			return true;
	 
			return false;
	},
	
    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt, title, text) {
        var wps;
        var combo;
        
        if(this.wpsType == "generic"){
            wps = [["medfordschools", "Medford Schools"], 
            ["medfordhospitals", "Medford Hospitals"]];
        
            /*queryableLayers.each(function(x){
                var layer = x.getLayer();
                layers.push([layer.url, x.get("name")]);
            });*/
            
            // Create the combo box, attached to the states data store
            combo = new Ext.form.ComboBox({
                editable:		false,
                id:             "wpsCombo",
                mode:			"local",
                lazyRender:		true,
                fieldLabel:		"Choose WPS",
                store:			wps,
                autoSelect:		true, // BUG: "true to select the first result gathered by the data store (defaults to true)." - From docs - doesn't seem to work
                triggerAction: "all",
                lastQuery: "" 
            });
        }
        
        //Project the mouse XY coordinates to WGS84 LatLon
        var map = this.target.mapPanel.map;
        var geographic = new OpenLayers.Projection("EPSG:4326");
        var clickLocation = map.getLonLatFromPixel(evt.xy);
        clickLocation = clickLocation.transform(new OpenLayers.Projection(map.getProjection()), geographic);
        
        var plugin = this;
        
        var cancelButton = new Ext.Button({
            text: 		"Cancel",
            handler:	function(b, e) {
                plugin.win.destroy();
                plugin.popupVisible = false;
            }
        });
            
                
        var okButton = new Ext.Button({
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
                
                var selectedWPS;
                
                if(plugin.wpsType == "generic"){
                    selectedWPS = combo.getValue();
                
                    if(selectedWPS == "")
                        return;
                }else
                    selectedWPS = plugin.wpsType;
                    
                var requestData = jsonFormat.write({ x: lon, y: lat, radius: radius });
                var responseDataJson = null;
                
              //  Ext.getCmp("mymap").addClass("loading");
                OpenLayers.Request.POST({
                    url: "http://localhost:8081/" + selectedWPS,
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
                        var lonlat = new OpenLayers.LonLat(lon, lat);
                        plugin.addJsonFeatures(plugin.target.mapPanel.map, lonlat, responseDataJson, selectedWPS); //responseData);
                       // Ext.getCmp("mymap").removeClass("loading");                
                    }
                });
            }
        });
          
        var buttonGroup = new Ext.Panel({
            tbar: [{
                xtype: 'buttongroup',
                columns: 2,
                buttonAlign: 'center',
                items: [
                    cancelButton,
                    okButton
                ]
            }]
        });
        
        if(this.wpsType == "generic"){
            this.win = new Ext.Window({
                title:			"Distance/Bearing",
                closable:		true,
                closeAction:	"destroy",
                width:			300,
                height:			180,
                layout:			"form",
                bodyStyle:		"padding: 5px;",
                items: [
                    combo,
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
                    buttonGroup
                ]
            });
        }else{
            var wpsName;
            
            if(this.wpsType == "medfordhospitals")
                wpsName = "Medford Hospitals";
            else
                wpsName = "Medford Schools";
                
            this.win = new Ext.Window({
                title:			"Distance/Bearing of " + wpsName,
                closable:		true,
                closeAction:	"destroy",
                width:			300,
                height:			160,
                layout:			"form",
                bodyStyle:		"padding: 5px;",
                items: [
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
                    buttonGroup
                ]
            });
        }
        
        this.win.show();
    }
});

Ext.preg(gxp.plugins.DistanceBearing.prototype.ptype, gxp.plugins.DistanceBearing);
