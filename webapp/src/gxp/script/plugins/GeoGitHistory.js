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
    Text_Hour: "hour",
    Text_Hours: "hours",
    Text_Day: "day",
    Text_Days: "days",
    Text_Ago: "ago",
    Text_Show_Diff: "Show Diff",
    /* end i18n */
    
    /** api: ptype = gxp_geogithistory */
    ptype: "gxp_geogithistory",
    
    store: null,
    
    diffStore: null,

    featureManager: null,
    
    workspace: null,
    
    path: null,
    
    dataStore: null,
    
    contextMenu: null,
    
    newCommitId: null,
    
    oldCommitId: null,
    
    selectedRows: [],
    
    merging: false,
    
    constructor: function() {
        this.addEvents(
                /** api: event[conflictsDetected]
                 *  Fired when conflicts in a merge are found.
                 */
                "beginMerge",
                /** api: event[conflictsResolved]
                 *  Fired when all conflicts in a merge are resolved.
                 */
                "endMerge"
        );
        this.on({
            beginMerge: function() {
                this.merging = true;
            },
            endMerge: function() {
                this.merging = false;
            },
            scope: this
        });
        gxp.plugins.GeoGitHistory.superclass.constructor.apply(this, arguments);
    },
    
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
        
        this.diffStore = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.diffReader,
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
            cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls',
            border: false,
            hideParent: true,
            flex: 1.0,
            columnLines: true,
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
                    dataIndex: 'date',
                    renderer: function(value) {
                        // Perhaps make this a function in the GeoGitUtil since its technically duplicate code
                        var now = new Date(), result = '';
                        var then = new Date(value);
                        result += then.toLocaleDateString() + ' ' + then.toLocaleTimeString() + " (approx. ";
                        if (value > now.add(Date.DAY, -1)) {
                            var hours = Math.round((now-value)/(1000*60*60));
                            result += hours + ' ';
                            result += (hours > 1) ? plugin.Text_Hours : plugin.Text_Hour;
                            result += ' ' + plugin.Text_Ago + ')';
                            return result;
                        } else if (value > now.add(Date.MONTH, -1)) {
                            var days = Math.round((now-value)/(1000*60*60*24));
                            result += days + ' ';
                            result += (days > 1) ? plugin.Text_Days : plugin.Text_Day;
                            result += ' ' + plugin.Text_Ago + ')';
                            return result;
                        }
                    }
                }]
            }),
            viewConfig: {
                forceFit: true
            },
            listeners: {
    			cellcontextmenu: function(grid, rowIndex, cellIndex, event) {
    			    if(geogitHistory.getSelectionModel().hasSelection() && !plugin.merging) {
    			        geogitHistory.contextMenu.showAt(event.getXY());
    			    }
    			    event.stopEvent();
    			}
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        text: plugin.Text_Show_Diff,
                        iconCls: 'salamati-icon-diff',
                        handler: function() {
                            plugin.selectedRows.sort(function(a,b){return a-b});
                            plugin.oldCommitId = geogitHistory.getStore().getAt(plugin.selectedRows[plugin.selectedRows.length-1]).data.commit;
                            if(plugin.selectedRows.length > 1) {
                                plugin.newCommitId = geogitHistory.getStore().getAt(plugin.selectedRows[0]).data.commit;
                            } else {
                                plugin.newCommitId = geogitHistory.getStore().getAt(0).data.commit;
                            }
                            var geoserverIndex = plugin.url.indexOf('geoserver/');
                            var geoserverUrl = plugin.url.substring(0, geoserverIndex + 10);
                            var url = geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/diff?pathFilter=' + plugin.path + '&oldRefSpec=' + plugin.oldCommitId + '&newRefSpec=' + plugin.newCommitId + '&showGeometryChanges=true&output_format=JSON';
                            plugin.diffStore.url = url;
                            plugin.diffStore.proxy.conn.url = url;
                            plugin.diffStore.proxy.url = url;
                            
                            app.fireEvent("commitdiffselected", plugin.diffStore, plugin.oldCommitId, plugin.newCommitId);
                            geogitHistory.contextMenu.hide();
                        }
                    }
                ]
            }),
            selModel: new Ext.grid.RowSelectionModel({
                listeners: {
                    rowselect: function(selection, rowIndex, record) {
                        plugin.selectedRows.push(rowIndex);
                    },
                    rowdeselect: function(selection, rowIndex, record) {
                        if(plugin.selectedRows.indexOf(rowIndex) !== -1) {
                            plugin.selectedRows.remove(rowIndex);
                        }                            
                    }
                }
            })
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
    						
        					plugin.workspace = workspace;
        					plugin.dataStore = layer.metadata.geogitStore;
        					plugin.path = layer.metadata.nativeName;
        					
    		        		plugin.url = geoserverUrl + 'geogit/' + workspace + ':' + layer.metadata.geogitStore + '/log?firstParentOnly=true&path=' + layer.metadata.nativeName + '&until=' + layer.metadata.branch + '&output_format=JSON';
    		        		plugin.store.url = plugin.url;
    		        		plugin.store.proxy.conn.url = plugin.url;
    		        		plugin.store.proxy.url = plugin.url;
    		        		plugin.store.load();
    					}else{ // isNotGeoGit
    					    plugin.output[0].ownerCt.hide();
    					    plugin.target.portal.doLayout();
    					}
    					plugin.selectedRows = [];
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
