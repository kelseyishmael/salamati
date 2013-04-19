/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/GeoGitUtil.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GeoGitHistory
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: GeoGitHistory(config)
 *
 *    Plugin for displaying GeoGit History in a grid. Requires a
 *    :class:`gxp.plugins.Tool`.
 */   
gxp.plugins.GeoGitHistory = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_featuregrid */
    ptype: "gxp_geogithistory",
    
    /**
     * Ext.data.Store
     */
    store: null,
    
    /**
     * Ext.grid.GridPanel
     */
    grid: null,
    
    parentContainer: null,
    
    featureManager: null,
    
    geogitUtil: null,
    
    workspace: null,
    
    path: null,
    
    dataStore: null,
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
    	this.parentContainer = Ext.getCmp(this.outputTarget);
    	
        var featureManager = this.target.tools[this.featureManager];
        var geogitUtil = this.target.tools[this.geogitUtil];
        
        var map = this.target.mapPanel.map;
        var url = "http://192.168.10.175/geoserver/geogit/lmn_demo:DemoRepo/log?path=osm_point_hospitals&output_format=JSON";
        this.store = new Ext.data.Store({
        	url: url,
    		reader: new Ext.data.JsonReader({
    			root: 'response.commit',
    			fields: [
    			   {
    				   name: 'message',
    				   mapping: 'message'
    			   },{
    				   name: 'commit',
    				   mapping: 'id'
    			   },{
    				   name: 'author',
    				   mapping: 'author.name'
    			   },{
    				   name: 'email',
    				   mapping: 'author.email'
    			   }, {
    				   name: 'date',
    				   mapping: 'author.timestamp'
    			   }
    			]
    		}),
    		autoLoad: true
    	});
        
        var addToolTip = function(value, metadata, record, rowIndex, colIndex, store){
        	metadata.attr = 'title="' + value + '"';
        	return value;
        };
        var plugin = this;
        this.grid = new Ext.grid.GridPanel({
    		store: this.store,
    		cls: "gxp-geogithistory-cls",
    		border: false,
    		hideParent: true,
    		flex: 10,
    		colModel: new Ext.grid.ColumnModel({
    			defaults: {
    				sortable: false,
    				renderer: addToolTip
    			},
    			columns: [{
        			id: 'author',
        			header: 'Author',
        			dataIndex: 'author'
        		},{
        			id: 'email',
        			header: 'Email',
        			dataIndex: 'email'
        		},{
        			id: 'message',
        			header: 'Message',
        			dataIndex: 'message'
        		},{
        			id: 'commit',
        			header: 'Commit Id',
        			dataIndex: 'commit'
        		},{
        			id: 'date',
        			header: 'Date',
        			dataIndex: 'date'
        		}]
    		}),
    		viewConfig: {
    			autoFill: true
    		},
    		listeners: {
    			'cellclick': function(grid, rowIndex, columnIndex, e){
    				var oldCommit = grid.getStore().getAt(rowIndex).data.commit;
    				var newCommit = grid.getStore().getAt(0).data.commit;
    				var geoserverIndex = plugin.url.indexOf('geoserver/');
    				var geoserverUrl = plugin.url.substring(0, geoserverIndex + 10);
    				var url = geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/diff?pathFilter=' + plugin.path + '&oldRefSpec=' + oldCommit + '&newRefSpec=' + newCommit + '&output_format=JSON';
    				console.log("url", url);
    		        var store = new Ext.data.Store({
    		        	url: url,
    		    		reader: new Ext.data.JsonReader({
    		    			root: 'response.Feature',
    		    			fields: [
    		    			   {
    		    				   name: 'fid',
    		    				   mapping: 'id'
    		    			   },{
    		    				   name: 'change',
    		    				   mapping: 'change'
    		    			   },{
    		    				   name: 'geometry',
    		    				   mapping: 'geometry'
    		    			   }
    		    			]
    		    		}),
    		    		autoLoad: true
    		    	});
    		        console.log("store", store);
    			}
    		}
		});
        
        config = Ext.apply(this.grid, config || {});
        
        var geogitHistory = gxp.plugins.GeoGitHistory.superclass.addOutput.call(this, config);

        var onLayerChange = function(tool, layerRecord, schema) {
        	if(schema && schema.url){
        		var typeName = schema.reader.raw.featureTypes[0].typeName;
        		var workspace = schema.reader.raw.targetPrefix;
        		
        		if(layerRecord && layerRecord.data && layerRecord.data.layer){
        			var key = workspace + ':' + typeName;
        			
    				var geoserverIndex = schema.url.indexOf('geoserver/);
    				var geoserverUrl = schema.url.substring(0, geoserverIndex + 10);
    				
    				//isGeogit
    				var callback = function(layer){
    					if(layer !== false){ // isGeoGit
    						//this bit is now handled in GeoGitHistoryButton.js
    						/*plugin.parentContainer.show();
        					plugin.parentContainer.expand();
    						plugin.target.portal.doLayout();*/
    						
        					plugin.workspace = workspace;
        					plugin.dataStore = layer.geogitStore;
        					plugin.path = layer.nativeName;
        					
    		        		plugin.url = geoserverUrl + 'geogit/' + workspace + ':' + layer.geogitStore + '/log?path=' + layer.nativeName + '&output_format=JSON';
    		        		plugin.store.url = plugin.url;
    		        		plugin.store.proxy.conn.url = plugin.url;
    		        		plugin.store.proxy.url = plugin.url;
    		        		plugin.store.load();
    					}else{ // isNotGeoGit
    						plugin.parentContainer.hide();
    						plugin.target.portal.doLayout();
    					}
    				};
    				
    				geogitUtil.isGeoGitLayer(layerRecord.data.layer, callback);
            	}
        	}
        };

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        } 
        featureManager.on("layerchange", onLayerChange, this);
        
        return geogitHistory;
    },
    
    fetchIsGeoGitLayer: function(url, workspace, featureType, isGeoGit, isNotGeoGit, error){
		OpenLayers.Request.GET({
			url: url + 'rest/layers/' + workspace + ':' + featureType + '.json',
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
									isGeoGit(workspace, featureType, storeInfo.dataStore);
								}else{
									if(isNotGeoGit){
										isNotGeoGit(storeInfo.dataStore);
									}
								}
							}else{
								error();
							}
						}else{
							error();
						}
					},
					failure: error
				});
			},
			failure: error
		});
	}
                
});

Ext.preg(gxp.plugins.GeoGitHistory.prototype.ptype, gxp.plugins.GeoGitHistory);
