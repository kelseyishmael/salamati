/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @requires GeoGitUtil.js
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
    
    /* i18n */
    Text_Author: "Author",
    Text_Email: "Email",
    Text_Message: "Message",
    Text_CommitId: "Commit Id",
    Text_Date: "Date",
    /* end i18n */
    
    /** api: ptype = gxp_geogithistory */
    ptype: "gxp_geogithistory",
    
    store: null,
    
    featureManager: null,
    
    workspace: null,
    
    path: null,
    
    dataStore: null,
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
    	
        var featureManager = this.target.tools[this.featureManager];
        
        var map = this.target.mapPanel.map;
        var url = "default";
        this.store = new Ext.data.Store({
        	url: url,
    		reader: gxp.GeoGitUtil.logReader,
    		autoLoad: false
    	});
        
        var addToolTip = function(value, metadata, record, rowIndex, colIndex, store){
        	metadata.attr = 'title="' + value + '"';
        	return value;
        };
        var plugin = this;
        
        config = Ext.apply({
            xtype: "grid",
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
                    header: plugin.Text_Author,
                    dataIndex: 'author'
                },{
                    id: 'email',
                    header: plugin.Text_Email,
                    dataIndex: 'email'
                },{
                    id: 'message',
                    header: plugin.Text_Message,
                    dataIndex: 'message'
                },{
                    id: 'commit',
                    header: plugin.Text_CommitId,
                    dataIndex: 'commit'
                },{
                    id: 'date',
                    header: plugin.Text_Date,
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
                        reader: gxp.GeoGitUtil.diffReader,
                        autoLoad: true
                    });
                    console.log("store", store);
                }
            }
        }, config || {});
        
        var geogitHistory = gxp.plugins.GeoGitHistory.superclass.addOutput.call(this, config);

        var onLayerChange = function(tool, layerRecord, schema) {
        	if(schema && schema.url){
        		var typeName = schema.reader.raw.featureTypes[0].typeName;
        		var workspace = schema.reader.raw.targetPrefix;
        		
        		if(layerRecord && layerRecord.data && layerRecord.data.layer){
        			var key = workspace + ':' + typeName;
        			
    				var geoserverIndex = schema.url.indexOf('geoserver/');
    				var geoserverUrl = schema.url.substring(0, geoserverIndex + 10);
    				
    				//isGeogit
    				var callback = function(layer){
    					if(layer !== false){ // isGeoGit
    						//this bit is now handled in GeoGitHistoryButton.js
    						/*plugin.parentContainer.show();
        					plugin.parentContainer.expand();
    						plugin.target.portal.doLayout();*/
    						
        					plugin.workspace = workspace;
        					plugin.dataStore = layer.metadata.geogitStore;
        					plugin.path = layer.metadata.nativeName;
        					
    		        		plugin.url = geoserverUrl + 'geogit/' + workspace + ':' + layer.metadata.geogitStore + '/log?path=' + layer.metadata.nativeName + '&output_format=JSON';
    		        		plugin.store.url = plugin.url;
    		        		plugin.store.proxy.conn.url = plugin.url;
    		        		plugin.store.proxy.url = plugin.url;
    		        		plugin.store.load();
    					}else{ // isNotGeoGit
    					    plugin.output[0].ownerCt.hide();
    					    plugin.target.portal.doLayout();
    					}
    				};
    				
    				gxp.GeoGitUtil.isGeoGitLayer(layerRecord.data.layer, callback);
            	}
        	}
        };

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        } 
        featureManager.on("layerchange", onLayerChange, this);
        
        return geogitHistory;
    }
                
});

Ext.preg(gxp.plugins.GeoGitHistory.prototype.ptype, gxp.plugins.GeoGitHistory);
