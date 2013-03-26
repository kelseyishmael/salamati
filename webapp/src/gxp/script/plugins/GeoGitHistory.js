/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * 
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
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
    	this.parentContainer = Ext.getCmp(this.outputTarget);
    	
        var featureManager = this.target.tools[this.featureManager];
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
    				var record = grid.getStore().getAt(rowIndex);
    				console.log("data", record.data);
    			}
    		}
		});
        
        config = Ext.apply(this.grid, config || {});
        
        var geogitHistory = gxp.plugins.GeoGitHistory.superclass.addOutput.call(this, config);
        
        var plugin = this;
        var onLayerChange = function(tool, layerRecord, schema) {
        	if(schema && schema.url){
        		var typeName = schema.reader.raw.featureTypes[0].typeName;
        		var workspace = schema.reader.raw.targetPrefix;
        		
        		if(layerRecord){
            		var source = plugin.target.getSource(layerRecord);
                	
            		if(source && source.schemaCache){
            			var schemaCache = source.schemaCache;
            			var key = workspace + ':' + typeName;
            			
            			if(schemaCache[key]){
            				var geoserverIndex = schema.url.indexOf('geoserver');
            				var geoserverUrl = schema.url.substring(0, geoserverIndex + 10);
            				
            				var updateStore = function(dataStore){
            					plugin.parentContainer.show();
            					plugin.parentContainer.expand();
        						plugin.target.portal.doLayout();
            					
        		        		plugin.url = geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/log?path=' + typeName + '&output_format=JSON';
        		        		plugin.store.url = plugin.url;
        		        		plugin.store.proxy.conn.url = plugin.url;
        		        		plugin.store.proxy.url = plugin.url;
        		        		plugin.store.load();
            				};
            				
            				if(schemaCache[key].isGeogit === undefined){
            					var isGeoGit = function(workspace, typeName, dataStore){
            						schemaCache[key].isGeogit = true;
            						schemaCache[key].geogitStore = dataStore.name;
            						updateStore(dataStore.name);
            					};
            					
            					var isNotGeoGit = function(){
            						schemaCache[key].isGeogit = false;
            						
            						plugin.parentContainer.hide();
            						plugin.target.portal.doLayout();
            					};
            					
            					var error = function(){
            						console.log("error retrieving info");
            					};
            					
            					//check to see if the layer is a geogit layer
            					plugin.fetchIsGeoGitLayer(geoserverUrl, workspace, typeName, isGeoGit, isNotGeoGit, error);
            				}else if(schemaCache[key].isGeogit){
            					updateStore(schemaCache[key].geogitStore);
            				}else{
            					plugin.parentContainer.hide();
        						plugin.target.portal.doLayout();
            				}
            			}
            		}
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