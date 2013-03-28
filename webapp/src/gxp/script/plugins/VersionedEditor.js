/**
 * Copyright (c) 2008-2012 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/FeatureEditorGrid.js
 */

Ext.namespace("gxp.plugins");

gxp.plugins.VersionedEditor = Ext.extend(Ext.TabPanel, {

    /** api: config[url]
     *  ``String``
     *  Url of the web-api endpoint of GeoGit.
     */
    url: null,

    /** api: config[historyTpl]
     *  ``String`` Template to use for displaying the commit history.
     *  If not set, a default template will be provided.
     */
    historyTpl: '<ol><tpl for="."><li class="commit"><div class="commit-msg">{message}</div><div>{author} <span class="commit-datetime">authored {date:this.formatDate}</span></div></li></tpl>',

    /* i18n */
    attributesTitle: "Attributes",
    historyTitle: "History",
    hour: "hour",
    hours: "hours",
    day: "day",
    days: "days",
    ago: "ago",
    /* end i18n */

    border: false,
    activeTab: 0,

    /** api: config[editor]
     *  The ptype of the attribute editor to use. One of 'gxp_editorgrid' or
     *  'gxp_editorform'. Defaults to 'gxp_editorgrid'.
     */
    editor: null,

    /** private: property[attributeEditor]
     *  ``gxp.plugins.FeatureEditorGrid`` or ``gxp.plugins.FeatureEditorForm``
     */
    attributeEditor: null,
    
    historyTab: null,

    /** api: ptype = gxp_versionededitor */
    ptype: "gxp_versionededitor",

    /** private: method[initComponent]
     */
    initComponent: function() {
        gxp.plugins.VersionedEditor.superclass.initComponent.call(this);
        var editorConfig = {
            feature: this.initialConfig.feature,
            schema: this.initialConfig.schema,
            fields: this.initialConfig.fields,
            excludeFields: this.initialConfig.excludeFields,
            propertyNames: this.initialConfig.propertyNames,
            readOnly: this.initialConfig.readOnly
        };
        var config = Ext.apply({
            xtype: this.initialConfig.editor || "gxp_editorgrid",
            title: this.attributesTitle
        }, editorConfig);
        this.attributeEditor = Ext.ComponentMgr.create(config);
        this.add(this.attributeEditor);
        
        var plugin = this;
        var addPanel = function(dataView){
        	plugin.historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle
            });
        	plugin.add(plugin.historyTab);
        };
        
        this.createDataView(addPanel);
    },
    
    isGeoGitLayer: function(url, featureType, isGeoGit, isNotGeoGit, error){
		OpenLayers.Request.GET({
			url: url + 'rest/layers/' + featureType + '.json',
			success: function(results){
				var jsonFormatter = new OpenLayers.Format.JSON();
				var layerinfo = jsonFormatter.read(results.responseText);
				var resourceUrl = layerinfo.layer.resource.href;
				
				var colonIndex = featureType.indexOf(':');
				var workspace = featureType.substring(0, colonIndex);
				
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
									isGeoGit(workspace, storeInfo.dataStore);
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
	},

    /** private: method[createDataView]
     */
    createDataView: function(addPanel) {
    	if(this.schema) {
        var typeName = this.schema.reader.raw.featureTypes[0].typeName;
    	}
        
        var geoserverIndex = this.schema.url.indexOf('geoserver');
        this.url = this.schema.url.substring(0, geoserverIndex + 9) + '/';

        var plugin = this;
        
        var isGeoGit = function(workspace, dataStore){
        	if(plugin.feature == null) {
        		return;
        	}
        	var path = typeName.split(":").pop() + "/" + plugin.feature.fid;
            if (plugin.url.charAt(plugin.url.length-1) !== '/') {
                plugin.url = plugin.url + "/";
            }
            var command = 'log';
            var url = plugin.url + 'geogit/' + workspace + ':' + dataStore.name + '/' + command;
            url = Ext.urlAppend(url, 'path=' + path + '&output_format=json');
            
            var store = new Ext.data.Store({
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
            
            var me = plugin;
            var tpl = new Ext.XTemplate(plugin.historyTpl, {
                formatDate: function(value) {
                    var now = new Date(), result = '';
                    if (value > now.add(Date.DAY, -1)) {
                        var hours = Math.round((now-value)/(1000*60*60));
                        result += hours + ' ';
                        result += (result > 1) ? me.hours : me.hour;
                        result += ' ' + me.ago;
                        return result;
                    } else if (value > now.add(Date.MONTH, -1)) {
                        var days = Math.round((now-value)/(1000*60*60*24));
                        result += days + ' ';
                        result += (result > 1) ? me.days : me.day;
                        result += ' ' + me.ago;
                        return result;
                    }
                }
            });
            
            addPanel(new Ext.DataView({
                store: store,
                tpl: tpl,
                autoHeight:true,
                listeners: {
                	beforerender: function(dataview){
                		console.log("dataview", dataview);
                	//	dataview.store.load();
                	}
                }
            }));
        };
        
        if(this.schema) {
        var featureType = this.schema.baseParams['TYPENAME'];
        }
        this.isGeoGitLayer(this.url, featureType, isGeoGit, null, null);
    },

    /** private: method[init]
     *
     *  :arg target: ``gxp.FeatureEditPopup`` The feature edit popup 
     *  initializing this plugin.
     */
    init: function(target) {
        // make sure the editor is not added, we will take care
        // of adding the editor to our container later on
        target.on('beforeadd', OpenLayers.Function.False, this);
        this.attributeEditor.init(target);
        target.un('beforeadd', OpenLayers.Function.False, this);
        target.add(this);
        target.doLayout();
    },
    
    reset: function(newPanel) {
    	this.attributeEditor.reset(newPanel);
    	if(newPanel.feature == null) {
    		this.remove(this.historyTab);
    		this.historyTab = null;
    	}
        this.feature = newPanel.feature;
        this.schema = newPanel.schema;
        this.fields = newPanel.fields;
        this.excludeFields = newPanel.excludeFields;

        var plugin = this;
        var addPanel = function(dataView){
        	var historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle
            });
        	if(plugin.historyTab != null) {
        		plugin.remove(plugin.historyTab);
        	}
        	plugin.historyTab = historyTab;
        	plugin.add(plugin.historyTab);
        };
        
        this.createDataView(addPanel);
    }

});

Ext.preg(gxp.plugins.VersionedEditor.prototype.ptype, gxp.plugins.VersionedEditor);
