/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @require GeoExt/widgets/Action.js
 */

/** api: (define)
 *  module = salamati.plugins
 *  class = Tools
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.ns("salamati.plugins");

/** api: constructor
 *  .. class:: Tools(config)
 *
 *    Provides actions for box zooming, zooming in and zooming out.
 */
salamati.plugins.Tools = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_zoom */
    ptype: "salamati_tools",

    /** api: config[toolWindowMenuText]
     *  ``String``
     *  Text for tool window menu item (i18n).
     */
    toolWindowMenuText: "More Tools",

    /** api: config[searchWindowMenuText]
     *  ``String``
     *  Text for nominatim search menu item (i18n).
     */
    searchWindowMenuText: "Search",

    /** api: config[zoomInTooltip]
     *  ``String``
     *  Text for zoom in action tooltip (i18n).
     */
    toolWindowTooltip: "More Tools",

    /** api: config[zoomOutTooltip]
     *  ``String``
     *  Text for zoom out action tooltip (i18n).
     */
    searchWindowTooltip: "Search",
    
    /** api: config[toggleGroup]
     *  ``String`` Toggle group for this plugin's Zoom action.
     */
    
    /** api: config[showZoomBoxAction]
     * {Boolean} If true, the tool will have a Zoom Box button as first action.
     * The zoom box will be provided by an OpenLayers.Control.ZoomBox, and
     * :obj:`controlOptions` configured for this tool will apply to the ZoomBox
     * control.
     * If set to false, only Zoom In and Zoom Out buttons will be created.
     * Default is false.
     */

    /** private: method[constructor]
     */
    constructor: function(config) {
        salamati.plugins.Tools.superclass.constructor.apply(this, arguments);
    },

    /** api: method[addActions]
     */
    addActions: function() {
        var actions = [{
            menuText: this.toolWindowMenuText,
            iconCls: "salamati-icon-tools",
            tooltip: this.toolWindowTooltip,
            handler: function() {
                if(win.hidden){
                	win.show();
                }else{
                	win.hide();
                }
            },
            scope: this
        }, {
            menuText: this.searchWindowMenuText,
            iconCls: "salamati-icon-search",
            tooltip: this.searchWindowTooltip,
            handler: function() {
                if(searchWindow.hidden){
                	searchWindow.show();
                }else{
                	searchWindow.hide();
                }
            },
            scope: this
        }];
        
        return salamati.plugins.Tools.superclass.addActions.apply(this, [actions]);
    }
        
});

Ext.preg(salamati.plugins.Tools.prototype.ptype, salamati.plugins.Tools);