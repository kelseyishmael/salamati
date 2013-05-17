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
 *  class = GeoGitFeatureAttributeGrid
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: GeoGitFeatureAttributeGrid(config)
 *
 *    Plugin for displaying GeoGit Feature Attributes in a grid. Requires a
 *    :class:`gxp.plugins.Tool`.
 */ 

gxp.plugins.GeoGitFeatureAttributeGrid = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_geogitattributegrid */
    ptype: "gxp_geogitattributegrid",
    
    store: null,
    
    grid: null,
    
    valueIndex: null,
    
    /* i18n */
    Text_Name: "Name",
    Text_Value: "Value",
    /* end i18n */
    
    constructor: function() {
        this.addEvents(
            /** api: event[getattributeinfo]
             *  Fired when a feature from the diff is zoomed in on.
             *
             *  Listener arguments:
             *  * store - :class:`Ext.data.Store` The data to be displayed in the diff panel.
             *  * oldCommitId - ``String`` The old commit id to use for the diff.
             *  * newCommitId - ``String`` The new commit id to use for the diff.
             *  * path - ``String`` The path to the feature
             *  
             */
            "getattributeinfo"
        );
        this.on({
            getattributeinfo: function(store, oldCommitId, newCommitId, path, transactionId) { 
                if(this.grid.view) {
                    this.store.clearData();
                    this.grid.view.refresh();
                }
                var index = store.url.indexOf('diff?');
                var url = store.url.substring(0, index) + "featurediff?all=true&oldCommitId=" + oldCommitId + "&newCommitId="+ newCommitId + "&path=" + path + "&output_format=JSON";
                this.store.url = url;
                this.store.proxy.conn.url = url;
                this.store.proxy.url = url;
                this.store.load();
                app.portal.doLayout();
            },
            getmergeinfo: function(store, oldCommitId, newCommitId, ancestorCommitId, data, transactionId) {
                if(this.grid.view) {
                    this.store.clearData();
                    this.grid.view.refresh();
                }
                var plugin = this;
                index = store.url.indexOf('merge?');
                OpenLayers.Request.GET({
                    url: store.url.substring(0, index) + "featurediff?all=true&oldCommitId=" + ancestorCommitId + "&newCommitId="+ newCommitId + "&path=" + data.fid + "&transactionId=" + transactionId + "&output_format=JSON",
                    success: function(results){
                        var theirInfo = Ext.decode(results.responseText);
                        OpenLayers.Request.GET({
                            url: store.url.substring(0, index) + "featurediff?all=true&oldCommitId=" + ancestorCommitId + "&newCommitId="+ oldCommitId + "&path=" + data.fid + "&transactionId=" + transactionId + "&output_format=JSON",
                            success: function(results){
                                var ourInfo = Ext.decode(results.responseText);
                                var array = [];
                                console.log("theirInfo", theirInfo);
                                console.log("ourInfo", ourInfo);
                                for(var index = 0; index < theirInfo.response.diff.length; index++) {
                                    var ourvalue;
                                    var theirvalue;
                                    var ourchangetype;
                                    if(data.change === "ADDED"){
                                        ourvalue = "";
                                        ourchangetype = "NO_CHANGE";
                                    } else if(ourInfo.response.diff[index].changetype === "NO_CHANGE" || ourInfo.response.diff[index].changetype === "REMOVED"){
                                        ourvalue = ourInfo.response.diff[index].oldvalue;
                                        ourchangetype = ourInfo.response.diff[index].changetype;
                                    } else {
                                        ourvalue = ourInfo.response.diff[index].newvalue;
                                        ourchangetype = ourInfo.response.diff[index].changetype;
                                    }
                                    if(theirInfo.response.diff[index].changetype === "NO_CHANGE" || theirInfo.response.diff[index].changetype === "REMOVED"){
                                        theirvalue = theirInfo.response.diff[index].oldvalue;
                                    } else {
                                        theirvalue = theirInfo.response.diff[index].newvalue;
                                    }
                                    array[index] = [
                                            theirInfo.response.diff[index].attributename,
                                            ourchangetype,
                                            ourvalue,
                                            theirInfo.response.diff[index].changetype,
                                            theirvalue
                                            ]
                                }
                                var store = new Ext.data.ArrayStore({
                                    idIndex: 0,  
                                    fields: [
                                       'name',
                                       'ourchangetype',
                                       'ourvalue',
                                       'theirchangetype',
                                       'theirvalue'
                                    ]
                                });
                                console.log("array", array);
                                store.loadData(array);
                                console.log("this", plugin);
                                plugin.grid.reconfigure(store, plugin.grid.getColumnModel());
                                console.log("store", store);
                            },
                            failure: this.errorFetching
                        });
                    },
                    failure: this.errorFetching
                });
            },
            beginMerge: function(store, transactionId, ours, theirs) {
                this.grid.getColumnModel().setColumnHeader(1,ours);
                this.grid.getColumnModel().columns[1].dataIndex = "ourvalue";
                this.grid.getColumnModel().setHidden(2,false);
                this.grid.getColumnModel().setColumnHeader(3,theirs);
                this.grid.getColumnModel().columns[3].dataIndex = "theirvalue";
                this.grid.view.refresh();
            },
            endMerge: function() {
                this.grid.getColumnModel().setColumnHeader(1,"Old");
                this.grid.getColumnModel().columns[1].dataIndex = "oldvalue";
                this.grid.getColumnModel().setHidden(2,true);
                this.grid.getColumnModel().setColumnHeader(3,"New");
                this.grid.getColumnModel().columns[3].dataIndex = "newvalue";
                this.grid.view.refresh();
            },
            scope: this
        });
        gxp.plugins.GeoGitFeatureAttributeGrid.superclass.constructor.apply(this, arguments);
    },
    
    addOutput: function(config) {
        
        var url = "default";
        this.store = new Ext.data.Store({
            url: url,
            reader: gxp.GeoGitUtil.featureDiffReader,
            autoLoad: false
        });
        
        var plugin = this;
        
        this.grid = new Ext.grid.GridPanel({
            store: this.store,
            cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls',
            columnLines: true,
            flex: 1.0,
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: false
                },
                columns: [{
                    id: 'name',
                    header: plugin.Text_Name,
                    dataIndex: 'name'
                },{
                    id: 'leftvalue',
                    header: "Old",
                    dataIndex: "oldvalue",
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.change !== undefined) {
                            metaData.css = plugin.determineCellCss(record.data.change);
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.ourchangetype);
                        }
                        return value;                   
                    }
                },{
                    id: 'mergevalue',
                    header: "Merge",
                    dataIndex: "theirvalue",
                    hidden: true,
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.ourchangetype !== "NO_CHANGE") {
                            if(record.data.theirchangetype === "NO_CHANGE") {
                                metaData.css = plugin.determineCellCss(record.data.ourchangetype);
                                value = record.data.ourvalue;
                            } else {
                                metaData.css = 'gxp-conflicted-cls';
                                return null;
                            }
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.theirchangetype);
                        }
                        return value;                   
                    }
                },{
                    id: 'rightvalue',
                    header: "New",
                    dataIndex: "newvalue",
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.change !== undefined) {
                            if(record.data.change === "NO_CHANGE") {
                                value = record.data.oldvalue;                            
                            }
                            metaData.css = plugin.determineCellCss(record.data.change);
                        } else {
                            metaData.css = plugin.determineCellCss(record.data.theirchangetype);
                        }
                        return value;                   
                    }
                }]
            }),
            viewConfig: {
                forceFit: true,
                getRowClass : function(record, index, rowParams, store) {
                    // Not sure if there is a better way to do this, perhaps I should store the geometry field name on the layer metadata?
                    var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
                    var properties = app.tools['feature_manager'].schema.reader.raw.featureTypes[0].properties;
                    var name = null;
                    for(var index=0; index < properties.length; index++) {
                        var match = geomRegex.exec(properties[index].type);
                        if(match) {
                            name = properties[index].name;
                            break;
                        }
                    }
                    if (name === record.get("name")) {
                        return "x-hide-nosize";
                    }
                    /*if(record.data.change === "MODIFIED") {
                        return 'gxp-modified-cls';
                    } else if(record.data.change === "ADDED") {
                        return 'gxp-added-cls';
                    } else if(record.data.change === "REMOVED") {
                        return 'gxp-removed-cls';
                    }*/
                }
            }
        });
        
        config = Ext.apply(this.grid, config || {});
        
        var geogitFeatureAttributeGrid = gxp.plugins.GeoGitFeatureAttributeGrid.superclass.addOutput.call(this, config);
        
        return geogitFeatureAttributeGrid;  
    },
    
    errorFetching: function(){
        throw "GeoGitFeatureAttributeGrid: Error fetching info";
    },
    
    determineCellCss: function(changeType) {
        if(changeType === "ADDED") {
            return 'gxp-added-cls';
        } else if(changeType === "REMOVED") {
            return 'gxp-removed-cls';
        } else if(changeType === "MODIFIED") {
            return 'gxp-modified-cls';
        }
    }
});

Ext.preg(gxp.plugins.GeoGitFeatureAttributeGrid.prototype.ptype, gxp.plugins.GeoGitFeatureAttributeGrid);