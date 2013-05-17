/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires GeoGitUtil.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = DiffPanel
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: DiffPanel(config)
 *
 *    Plugin for displaying GeoGit History in a grid. Requires a
 *    :class:`gxp.plugins.Tool`.
 */   
gxp.plugins.DiffPanel = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_diffpanel */
    ptype: "gxp_diffpanel",
    
    /**
     * Ext.data.Store
     */
    diffStore: null,
    
    mergeStore: null,
    
    /**
     * Ext.grid.GridPanel
     */
    grid: null,
    
    oldCommitId: null,
    
    newCommitId: null,
    
    ancestorCommitId: null,
    
    diffLayer: null,
    
    newStyle: null,
    
    oldStyle: null,
    
    modifiedStyle: null,
    
    merge: false,
    
    transactionId: null,
    
    constructor: function() {
        this.addEvents(
            /** api: event[commitdiffselected]
             *  Fired when the diff button from the GeoGitHistory plugin is pressed.
             *
             *  Listener arguments:
             *  * store - :class:`Ext.data.Store` The data to be displayed in the diff panel.
             *  * oldCommitId - ``String`` The old commit id to use for the diff.
             *  * newCommitId - ``String`` The new commit id to use for the diff.
             */
            "commitdiffselected"
        );
        this.on({
            commitdiffselected: function(store, oldCommitId, newCommitId) {
                
                //TODO change this.store url to the url of the store passed in                
                if(this.grid.view) {
                    this.diffStore.clearData();
                    this.grid.view.refresh();
                }
                this.diffStore.url = store.url;
                this.diffStore.proxy.conn.url = store.url;
                this.diffStore.proxy.url = store.url;
                this.diffStore.load({callback: this.addDiffLayer, scope: this});
                this.oldCommitId = oldCommitId;
                this.newCommitId = newCommitId;
                app.portal.doLayout();                
            },
            beginMerge: function(store, transactionId) {
                this.mergeStore.clearData();
                this.grid.reconfigure(this.mergeStore, this.grid.getColumnModel());
                this.mergeStore.url = store.url;
                this.mergeStore.proxy.conn.url = store.url;
                this.mergeStore.proxy.url = store.url;
                this.merge = true;
                this.transactionId = transactionId;
                this.mergeStore.load({
                    callback: function() {
                        this.oldCommitId = this.mergeStore.reader.jsonData.response.Merge.ours;
                        this.newCommitId = this.mergeStore.reader.jsonData.response.Merge.theirs;
                        this.ancestorCommitId = this.mergeStore.reader.jsonData.response.Merge.ancestor;
                        if(this.mergeStore.reader.jsonData.response.Merge.conflicts !== undefined) {
                            Ext.Msg.show({
                                title: "Conflicts",
                                msg: "We have detected " + this.mergeStore.reader.jsonData.response.Merge.conflicts + " conflicts as a result of this merge. Before you can complete this merge these conflicts must be resolved. NOTE: Resolving conflicts in a merge is currently unsupported! Press the cancel button in the GeoGit panel to abort the merge.",
                                buttons: Ext.Msg.OK,
                                fn: function(button) {
                                    app.fireEvent("conflictsDetected");
                                },
                                scope: this,
                                icon: Ext.MessageBox.WARNING,
                                animEl: this.grid.ownerCt.getEl()
                            });
                        }
                        //this.addDiffLayer();
                    },
                    scope: this
                });                
                app.portal.doLayout();         
            },
            endMerge: function() {
                this.grid.reconfigure(this.diffStore, this.grid.getColumnModel());
                this.merge = false;
                this.transactionId = null;
            },
            scope: this
        });
        gxp.plugins.DiffPanel.superclass.constructor.apply(this, arguments);
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {       
        var map = this.target.mapPanel.map;
        var url = "default";
        this.diffStore = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.diffReader,
            autoLoad: false
        });
        
        this.mergeStore = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.mergeReader,
            autoLoad: false
        })
        
        var addToolTip = function(value, metadata, record, rowIndex, colIndex, store){
            metadata.attr = 'title="' + value + '"';
            return value;
        };
        var plugin = this;
        this.grid = new Ext.grid.GridPanel({
            store: this.diffStore,
            cls: "gxp-grid-font-cls gxp-grid-hd-font-cls",
            border: false,
            columnLines: true,
            hideParent: false,
            flex: 1,
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: true,
                    renderer: addToolTip
                },
                columns: [{
                    id: 'fid',
                    header: plugin.Title_Fid,
                    dataIndex: 'fid'
                },{
                    id: 'change',
                    header: plugin.Title_Change,
                    dataIndex: 'change'
                }]
            }),
            viewConfig: {
                forceFit: true
            },
            listeners: {
                cellcontextmenu: function(grid, rowIndex, cellIndex, event) {
                    if(diffPanel.getSelectionModel().hasSelection()) {
                        diffPanel.contextMenu.showAt(event.getXY());
                    }
                    event.stopEvent();
                }
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        xtype: 'button',
                        text: plugin.Text_Zoom,
                        handler: function() {
                            var geometryText = diffPanel.getSelectionModel().getSelected().data.geometry;
                            var geometry = OpenLayers.Geometry.fromWKT(geometryText);
                            map.zoomToExtent(geometry.getBounds());
                            //TODO: rather than clamping to a hard-coded zoom level, it should clamp to a scale
                            if(map.zoom > 18) {
                                map.zoomTo(18, map.center);
                            }
                            if(plugin.merge) {
                                app.fireEvent("getmergeinfo", plugin.mergeStore, plugin.oldCommitId, plugin.newCommitId, plugin.ancestorCommitId, diffPanel.getSelectionModel().getSelected().data, plugin.transactionId);
                            } else {
                                app.fireEvent("getattributeinfo", plugin.diffStore, plugin.oldCommitId, plugin.newCommitId, diffPanel.getSelectionModel().getSelected().data.fid);
                            }
                            diffPanel.contextMenu.hide();
                        }
                    }
                ]
            }),
            selModel: new Ext.grid.RowSelectionModel({
                singleSelect: true
            })
        });

        config = Ext.apply(this.grid, config || {});
        
        var diffPanel = gxp.plugins.DiffPanel.superclass.addOutput.call(this, config);
    },
    
    addDiffLayer: function() {        
        if(this.diffLayer === null) {
            this.diffLayer = new OpenLayers.Layer.Vector("Diff");
        } else {
            this.diffLayer.removeAllFeatures();
        }
        var length = this.diffStore.data.items.length;

        for(var index = 0; index < length; index++) {
            var data = this.diffStore.data.items[index].data;
            var style = OpenLayers.Util.applyDefaults(data.change === "REMOVED" ? this.oldStyle : data.change === "ADDED" ? this.newStyle : this.modifiedStyle,
                    OpenLayers.Feature.Vector.style['default']);
            var geom = OpenLayers.Geometry.fromWKT(data.geometry);
            var feature = new OpenLayers.Feature.Vector(geom);
            feature.style = style;
            this.diffLayer.addFeatures(feature);
        }
        var layer = app.mapPanel.map.getLayer(this.diffLayer.id);
        if(length === 0) {
            if(layer) {
                app.mapPanel.map.removeLayer(layer);
            }
            return;
        }
        if(layer === null) {
            app.mapPanel.map.addLayer(this.diffLayer);
        }
        app.mapPanel.map.zoomToExtent(this.diffLayer.getDataExtent());
        if(app.mapPanel.map.zoom > 18) {
            app.mapPanel.map.zoomTo(18, app.mapPanel.map.center);
        }
    }
});
Ext.preg(gxp.plugins.DiffPanel.prototype.ptype, gxp.plugins.DiffPanel);