/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @requires GeoExt/widgets/LegendPanel.js
 * @requires GeoExt/widgets/WMSLegend.js
 *
 * @requires salamatiLocale/en.js
 * @requires salamatiLocale/es.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = Settings
 */
 
var salamati = {
	ActionTip_Settings: "Settings",
	ActionTip_ShowSettings: "Show Settings"
}

var lang = "es";

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: Settings(config)
 *
 *    Provides an action to display a legend in a new window.
 */
gxp.plugins.Settings = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_Settings */
    ptype: "gxp_Settings",
    
    /** api: config[menuText]
     *  ``String``
     *  Text for legend menu item (i18n).
     */
    menuText: salamati.ActionTip_Settings,

    /** api: config[tooltip]
     *  ``String``
     *  Text for legend action tooltip (i18n).
     */
    tooltip: salamati.ActionTip_ShowSettings,

    /** api: config[actionTarget]
     *  ``Object`` or ``String`` or ``Array`` Where to place the tool's actions
     *  (e.g. buttons or menus)? Use null as the default since our tool has both 
     *  output and action(s).
     */
    actionTarget: null,
    
    /** private: method[constructor]
     */
    constructor: function(config) {
        gxp.plugins.Settings.superclass.constructor.apply(this, arguments);
        
        if (!this.outputConfig) {
            this.outputConfig = {
                width: 100,
                height: 80
            };
        }
        Ext.applyIf(this.outputConfig, {title: this.menuText});
        
        this.lang = localStorage.getItem("lang");
        console.log("App.lang: " + this.lang);
    },

    /** api: method[addActions]
     */
    addActions: function() {
        var actions = [{
            menuText: this.menuText,
            iconCls: "gxp-icon-legend",
            tooltip: this.tooltip,
            handler: function() {
                this.removeOutput();
                this.addOutput();
            },
            scope: this
        }];
        return gxp.plugins.Settings.superclass.addActions.apply(this, [actions]);
    },

    /** api: method[getLegendPanel]
     *  :returns: ``GeoExt.LegendPanel``
     *
     *  Get the legend panel associated with this legend plugin.
     */
    getLegendPanel: function() {
        return this.output[0];
    },

    /** private: method[addOutput]
     *  :arg config: ``Object``
     */
    addOutput: function(config) {
    
    	console.log("App.lang: " + this.lang);
    
    	if(this.lang == "en") {
    		localStorage.setItem("lang", "es");
    		console.log("Spanish");
    	}
    	else if(this.lang == "es") {
    		localStorage.setItem("lang", "en");
    		console.log("English");
    	}
    	location.reload();
    	
        return gxp.plugins.Settings.superclass.addOutput.call(this, Ext.apply({
            xtype: 'gx_legendpanel',
            ascending: false,
            border: false,
            hideMode: "offsets",
            layerStore: this.target.mapPanel.layers,
            defaults: {cls: 'gxp-legend-item'}
        }, config));
    }

});

Ext.preg(gxp.plugins.Settings.prototype.ptype, gxp.plugins.Settings);
