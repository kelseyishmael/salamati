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

    historyTpl: '<ol><div class="info">{[this.formatDate()]}</div><tpl for="."><tpl if="this.checkForGeometry(name, xindex)"><li class="diff"><div class="attr-name">Geometry was {change}.</div></li></tpl><tpl if="this.checkForGeometry(name, -1) == false"><li class="diff"><div class="attr-name">{name} was {change}.</div><tpl if="change == &quot;MODIFIED&quot;"><div class="attr-value">Was {oldvalue}, now {newvalue}.</div></tpl><tpl if="change == &quot;ADDED&quot;"><div class="attr-value">Now {newvalue}.</div></tpl><tpl if="change == &quot;REMOVED&quot;"><div class="attr-value">Was {oldvalue}.</div></tpl></li></tpl></tpl>',

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
    
    geogitUtil: null,
    
    featureManager: null,
    
    target: null,
    
    commits: null,
    
    workspace: null,
    
    path: null,
    
    dataStore: null,
    
    store: null,
    
    nullObjectId: "0000000000000000000000000000000000000000",
    
    nextCommitText: "Next",
    
    nextCommitTooltip: "See what changed in the next commit",
    
    prevCommitText: "Prev",
    
    prevCommitTooltip: "See what changed in the previous commit",
    
    buttons: null,
    
    commitIndex: 0,
    
    diffLayer: null,

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
        
        var nextCommitButton = new Ext.Button({
            text: this.nextCommitText,
            tooltip: this.nextCommitTooltip,
            handler: this.nextCommit,
            width: "99",
            scope: this
        });
        
        var prevCommitButton = new Ext.Button({
            text: this.prevCommitText,
            tooltip: this.prevCommitTooltip,
            handler: this.previousCommit,
            width: "99",
            scope: this
        });
        
        this.buttons = [prevCommitButton, nextCommitButton];
        
        var addPanel = function(dataView){
        	plugin.historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle,
                tbar: [plugin.buttons]
            });
        	plugin.add(plugin.historyTab);
        };
        
        this.createDataView(addPanel);
    },

    /** private: method[createDataView]
     */
    createDataView: function(addPanel) {
    	if(this.schema) {
        var typeName = this.schema.reader.raw.featureTypes[0].typeName;
    	}
        
        var geoserverIndex = this.schema.url.indexOf('geoserver/');
        this.url = this.schema.url.substring(0, geoserverIndex + 9) + '/';

        var plugin = this;
        
        this.workspace = this.schema.reader.raw.targetPrefix;
        var isGeoGit = function(layer){
        	plugin.dataStore = layer.geogitStore;

        	if(plugin.feature == null || plugin.feature.fid == null || layer === false) {
        		return;
        	}
        	plugin.path = layer.nativeName.split(":").pop() + "/" + 
        			   plugin.feature.fid.replace(typeName.split(":").pop(), layer.nativeName.split(":").pop());
            if (plugin.url.charAt(plugin.url.length-1) !== '/') {
                plugin.url = plugin.url + "/";
            }
            var command = 'log';
            var url = plugin.url + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/' + command;
            url = Ext.urlAppend(url, 'path=' + plugin.path + '&output_format=json');
            
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
        		listeners: {
        			"load": function() {
        				plugin.commits = store.data.items;  
        				if(plugin.commits.length > 1) {
        					plugin.createDiffStore(plugin.commits[0].id, plugin.commits[1].id, addPanel);
        				} else {
        					plugin.createDiffStore(plugin.commits[0].id, plugin.nullObjectId, addPanel);
        				}
        				
        			}
        		}, 
        		autoLoad: true
        	});
        };
        var featureType = null;
        if(this.schema) {
        	featureType = this.schema.baseParams['TYPENAME'];
        }

        var geogitUtil = this.target.tools[this.geogitUtil];
        var featureManager = this.target.tools[this.featureManager];
        geogitUtil.isGeoGitLayer(featureManager.layerRecord.data.layer, isGeoGit);
    },

    createDiffStore: function(newCommitId, oldCommitId, addPanel) {
        var url = this.url + 'geogit/' + this.workspace + ':' + this.dataStore + '/featurediff';
        url = Ext.urlAppend(url, 'path=' + this.path + '&oldCommitId='+ oldCommitId + '&newCommitId=' + newCommitId + '&output_format=json');
        var me = this;
        this.store = new Ext.data.Store({
        	url: url,
    		reader: new Ext.data.JsonReader({
    			root: 'response.diff',
    			fields: [
          			   {
          				   name: 'name',
          				   mapping: 'attributename'
          			   },{
          				   name: 'change',
          				   mapping: 'changetype'
          			   },{
          				   name: 'newvalue',
          				   mapping: 'newvalue'
          			   },{
          				   name: 'oldvalue',
          				   mapping: 'oldvalue'
          			   }
          			],
          		idProperty: 'attributename'
    			}),
        		listeners: {
        			"load": function() { 
        				if(me.commitIndex === 0) {
        					if(me.buttons[1].disabled != true) {
        						me.buttons[1].disable();
        					}
        					
        					if(me.commitIndex === me.commits.length-1) {
        						me.buttons[0].disable();
        					} else if(me.buttons[0].disabled === true) {
        						me.buttons[0].enable();
        					}
        				} else if(me.commitIndex === me.commits.length-1) {
        					if(me.buttons[0].disabled != true) {
        						me.buttons[0].disable();
        					}
        					if(me.buttons[1].disabled === true) {
        						me.buttons[1].enable();
        					}
        				} else {
        					if(me.buttons[0].disabled === true) {
        						me.buttons[0].enable();
        					}else if(me.buttons[1].disabled === true) {
        						me.buttons[1].enable();
        					}
        				}
        			}
        		},
    			autoLoad: true
    		});
        
        var tpl = new Ext.XTemplate(me.historyTpl, {
            formatDate: function() {
            	var value = me.commits[me.commitIndex].data.date;           	
                var now = new Date(), result = '';
                result += me.commits[me.commitIndex].data.author + ", authored ";
                if (value > now.add(Date.DAY, -1)) {
                    var hours = Math.round((now-value)/(1000*60*60));
                    result += hours + ' ';
                    result += (hours > 1) ? me.hours : me.hour;
                    result += ' ' + me.ago + '.';
                    return result;
                } else if (value > now.add(Date.MONTH, -1)) {
                    var days = Math.round((now-value)/(1000*60*60*24));
                    result += days + ' ';
                    result += (days > 1) ? me.days : me.day;
                    result += ' ' + me.ago + '.';
                    return result;
                }
            },
            checkForGeometry: function(type, xindex) {
            	var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
            	var properties = me.target.tools[me.featureManager].schema.reader.raw.featureTypes[0].properties;
            	var name = null;
            	for(var index=0; index < properties.length; index++) {
            		var match = geomRegex.exec(properties[index].type);
            		if(match) {
            			name = properties[index].name;
            			break;
            		}
            	}
            	if(type === name) {
            		if(xindex === -1) {
            			return true;
            		}
            		var vectors = new OpenLayers.Layer.Vector("Attr_diff");
            		if(me.diffLayer != null) {
            			var layer = me.target.mapPanel.map.getLayer(me.diffLayer);
            			if(layer != null) {
            				me.target.mapPanel.map.removeLayer(layer);  
            			}
            		}
            		me.diffLayer = vectors.id;
            		var newstyle = OpenLayers.Util.applyDefaults(newstyle, OpenLayers.Feature.Vector.style['default']);
            		newstyle.strokeColor = "#00FF00";
            		newstyle.fillColor = "#00FF00";
            		var newvalue = me.store.data.items[xindex-1].data.newvalue;
            		var newGeom = OpenLayers.Geometry.fromWKT(newvalue);
            		var newFeature = new OpenLayers.Feature.Vector(newGeom);
            		newFeature.style = newstyle;
            		vectors.addFeatures(newFeature);
            		
            		var oldvalue = me.store.data.items[xindex-1].data.oldvalue;
            		if(oldvalue != null){
            			var oldGeom = OpenLayers.Geometry.fromWKT(oldvalue);
            			var oldstyle = OpenLayers.Util.applyDefaults(oldstyle, OpenLayers.Feature.Vector.style['default']);
            			oldstyle.strokeColor = "#FF0000";
            			oldstyle.fillColor = "#FF0000";
            			var oldFeature = new OpenLayers.Feature.Vector(oldGeom);
            			oldFeature.style = oldstyle;
            			vectors.addFeatures(oldFeature);
            		}
            		me.target.mapPanel.map.addLayer(vectors);
            		return true;
            	}
            	return false;
            }
        });
        
        addPanel(new Ext.DataView({
            store: this.store,
            tpl: tpl,
            autoHeight:true,
            listeners: {
            	beforerender: function(dataview){
            		console.log("dataview", dataview);
            	//	dataview.store.load();
            	}
            }
        }));
    },
    
    previousCommit: function() {
    	if(this.commitIndex < this.commits.length-1) {
    		this.commitIndex += 1;
    		var oldCommitId = this.commits.length-1 > this.commitIndex ? this.commits[this.commitIndex+1].id : this.nullObjectId;
    		this.updateDiffPanel(this.commits[this.commitIndex].id, oldCommitId);
    	}
    },
    
    nextCommit: function() {
    	if(this.commitIndex > 0) {
    		this.commitIndex -= 1;
    		this.updateDiffPanel(this.commits[this.commitIndex].id, this.commits[this.commitIndex+1].id);
    	}
    },
    
    updateDiffPanel: function(newCommitId, oldCommitId) {
    	var url = this.url + 'geogit/' + this.workspace + ':' + this.dataStore + '/featurediff';
        url = Ext.urlAppend(url, 'path=' + this.path + '&oldCommitId='+ oldCommitId + '&newCommitId=' + newCommitId + '&output_format=json');
        this.store.url = url;
        this.store.proxy.setUrl(url, true);
        this.store.load();
		if(this.diffLayer != null) {
			var layer = this.target.mapPanel.map.getLayer(this.diffLayer);
			if(layer != null) {
				this.target.mapPanel.map.removeLayer(layer);  
			}
			this.diffLayer = null;
		}	
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
    		if(this.diffLayer != null) {
    			var layer = this.target.mapPanel.map.getLayer(this.diffLayer);
    			if(layer != null) {
    				this.target.mapPanel.map.removeLayer(layer);  
    			}
    			this.diffLayer = null;
    		}
    	}
        this.feature = newPanel.feature;
        this.schema = newPanel.schema;
        this.fields = newPanel.fields;
        this.excludeFields = newPanel.excludeFields;

        this.commitIndex = 0;
               
        var nextCommitButton = new Ext.Button({
            text: this.nextCommitText,
            tooltip: this.nextCommitTooltip,
            handler: this.nextCommit,
            width: "99",
            scope: this
        });
        
        var prevCommitButton = new Ext.Button({
            text: this.prevCommitText,
            tooltip: this.prevCommitTooltip,
            handler: this.previousCommit,
            width: "99",
            scope: this
        });
        
        this.buttons = [prevCommitButton, nextCommitButton];
        
        var plugin = this;
        var addPanel = function(dataView){
        	var historyTab = Ext.ComponentMgr.create({
                xtype: 'panel',
                border: false,
                plain: true,
                layout: 'fit', 
                autoScroll: true, 
                items: [dataView], 
                title: plugin.historyTitle,
                tbar: [plugin.buttons]
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
