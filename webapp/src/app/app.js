/**
 * Add all your dependencies here.
 *
 * @require widgets/Viewer.js
 * @require plugins/LayerTree.js
 * @require plugins/OLSource.js
 * @require plugins/OSMSource.js
 * @require plugins/WMSCSource.js
 * @require plugins/ZoomToExtent.js
 * @require plugins/NavigationHistory.js
 * @require plugins/Zoom.js
 * @require plugins/AddLayers.js
 * @require plugins/RemoveLayer.js
 * @require plugins/DistanceBearing.js
 * @require RowExpander.js
 * @require widgets/NewSourceDialog.js
 * @require overrides/override-ext-ajax.js
 * @require plugins/FeatureManager.js
 * @require plugins/FeatureEditor.js
 * @require plugins/Navigation.js
 * @require plugins/SnappingAgent.js
 * @require OpenLayers/Format/WKT.js
 * @require plugins/FeatureEditorValidation.js
 */

var app;
var WGS84 = new OpenLayers.Projection("EPSG:4326");
var GoogleMercator = new OpenLayers.Projection("EPGS:900913");
    
Ext.onReady(function() {

    app = new gxp.Viewer({
    	proxy: "/geoserver/rest/proxy?url=",
    	defaultSourceType: "gxp_wmscsource",
        portalConfig: {
            layout: "border",
            region: "center",
            
            // by configuring items here, we don't need to configure portalItems
            // and save a wrapping container
            items: [{
                id: "centerpanel",
                xtype: "panel",
                layout: "fit",
                region: "center",
                border: false,
                items: ["mymap"]
            }, {
                id: "westpanel",
                xtype: "container",
                layout: "fit",
                region: "west",
                width: 200
            }],
            bbar: {id: "mybbar"}
        },
        
        // configuration of all tool plugins for this application
        tools: [{
            ptype: "gxp_layertree",
            outputConfig: {
                id: "tree",
                border: true,
                tbar: [] // we will add buttons to "tree.bbar" later
            },
            outputTarget: "westpanel"
        },{
            ptype: "gxp_addlayers",
            actionTarget: "tree.tbar"
        }, {
            ptype: "gxp_removelayer",
            actionTarget: ["tree.tbar", "tree.contextMenu"]
        }, {
            ptype: "gxp_zoomtoextent",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_zoom",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_navigationhistory",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_featuremanager",
            id: "feature_manager",
            paging: false,
            autoSetLayer: true
        },{
            ptype: "gxp_snappingagent",
            id: "snapping-agent",
            targets: [{
                source: "local",
                name: "testing:test_lines"
            },{
                source: "local",
                name: "testing:test_polygons"
            },{
                source: "local",
                name: "testing:hospitals_try"
            }]
        },{
            ptype: "gxp_featureeditorvalidation",
            featureManager: "feature_manager",
            id: "feature_editor",
            autoLoadFeature: true,
            snappingAgent: "snapping-agent",
            onsave: function(panel, feature){
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
                            url: "http://localhost:8081/validate",
                            proxy: null,
                            data: requestData,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            success: function(response){
                                responseDataJson = JSON.parse(response.responseText);
                                if(responseDataJson.intersects != "true")
                                {
                                    console.log("it doesn't intersect!");
                                }
                            }
                        });
                    }
            },{
            ptype: "gxp_distancebearing",
            actionTarget: "map.tbar",
            toggleGroup: "distanceBearing",
            wpsType: "generic",
            infoActionTip: "Distance/Bearing of features from click location",
            iconCls: "gxp-icon-getfeatureinfo"
        }, {
            ptype: "gxp_distancebearing",
            actionTarget: "map.tbar",
            toggleGroup: "distanceBearing",
            wpsType: "medfordhospitals",
            infoActionTip: "Distance/Bearing of Hospitals from click location",
            iconCls: "gxp-icon-stop"
        }, {
            ptype: "gxp_distancebearing",
            actionTarget: "map.tbar",
            toggleGroup: "distanceBearing",
            wpsType: "medfordschools",
            infoActionTip: "Distance/Bearing of Schools from click location",
            iconCls: "gxp-icon-addfeature"
        }],
        
        // layer sources
        sources: {
            local: {
                ptype: "gxp_wmscsource",
                url: "/geoserver/wms",
                version: "1.1.1"
            },
            osm: {
                ptype: "gxp_osmsource"
            }
        },
        
        // map and layers
        map: {
            id: "mymap", // id needed to reference map in portalConfig above
            title: "Map",
            projection: "EPSG:900913",
            center: [-10764594.758211, 4523072.3184791],
            zoom: 3,
            maxExtent: [-20037508, -20037508, 20037508, 20037508],
            restrictedExtent: [-20037508, -20037508, 20037508, 20037508],
            numZoomLevels: 20,
            layers: [{
                source: "osm",
                name: "mapnik",
                group: "background"
            }, {
                source: "local",
                name: "usa:states"
            }/*, {
                source: "local",
                name: "testing:hospitals_try"
            },{
                source: "local",
                name: "testing:test_lines"
            }, {
                source: "local",
                name: "testing:test_polygons"
            }*/],
            items: [{
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100
            }]
        }
    });
    	
	
});
