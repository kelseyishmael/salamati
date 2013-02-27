/**
 * Add all your dependencies here.
 *
 * @require widgets/Viewer.js
 * @require plugins/LayerManager.js
 * @require plugins/OLSource.js
 * @require plugins/MapQuestSource.js
 * @require plugins/MapBoxSource.js
 * @require plugins/BingSource.js
 * @require plugins/GoogleSource.js
 * @require plugins/OSMSource.js
 * @require plugins/WMSCSource.js
 * @require plugins/ZoomToExtent.js
 * @require plugins/NavigationHistory.js
 * @require plugins/Zoom.js
 * @require plugins/AddLayers.js
 * @require plugins/RemoveLayer.js
 * @require salamati/plugins/DistanceBearing.js
 * @require RowExpander.js
 * @require widgets/NewSourceDialog.js
 * @require plugins/FeatureManager.js
 * @require plugins/FeatureEditor.js
 * @require plugins/Navigation.js
 * @require plugins/SnappingAgent.js
 * @require plugins/VersionedEditor.js
 * @require plugins/Playback.js
 * @require plugins/Measure.js
 * @require OpenLayers/Format/WKT.js
 * @require OpenLayers/Control/MousePosition.js
 * @require OpenLayers/Control/ScaleLine.js
 * @require salamati/plugins/Settings.js
 * @require locale/en.js
 * @require locale/es.js
 * @require salamati/locale/en.js
 * @require salamati/locale/es.js
 * @require salamati/plugins/SalamatiTools.js
 */

(function() {
    // backwards compatibility for reading saved maps
    // these source plugins were renamed after 2.3.2
    Ext.preg("gx_wmssource", gxp.plugins.WMSSource);
    Ext.preg("gx_olsource", gxp.plugins.OLSource);
    Ext.preg("gx_googlesource", gxp.plugins.GoogleSource);
    Ext.preg("gx_bingsource", gxp.plugins.BingSource);
    Ext.preg("gx_osmsource", gxp.plugins.OSMSource);
})();

Ext.lib.Ajax.useDefaultXhrHeader = false;

var nominatimUrl = 'http://192.168.10.168';

Ext.ns("salamati");
salamati.Viewer = Ext.extend(gxp.Viewer, {
	Map: "Default Map",
	Title_Tools: "Default Tools",
	Title_Search: "Default Search",
	Search_Submit: "Default Go",
	ActionTip_Default: "Distance/Bearing of features from click location",
	ActionTip_Edit: "Get feature info",
	NominatimStore: new Ext.data.Store({
		storeId: 'searchStore',
		reader: new Ext.data.JsonReader({
			fields: [
			   {
				   name: 'display_name',
				   mapping: 'display_name'
			   },{
				   name: 'boundingBox',
				   mapping: 'boundingbox'
			   },{
				   name: 'lon',
				   mapping: 'lon'
			   },{
				   name: 'lat',
				   mapping: 'lat'
			   }
			]
		})
	}),
	
    constructor: function(config) {
        config = config || {};

        // Starting with this.authorizedRoles being undefined, which means no
        // authentication service is available
        if (config.authStatus === 401) {
            // user has not authenticated or is not authorized
            this.authorizedRoles = [];
        } else if (config.authStatus !== 404) {
            // user has authenticated
            this.authorizedRoles = ["ROLE_ADMINISTRATOR"];
        }
        // should not be persisted or accessed again
        delete config.authStatus;

        config.listeners = {
            "ready": function(){
                //Show the tools window

                /*Ext.Ajax.on('beforerequest', showSpinner, this);
                Ext.Ajax.on('requestcomplete', hideSpinner, this);
                Ext.Ajax.on('requestexception', hideSpinner, this);*/

            	win.animateTarget = app.tools.salamati_tools.actions[0].items[0];

                // load toolsWindowShow from cookie if available
                var toolsWindowShow = "true";
                var cookieStart;
                var toolsWindowShow2;
                
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("toolsWindowShow=");

                    if (cookieStart != -1) {
                        cookieStart += "toolsWindowShow".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }
                        toolsWindowShow2 = document.cookie.substring(cookieStart, cookieEnd);

                        if (toolsWindowShow2) {
                            toolsWindowShow = toolsWindowShow2;
                        }
                        console.log("---- App.onReady toolsWindowShow found: ", toolsWindowShow);
                    }
                }

                if (toolsWindowShow === "false") {
                    win.hide();
                    //toolContainer.show();
                } else {
                    win.show();
                }

                // load toolsWindowXY from cookie if available
                var toolsWindowX = 60;
                var toolsWindowY = 60;
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("toolsWindowXY=");

                    if (cookieStart != -1) {
                        cookieStart += "toolsWindowXY".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }
                        var toolsWindowXY = document.cookie.substring(cookieStart, cookieEnd);

                        if (typeof toolsWindowXY != 'undefined' && toolsWindowXY) {
                            values = toolsWindowXY.split("|");
                            var x = parseFloat(values[0]);
                            var y = parseFloat(values[1]);

                            if (x && y) {
                                toolsWindowX = x;
                                toolsWindowY = y;
                            }
                        }
                        console.log("---- App.onReady toolsWindowXY found: ", toolsWindowX, toolsWindowY);
                    }
                }

                win.setPosition(toolsWindowX, toolsWindowY);
                
                var map = app.mapPanel.map;
                map.displayProjection = "EPSG:4326";
                map.addControl(new OpenLayers.Control.ScaleLine());
                map.addControl(new OpenLayers.Control.MousePosition({
                    displayClass: 'mymouseposition'
                }));


                // look for cookie
                if (document.cookie.length > 0) {
                    cookieStart = document.cookie.indexOf("mapCenter=");

                    if (cookieStart != -1) {
                        cookieStart += "mapCenter".length + 1;
                        cookieEnd = document.cookie.indexOf(";", cookieStart);

                        if (cookieEnd == -1) {
                            cookieEnd = document.cookie.length;
                        }

                        cookietext = document.cookie.substring(cookieStart, cookieEnd);

                        values = cookietext.split("|");
                        lat = parseFloat(values[0]);
                        lon = parseFloat(values[1]);
                        zoom = parseInt(values[2], 10);

                        console.log("---- App.onReady mapCenter found lat: ", lat, ", lon: ", lon, ", zoom: ", zoom);

                        if (lat && lon && zoom) {
                            map.setCenter(new OpenLayers.LonLat(lon, lat), zoom);
                        }
                    }
                }


                var setMapCenterCookie = function(expiredays) {

                    mapCenter = new OpenLayers.LonLat(map.getCenter().lon, map.getCenter().lat);
                    var cookietext = "mapCenter=" + mapCenter.lat + "|" + mapCenter.lon + "|" + map.getZoom();

                    if (typeof expiredays != 'undefined' && expiredays) {
                        var exdate = new Date();
                        exdate.setDate( exdate.getDate() + expiredays);
                        cookietext += ";expires=" + exdate.toGMTString();
                    }

                    // write cookie
                    document.cookie = cookietext;
                };
                //TODO: implement but we also need to cach the sources as by defaut it only tries to parse out local host geoserver
                var setMapLayersCookie = function(expiredays) {
                };

                // This is what the UI does to add the layer 
//              function addLayers() {
//                  var key = sourceComboBox.getValue(); //local
//                  var source = this.target.layerSources[key]; //
//                  var records = capGridPanel.getSelectionModel().getSelections();
//                  this.addLayers(records, source);
//              }



                // TODO: is this the best place to insert this?
                map.events.on({
                    "moveend" : function(e) {
                        setMapCenterCookie();
                    },
                    "zoomend" : function(e) {
                        setMapCenterCookie();
                    },
                    "addlayer" : function(e) {
                        setMapLayersCookie();
                        console.log("map.events.addlayer: ", e);
                    },
                    "removelayer" : function(e) {
                        setMapLayersCookie();
                        console.log("map.events.removelayer: ", e);
                    },
                    "changelayer" : function(e) {
                        setMapLayersCookie();
                        console.log("map.events.changelayer: ", e);
                    },
                    scope : map
                });
                /** 
                 * Hack to make snapping more dynamic
                 * Whenever a layer is added to the map, it gets added to the snapping targets
                 */
                nameIndex = [];
                snappingAgent = app.tools.snapping_agent;

                map.events.register("addlayer", null, function(layer){
                    var layerParams = layer.layer.params;

                    if(layerParams && (nameIndex.indexOf(layerParams.LAYERS) == -1))
                    {
                        var target = {
                            source:  "local",
                            name: layerParams.LAYERS
                        };
                        // this breaks in GeoNode, TODO fix
                        if (snappingAgent) {
                            var index = snappingAgent.targets.push(target);
                            snappingAgent.addSnappingTarget(target);
                            nameIndex.push(target.name);
                            app.selectLayer(app.getLayerRecordFromMap(target));
                        }
                    }
                });
            }
        };

        config.defaultSourceType = "gxp_wmscsource";
        if (!config.sources) {
            config.sources = Ext.apply(config.sources || {}, {
                local: {
                    ptype: "gxp_wmscsource",
                    url: "/geoserver/wms",
                    version: "1.1.1"
                },
                osm: {
                    ptype: "gxp_osmsource"
                }
            });
        }
        if (!config.map) {
            config.map = {
                id: "mymap", // id needed to reference map in portalConfig above
                title: this.Map,
                projection: "EPSG:900913",
                center: [-10764594.758211, 4523072.3184791],
                cls: "mymapclass",
                zoom: 3,
                maxExtent: [-20037508, -20037508, 20037508, 20037508],
                restrictedExtent: [-20037508, -20037508, 20037508, 20037508],
                numZoomLevels: 20,
                layers: [{
                    source: "osm",
                    name: "mapnik",
                    group: "background"
                }],
                items: [{
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100
                }],
                tbar: [{
                    xtype: 'tbfill'
                }]
            };
        } else {
            config.map.id = "mymap";
            config.map.items = config.map.items || [];
            config.map.items.push({
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100
            });
        }
        var items = config.portalConfig && config.portalConfig.items;
        config.portalConfig = Ext.apply(config.portalConfig || {}, {
            layout: "border",

            // by configuring items here, we don't need to configure portalItems
            // and save a wrapping container
            items: [{
                id: "centerpanel",
                xtype: "panel",
                layout: "fit",
                region: "center",
                border: false,
                items: ["mymap",
                    win]
            }, {
            	id: "eastpanel",
            	layout: "accordion",
            	region: "east",
            	collapsible: true,
            	width: 200,
            	items: [{
            		title: 'Search',
            		id: "searchtab",
            		collapsed: true,
            		items: [{
            			xtype: "textfield",
            		    id: "searchField",
            		    cls: "searchFieldClass",
            		    emptyText: "Search",
            		    enableKeyEvents: true,
            		    listeners: {
            		   	 'keyup' : function(element, event){
            		   		 if(event.button == 12){
            		   			 submitSearch(element.getValue());
            		   		 }
            		   	 }
            		    }
            		}, {
            		    xtype: "grid",
                		store: this.NominatimStore,
                		cls: "nominatimGridClass",
                		hideHeaders: true,
                		border: false,
                		columns: [{
                			id: 'place',
                			//header: 'Address',
                			width: 200,
                			//sortable: true,
                			dataIndex: 'display_name'
                		}],
                		listeners: {
                			'cellclick': function(grid, rowIndex, columnIndex, e){
                				var record = grid.getStore().getAt(rowIndex);
                				console.log("data", record.data);
                				
                				zoomToPlace(record.data.lon, record.data.lat, record.data.boundingBox[2], 
                						record.data.boundingBox[0], record.data.boundingBox[3], record.data.boundingBox[1]);
                			}
                		}
            		}]
            	}, {
            		title: 'Layers',
            		id: "layerpanel"
            	}]
            }],
            bbar: {id: "mybbar"}
        });
        if (items) {
            config.portalConfig.items.push(items);
        }
        var tools = [];
        if (config.tools) {
            tools = tools.concat(config.tools);
        }
        tools.push({
            ptype: "gxp_layermanager",
            id: "layermanager",
            outputConfig: {
                id: "tree",
                border: false,
                tbar: [] // we will add buttons to "tree.bbar" later
            },
            outputTarget: "layerpanel"
        }, {
            ptype: "gxp_playback",
            outputTarget: "map.tbar"
        }, {
        	ptype: "salamati_tools",
        	outputTarget: "map.tbar",
        	id: "salamati_tools"
        }, {
            ptype: "gxp_addlayers",
            actionTarget: "tree.tbar"
        }, {
            ptype: "gxp_removelayer",
            actionTarget: ["tree.tbar", "tree.contextMenu"]
        }, {
            ptype: "app_settings",
            actionTarget: "tree.tbar"
        }, {
        	ptype: "gxp_measure",
        	actionTarget: "map.tbar"
        }, {
            ptype: "gxp_zoomtoextent",
            actionTarget: "mymap.tbar"
        }, {
            ptype: "gxp_zoom",
            actionTarget: "mymap.tbar"
        }, {
            ptype: "gxp_navigationhistory",
            actionTarget: "mymap.tbar"
        }, {
            ptype: "gxp_featuremanager",
            id: "feature_manager",
            paging: false,
            autoSetLayer: true
        },{
            ptype: "gxp_snappingagent",
            id: "snapping_agent",
            targets: []
        },{
            ptype: "gxp_featureeditor",
            featureManager: "feature_manager",
            id: "feature_editor",
            autoLoadFeature: true,
            snappingAgent: "snapping_agent",
            iconClsAdd: "salamati-icon-addfeature",
            iconClsEdit: "salamati-icon-getfeatureinfo",
            editFeatureActionTip: this.ActionTip_Edit,
            actionTarget: "toolsPanel",
            outputConfig: {
                editorPluginConfig: {
                    ptype: "gxp_versionededitor",
                    /* assume we will proxy the geogit web api */
                    url: "/geoserver/geogit/lmn_demo:TD1repo"
                }
            }
        },{
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            baseUrl: "http://192.168.10.125/",
            wpsType: "generic",
            infoActionTip: this.ActionTip_Default,
           // iconCls: "gxp-icon-distance-bearing-generic"
            iconCls: "gxp-icon-distance-bearing"
        }/*, {
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            wpsType: "pointhospitals",
            baseUrl: "http://192.168.10.125/",
            infoActionTip: this.ActionTip_Default,
           // iconCls: "gxp-icon-distance-bearing-hospitals"
            iconCls: "gxp-icon-dbhospitals"
        }, {
            ptype: "app_distancebearing",
            actionTarget: "toolsPanel",
            toggleGroup: "distanceBearing",
            wpsType: "pointhazzards",
            baseUrl: "http://192.168.10.125/",
            infoActionTip: this.ActionTip_Default,
            //iconCls: "gxp-icon-distance-bearing-schools"
            iconCls: "gxp-icon-dbhazzards"
        }*/);
        config.tools = tools;
        salamati.Viewer.superclass.constructor.apply(this, [config]);
    }
});

var app;
//var baseUrl = "http://192.168.10.125/";

var WGS84;
var GoogleMercator;

var nameIndex;
var snappingAgent;

var toolWindowSavedPosition = null;

//the tool dock
var toolContainer = new Ext.Container({
    xtype: "container",
    id: "toolcont",
    hidden: true,
    cls: "toolContainer"
});

var win = null;

var showSpinner = function(conn, options){
	console.log("showspinner");
};

var hideSpinner = function(conn, response, options){
	console.log("hidespinner");
};

var zoomToPlace = function(lon, lat, left, bottom, right, top){
	var bounds = new OpenLayers.Bounds([left, bottom, right, top]);
	
	bounds.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
	console.log("zoomtobounds: ", bounds);
	app.mapPanel.map.zoomToExtent(bounds);
	
//	var lonlat = new OpenLayers.LonLat(lon, lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
//	app.mapPanel.map.panTo(lonlat);
	
	while(app.mapPanel.map.getZoom() > 17){
		app.mapPanel.map.zoomOut();
	}
};

var submitSearch = function(params){
	var urlParams = {
		format: 'json',
		q: params,
		callback: 'JSON_CALLBACK'
	};
	
	//nominatimUrl = nominatimURLField.getValue();
	nominatimUrl = '';
	
	var slash = '';
	console.log('last char: ' + nominatimUrl.charAt(nominatimUrl.length - 1));
	
	if(nominatimUrl.charAt(nominatimUrl.length - 1) != '/'){
		slash = '/';
	}
		
	var searchUrl = nominatimUrl + slash + 'search.php';
	
	/*var spinnerHTML = '<p id="searchSpinner">Please wait while we search.</p>';
	
	var searchPanel = Ext.get("searchPanel");
	searchPanel.createChild(spinnerHTML);*/
	
	$.ajax({
		url: searchUrl,
		data: urlParams,
		success: function(results){
			/*var oldResults = document.getElementsByClassName('searchResults');
			
			if(oldResults.length){
				oldResults[0].parentNode.removeChild(oldResults[0]);
			}
			
			var spinner = document.getElementById("searchSpinner");
			spinner.parentNode.removeChild(spinner);*/
			console.log('results', results);
			app.NominatimStore.loadData(results, false);
			/*if(results && results.length){
				var resultsHTML = '<div class="searchResults">';
				
				for(var i = 0; i < results.length; i++){
					console.log(results[i]);
					resultsHTML += '<div class="searchResult" ' + 
										'onclick="zoomToPlace(' + results[i].lon + ', ' +
										results[i].lat + ', ' + results[i].boundingbox[2] +
										', ' + results[i].boundingbox[0] + ', ' +
										results[i].boundingbox[3] + ', ' +
										results[i].boundingbox[1] + ')">' +
										'<span class="searchResultPlaceName">' +
											
											results[i].display_name + '</span>' +
									'</div>';
				}
				
				resultsHTML += '</div>';
				
				var searchPanel = Ext.get("searchPanel");
				searchPanel.createChild(resultsHTML);
			}*/
		},
		error: function(error){
			console.log("error", error);
			/*var oldResults = document.getElementsByClassName('searchResults');
			
			if(oldResults.length){
				oldResults[0].parentNode.removeChild(oldResults[0]);
			}
			
			var spinner = document.getElementById("searchSpinner");
			spinner.parentNode.removeChild(spinner);
			
			var errorHTML = '<div class="searchResults">' +
								'<span class="searchResultsError">Error sending request</span>' +
								'<span class="searchResultsError">Check that your url is valid</span>' +
								'<span class="searchResultsError">ex. http://nominatim.openstreetmap.org</span>' +
							'</div>';
			
			var searchPanel = Ext.get("searchPanel");
			searchPanel.createChild(errorHTML);*/
		}
	});
};

var searchField = new Ext.form.TextField({
    xtype: "textfield",
    id: "searchField",
 //   cls: "searchFieldClass",
    height: "40",
    width: "93%",
    emptyText: "Search",
    enableKeyEvents: true,
    listeners: {
   	 'keyup' : function(element, event){
   		 if(event.button == 12){
   			 submitSearch(element.getValue());
   		 }
   	 }
    }
});

/*var nominatimURLField = new Ext.form.TextField({
	xtype: "textfield",
	id: "nominatimURL",
	//cls: "nominatimURLClass",
	height: "40",
	width: "90%",
	emptyText: "Nominatim Url",
	enableKeyEvents: true,
	listeners: {
		'keyup' : function(element, event){
			if(event.button == 12){
				submitSearch(searchField.getValue());
			}
		},
		'focus' : function(element, event){
			if(element.getValue() === ""){
				element.setValue('http://');
			}
		}
	}
});*/

Ext.onReady(function() {
	
	WGS84 = new OpenLayers.Projection("EPSG:4326");
	GoogleMercator = new OpenLayers.Projection("EPGS:900913");
	
    // load language setting from cookie if available
	var lang = "en";
	if (document.cookie.length > 0) {
		var cookieStart = document.cookie.indexOf("language=");
		
		if (cookieStart != -1) {
			cookieStart += "language".length + 1;
			cookieEnd = document.cookie.indexOf(";", cookieStart);
			
			if (cookieEnd == -1) {
				cookieEnd = document.cookie.length;
			}

			var lang2 = document.cookie.substring(cookieStart, cookieEnd);
			
			if (lang2) {
				lang = lang2;
			}
			console.log("---- App.onReady language setting found: ", lang);
		}
	}
	GeoExt.Lang.set(lang);


	win = new Ext.Window({
    	title: salamati.Viewer.prototype.Title_Tools,
    	id: "toolsWindow",
    	closeAction: "hide",
    	xtype: "window",
    	resizable: false,
    	layout: "fit",
    	items: [
        	{
            	xtype: "panel",
            	id: "toolsPanel",
            	cls: "mytoolwindowclass",
            	layout: "hbox",
            	layoutConfig: {
                	align: 'center',
                	padding: '5'
            	}
        	}
    	],
		listeners : {
			"beforehide" : function(element) {
				//toolContainer.show();
			},
			"hide" : function(element) {
				document.cookie = "toolsWindowShow=false";
			},
			"show" : function(element) {
				document.cookie = "toolsWindowShow=true";
			},
			"move" : function(element) {
				document.cookie = "toolsWindowXY=" + element.x + "|" + element.y;
			}
		}
	});
});
