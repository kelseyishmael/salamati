/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GeoGitUtil
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.ns("gxp.plugins");

/** api: constructor
 *  .. class:: Tools(config)
 *
 *    Provides actions for box zooming, zooming in and zooming out.
 */
gxp.plugins.GeoGitUtil = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_geogitutil */
    ptype: "gxp_geogitutil",

    /** private: method[constructor]
     */
    constructor: function(config) {
        gxp.plugins.GeoGitUtil.superclass.constructor.apply(this, arguments);
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
    	this.target.mapPanel.map.events.register('addlayer', this, this.onLayerAdded);
    },
    
    /**
     * Send the requests to check to see if a layer is from a geogit data st
     */
    onLayerAdded: function(evt){
    	this.isGeoGitLayer(evt.layer);
    },
    
    /**
     * Parse the featureType for the workspace and typename
     */
    parseFeatureType: function(featureType){
    	if(featureType){
    		var indexOfColon = featureType.indexOf(':');
    		var workspace = featureType.substring(0, indexOfColon);
    		var typeName = featureType.substr(indexOfColon + 1);
    		
    		return {
    			workspace: workspace,
    			typeName: typeName
    		};
    		
    	}
    },
    
    /** public: method[isGeoGitLayer]
     * 
     *  callback should expect either false for it's not a geogit layer or the name
     *  of the geogit datastore if it is a geogit layer
     */
    isGeoGitLayer: function(layer, callback){
    	if(layer && layer.params && layer.params.LAYERS && !(layer.params.LAYERS instanceof Array)){
			var featureType = layer.params.LAYERS;
			var parsedFeatureType = this.parseFeatureType(featureType);
			
			var geoserverIndex = layer.url.indexOf('geoserver');
			var geoserverUrl = layer.url.substring(0, geoserverIndex + 10);
			
			// Check to see if the layer has already been checked
			if(layer.isGeogit === undefined){
				var isGeoGit = function(dataStore){
					var plugin = this;
					OpenLayers.Request.GET({
						url: geoserverUrl + 'rest/workspaces/' + parsedFeatureType.workspace + '/datastores/' +
							 dataStore.name + '/featuretypes/' + parsedFeatureType.typeName + '.json',
						success: function(results){
							var jsonFormatter = new OpenLayers.Format.JSON();
							var featureTypeInfo = jsonFormatter.read(results.responseText);
							layer.isGeogit = true;
							layer.geogitStore = dataStore.name;
							layer.nativeName = featureTypeInfo.featureType.nativeName;
							// this is to get the repository name
	                         if(layer.repoId === undefined) {
	                             layer.repoId = layer.url.substring(0, geoserverIndex-1);
	                             layer.repoId += dataStore.connectionParameters.entry[0].$;
	                         }
							
							if(callback !== undefined){
								callback(layer);
							}
						},
						failure: plugin.errorFetching
					});
				};
				
				var isNotGeoGit = function(){
					layer.isGeogit = false;
					if(callback != undefined){
						callback(false);
					}
				};
				
				//check to see if the layer is a geogit layer
				this.fetchIsGeoGitLayer(geoserverUrl, parsedFeatureType.workspace, featureType, isGeoGit, isNotGeoGit);
				
			}else if(layer.isGeogit){
				// It is a geogit layer so execute the callback, passing in the name of the store
				if(callback !== undefined){
					callback(layer);
				}
			}else{  
				// It is not a geogit layer so execute the callback, passing in false
				if(callback !== undefined){
					callback(false);
				}
			}
    	}
    },
    
    errorFetching: function(){
    	throw "GeoGitUtil: Error fetching data store info";
    },
    
    /**
     * Query the rest api to get the type of datastore for this layer
     */
    fetchIsGeoGitLayer: function(url, workspace, featureType, isGeoGit, isNotGeoGit){
    	var plugin = this;
		OpenLayers.Request.GET({
			url: url + 'rest/layers/' + featureType + '.json',
			success: function(results){
				var jsonFormatter = new OpenLayers.Format.JSON();
				var layerinfo = jsonFormatter.read(results.responseText);
				var resourceUrl = layerinfo.layer.resource.href;
				
				var datastoreStartIndex = resourceUrl.indexOf(workspace + '/datastores');
                datastoreStartIndex = datastoreStartIndex + workspace.length + 12;
                
                var datastoreEnd = resourceUrl.substr(datastoreStartIndex);
                var datastoreEndIndex = datastoreEnd.indexOf('/');
				var datastore = datastoreEnd.substring(0, datastoreEndIndex);
				
				OpenLayers.Request.GET({
					url: url + 'rest/workspaces/' + workspace + '/datastores/' + datastore + '.json',
					success: function(results){
						var storeInfo = jsonFormatter.read(results.responseText);
						if(storeInfo){
							if(storeInfo.dataStore && storeInfo.dataStore.type){
								if(isGeoGit && (storeInfo.dataStore.type === "GeoGIT")){
									isGeoGit(storeInfo.dataStore);
								}else{
									if(isNotGeoGit){
										isNotGeoGit(storeInfo.dataStore);
									}
								}
							}else{
								plugin.errorFetching();
							}
						}else{
							plugin.errorFetching();
						}
					},
					failure: plugin.errorFetching
				});
			},
			failure: plugin.errorFetching
		});
	}
        
});

Ext.preg(gxp.plugins.GeoGitUtil.prototype.ptype, gxp.plugins.GeoGitUtil);