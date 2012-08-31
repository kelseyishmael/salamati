/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/ClickableFeatures.js
 * @requires widgets/FeatureEditPopup.js
 * @requires util.js
 * @requires OpenLayers/Control/DrawFeature.js
 * @requires OpenLayers/Handler/Point.js
 * @requires OpenLayers/Handler/Path.js
 * @requires OpenLayers/Handler/Polygon.js
 * @requires OpenLayers/Control/SelectFeature.js
 * @requires GeoExt/widgets/form.js
 * @requires plugins/FeatureEditor.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = FeatureEditorValidation
 */

/** api: (extends)
 *  plugins/ClickableFeatures.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: FeatureEditor(config)
 *
 *    Plugin for feature editing. Requires a
 *    :class:`gxp.plugins.FeatureManager`.
 */   
gxp.plugins.FeatureEditorValidation = Ext.extend(gxp.plugins.FeatureEditor, {
    
    /** api: ptype = gxp_featureeditor */
    ptype: "gxp_featureeditorvalidation",
    
    /** private: method[onsave]
     */
    onsave: null,
    
    constructor: function(config) {
        gxp.plugins.FeatureEditorValidation.superclass.constructor.apply(this, arguments);
    },
    
    init: function(target){
        gxp.plugins.FeatureEditorValidation.superclass.init.apply(this, arguments);
    },
    
    destroy: function() {
        gxp.plugins.FeatureEditorValidation.superclass.destroy.apply(this, arguments);
    },
    
    /** api: method[addActions]
     */
    addActions: function() {
        gxp.plugins.FeatureEditorValidation.superclass.addActions.call(this);
        
        var popup;
        var featureManager = this.getFeatureManager();
        var featureLayer = featureManager.featureLayer;
        
        featureLayer.events.remove("featureselected");
        
        var plugin = this;
        featureLayer.events.on({
            "featureselected": function(evt) {
                var feature = evt.feature;
                if (feature) {
                    plugin.fireEvent("featureeditable", plugin, feature, true);
                }
                var featureStore = featureManager.featureStore;
                if(plugin._forcePopupForNoGeometry === true || (plugin.selectControl.active && feature.geometry !== null)) {
                    // deactivate select control so no other features can be
                    // selected until the popup is closed
                    if (plugin.readOnly === false) {
                        plugin.selectControl.deactivate();
                        // deactivate will hide the layer, so show it again
                        featureManager.showLayer(plugin.id, plugin.showSelectedOnly && "selected");
                    }
                    popup = plugin.addOutput({
                        xtype: "gxp_featureeditpopup",
                        collapsible: true,
                        feature: featureStore.getByFeature(feature),
                        vertexRenderIntent: "vertex",
                        readOnly: plugin.readOnly,
                        fields: plugin.fields,
                        excludeFields: plugin.excludeFields,
                        editing: feature.state === OpenLayers.State.INSERT,
                        schema: plugin.schema,
                        allowDelete: true,
                        width: 200,
                        height: 250,
                        listeners: {
                            "close": function() {
                                if (plugin.readOnly === false) {
                                    plugin.selectControl.activate();
                                }
                                if(feature.layer && feature.layer.selectedFeatures.indexOf(feature) !== -1) {
                                    plugin.selectControl.unselect(feature);
                                }
                                if (feature === plugin.autoLoadedFeature) {
                                    if (feature.layer) {
                                        feature.layer.removeFeatures([evt.feature]);
                                    }
                                    plugin.autoLoadedFeature = null;
                                }
                            },
                            "featuremodified": function(popup, feature) {
                                popup.disable();
                                featureStore.on({
                                    write: {
                                        fn: function() {
                                            if (popup) {
                                                if (popup.isVisible()) {
                                                    popup.enable();
                                                }
                                                if (this.closeOnSave) {
                                                    popup.close();
                                                }
                                            }
                                            var layer = featureManager.layerRecord;
                                            plugin.target.fireEvent("featureedit", featureManager, {
                                                name: layer.get("name"),
                                                source: layer.get("source")
                                            });
                                        },
                                        single: true
                                    },
                                    exception: {
                                        fn: function(proxy, type, action, options, response, records) {
                                            var msg = plugin.exceptionText;
                                            if (type === "remote") {
                                                // response is service exception
                                                if (response.exceptionReport) {
                                                    msg = gxp.util.getOGCExceptionText(response.exceptionReport);
                                                }
                                            } else {
                                                // non-200 response from server
                                                msg = "Status: " + response.status;
                                            }
                                            // fire an event on the feature manager
                                            featureManager.fireEvent("exception", featureManager, 
                                                response.exceptionReport || {}, msg, records);
                                            // only show dialog if there is no listener registered
                                            if (featureManager.hasListener("exception") === false && 
                                                featureStore.hasListener("exception") === false) {
                                                    Ext.Msg.show({
                                                        title: plugin.exceptionTitle,
                                                        msg: msg,
                                                        icon: Ext.MessageBox.ERROR,
                                                        buttons: {ok: true}
                                                    });
                                            }
                                            if (popup && popup.isVisible()) {
                                                popup.enable();
                                                popup.startEditing();
                                            }
                                        },
                                        single: true
                                    },
                                    scope: plugin
                                });                                
                                if(feature.state === OpenLayers.State.DELETE) {                                    
                                    /**
                                     * If the feature state is delete, we need to
                                     * remove it from the store (so it is collected
                                     * in the store.removed list.  However, it should
                                     * not be removed from the layer.  Until
                                     * http://trac.geoext.org/ticket/141 is addressed
                                     * we need to stop the store from removing the
                                     * feature from the layer.
                                     */
                                    featureStore._removing = true; // TODO: remove after http://trac.geoext.org/ticket/141
                                    featureStore.remove(featureStore.getRecordFromFeature(feature));
                                    delete featureStore._removing; // TODO: remove after http://trac.geoext.org/ticket/141
                                }
                                featureStore.save();
                            },
                            "canceledit": function(popup, feature) {
                                featureStore.commitChanges();
                            },
                            "beforefeaturemodified": plugin.onsave,
                            scope: plugin
                        }
                    });
                    plugin.popup = popup;
                }
            }
        });
    }
    
});

Ext.preg(gxp.plugins.FeatureEditorValidation.prototype.ptype, gxp.plugins.FeatureEditorValidation);