/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GeoGitHistoryButton
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: AutoLayerRefreshButton(config)
 *
 *    Plugin to automatically refresh all layers
 */
gxp.plugins.AutoLayerRefreshButton = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_geogithistorybutton */
    ptype: "gxp_autolayerrefreshbutton",
    
    /** api: config[buttonTip]
     *  ``String``
     *  Text for button item tip (i18n).
     */
    buttonTip: "Toggle Automatic Layer Refresh",
    
    refresh: null,
    
    refreshInterval: 60000,
    
    /** api: method[addActions]
     */
    addActions: function() {
        var selectedLayer;
        var actions = gxp.plugins.AutoLayerRefreshButton.superclass.addActions.apply(this, [{
            tooltip: this.buttonTip,
            iconCls: "salamati-icon-refresh-layers",
            enableToggle: true,
            toggleHandler: function(button, state) {
                // start refresh
                var plugin = this;
                if(state === true) {
                    this.refresh = setTimeout(function(){plugin.refreshLayers();}, plugin.refreshInterval);
                } else {
                    clearTimeout(this.refresh);
                    this.refresh = null;
                }
                
            },
            scope: this
        }]);
        var buttonAction = actions[0];
        
        return actions;
    },
    
    refreshLayers: function() {
        var length = app.mapPanel.map.layers.length;

        for(var index = 0; index < length; index++) {
            var layer = app.mapPanel.map.layers[index];
            if(layer instanceof OpenLayers.Layer.WMS) {
                layer.redraw();
            }
        }
        var plugin = this;
        this.refresh = setTimeout(function(){plugin.refreshLayers();}, plugin.refreshInterval);
    }
        
});

Ext.preg(gxp.plugins.AutoLayerRefreshButton.prototype.ptype, gxp.plugins.AutoLayerRefreshButton);
