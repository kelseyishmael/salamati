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
 *  .. class:: GeoGitHistoryButton(config)
 *
 *    Plugin that adds a context menu option to hide or show the geogit 
 *    history panel far a layer.
 */
gxp.plugins.GeoGitHistoryButton = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_geogithistorybutton */
    ptype: "gxp_geogithistorybutton",
    
    /** api: config[historyButtonText]
     *  ``String``
     *  Text for remove menu item (i18n).
     */
    historyButtonText: "Show/Hide History",

    /** api: config[historyButtonTip]
     *  ``String``
     *  Text for remove action tooltip (i18n).
     */
    //historyButtonTip: "Show or Hide this layer's GeoGit history",
    
    /** api: method[addActions]
     */
    addActions: function() {
        var selectedLayer;
        var actions = gxp.plugins.GeoGitHistoryButton.superclass.addActions.apply(this, [{
            menuText: this.historyButtonText,
            iconCls: "gxp-icon-removelayers",
            disabled: true,
            tooltip: this.historyButtonTip,
            handler: function() {
            	var southPanel = Ext.getCmp('southPanel');
            	if(southPanel.hidden) {
            		southPanel.show();
            		southPanel.expand();
            	} else {
            		southPanel.hide();
            	}
            	app.portal.doLayout();
            },
            scope: this
        }]);
        var historyButtonAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            selectedLayer = record;
            historyButtonAction.setDisabled(
                this.target.mapPanel.layers.getCount() <= 1 || !record
            );
        }, this);
        var enforceOne = function(store) {
        	historyButtonAction.setDisabled(
                !selectedLayer || store.getCount() <= 1
            );
        };
        this.target.mapPanel.layers.on({
            "add": enforceOne,
            "remove": enforceOne
        });
        
        return actions;
    }
        
});

Ext.preg(gxp.plugins.GeoGitHistoryButton.prototype.ptype, gxp.plugins.GeoGitHistoryButton);
