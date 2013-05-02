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
            getattributeinfo: function(store, oldCommitId, newCommitId, path) { 
                var index = store.url.indexOf('diff?');
                var url = store.url.substring(0, index) + "featurediff?all=true&oldCommitId=" + oldCommitId + "&newCommitId="+ newCommitId + "&path=" + path + "&output_format=JSON";
                this.store.url = url;
                this.store.proxy.conn.url = url;
                this.store.proxy.url = url;
                this.store.load();
                app.portal.doLayout();
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
        
        config = Ext.apply({
            xtype: "grid",
            store: this.store,
            cls: 'gxp-grid-font-cls gxp-grid-hd-font-cls',
            border: false,
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
                    id: 'value',
                    header: plugin.Text_Value,
                    dataIndex: plugin.valueIndex,
                    renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                        if(record.data.change === "NO_CHANGE") {
                            value = record.data.oldvalue;                            
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
                    if(record.data.change === "MODIFIED") {
                        return 'gxp-modified-cls';
                    } else if(record.data.change === "ADDED") {
                        return 'gxp-added-cls';
                    } else if(record.data.change === "REMOVED") {
                        return 'gxp-removed-cls';
                    }
                }
            }
        }, config || {});
        
        var geogitFeatureAttributeGrid = gxp.plugins.GeoGitFeatureAttributeGrid.superclass.addOutput.call(this, config);
        
        return geogitFeatureAttributeGrid;  
    }
});

Ext.preg(gxp.plugins.GeoGitFeatureAttributeGrid.prototype.ptype, gxp.plugins.GeoGitFeatureAttributeGrid);