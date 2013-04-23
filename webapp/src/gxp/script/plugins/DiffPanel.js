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
    store: null,
    
    /**
     * Ext.grid.GridPanel
     */
    grid: null,
    
//    parentContainer: null,
//    
//    featureManager: null,
//    
//    geogitUtil: null,
//    
//    workspace: null,
//    
//    path: null,
//    
//    dataStore: null,
    
    constructor: function() {
        console.log("diffpanel constructor");
        this.addEvents(
            /** api: event[commitdiffselected]
             *  Fired when a new source is selected.
             *
             *  Listener arguments:
             *  * tool - :class:`gxp.plugins.AddLayers` This tool.
             *  * store - :class:`Ext.data.Store` The data to be displayed in the diff panel.
             */
            "commitdiffselected"
        );
        this.on({
            commitdiffselected: function(tool, store) {
                console.log("commitdefselected event received. store: ", store);
                
                //TODO change this.store url to the url of the store passed in
                this.store.url = store.url;
                this.store.proxy.conn.url = store.url;
                this.store.proxy.url = store.url;
                console.log("commitdefselected event received. store.url: ", store.url);
                this.store.load();
                app.portal.doLayout();
            },
            scope: this
        });
        gxp.plugins.DiffPanel.superclass.constructor.apply(this, arguments);
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
        console.log("diffpanel add output");
        this.parentContainer = Ext.getCmp(this.outputTarget);
    	
        var featureManager = this.target.tools[this.featureManager];
        var geogitUtil = this.target.tools[this.geogitUtil];
        
        var map = this.target.mapPanel.map;
        var url = "http://192.168.10.175/geoserver/geogit/lmn_demo:DemoRepo/log?path=osm_point_hospitals&output_format=JSON";
        this.store = new Ext.data.Store({
            url: url,
            reader: new Ext.data.JsonReader({
    		    root: 'response.Feature',
    		    fields: [{
    		        name: 'fid',
    		        mapping: 'id'
    		    },{
    		        name: 'change',
    		        mapping: 'change'
    		    },{
                    name: 'geometry',
                    mapping: 'geometry'
                }]
            }),
            autoLoad: true
        });

        console.log("diffpanel temp store ", this.store);
        
        var addToolTip = function(value, metadata, record, rowIndex, colIndex, store){
            metadata.attr = 'title="' + value + '"';
            return value;
        };
        var plugin = this;
        this.grid = new Ext.grid.GridPanel({
            store: this.store,
            //cls: "gxp-diffpanel-cls",
            border: false,
            hideParent: false,
            flex: 1,
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: false,
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
                autoFill: true
            },
            listeners: {
                'cellclick': function(grid, rowIndex, columnIndex, e){
                    console.log("diffpanel cell clicked");
                }
            }
        });

        config = Ext.apply(
            this.grid,
            config || {});
        
        var diffPanel = gxp.plugins.DiffPanel.superclass.addOutput.call(this, config);
    }
});
Ext.preg(gxp.plugins.DiffPanel.prototype.ptype, gxp.plugins.DiffPanel);