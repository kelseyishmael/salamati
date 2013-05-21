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
 *  class = GeoGitRepoInfo
 */

/** api: (extends)
 *  plugins/Tool.js
 */

Ext.ns("gxp.plugins");

gxp.plugins.GeoGitRepoInfo = Ext.extend(gxp.plugins.Tool, {
    ptype: "gxp_geogitrepoinfo",
    
    /* i18n */
    Text_Info: "Info",
    Text_Repos: "Repos",
    Text_Branches: "Branches",
    Text_Local: "Local",
    Text_Remote: "Remote",
    Text_Remotes: "Remotes",
    Text_Tags: "Tags",
    Text_Merge: "Merge",
    /* end i18n */
    
    treeRoot: null,
    
    featureManager: null,
    
    workspace: null,
    
    dataStore: null,
    
    geoserverUrl: null,
    
    // These are used to find the specified node, you can search the treeRoot for a type attribute value equal to these strings
    repoRoot: "RepoRoot",
    
    branchRoot: "BranchRoot",
    
    localBranchRoot: "LocalBranchRoot",
    
    remoteBranchRoot: "RemoteBranchRoot",
    
    remoteRoot: "RemoteRoot",
    
    tagRoot: "TagRoot",
    
    acceptButton: null,
    
    originalBranch: null,

    constructor: function() {
        this.addEvents(
                /** api: event[conflictsDetected]
                 *  Fired when conflicts in a merge are found.
                 */
                "conflictsDetected",
                /** api: event[conflictsResolved]
                 *  Fired when all conflicts in a merge are resolved.
                 */
                "conflictsResolved"
        );
        this.on({
            conflictsDetected: function() {
                this.acceptButton.disable();
            },
            conflictsResolved: function() {
                this.acceptButton.enable();
            },
            scope: this
        });
        gxp.plugins.GeoGitRepoInfo.superclass.constructor.apply(this, arguments);
    },

    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];

        this.treeRoot = new Ext.tree.TreeNode({
            text: this.Text_Info,
            expanded: true,
            isTarget: false,
            allowDrop: false
        });
        var repoNode = this.treeRoot.appendChild(new Ext.tree.TreeNode({
            text: this.Text_Repos,
            expanded: true,
            type: this.repoRoot
        }));
        
        var plugin = this;
        
        var cancelButton = new Ext.Button({
            text: "Cancel",
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: "Cancel",
                    msg: "Are you sure you want to cancel this merge?",
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var localBranchNode = selectedNode.parentNode;
                            var repoNode = localBranchNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];               
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + localBranchNode.attributes.workspace + ':' + localBranchNode.attributes.dataStore + '/endTransaction?cancel=true&transactionId=' + transactionId + '&output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);                       
                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                        plugin.acceptButton.hide();
                                        cancelButton.hide();
                                        app.fireEvent("endMerge");
                                    } else {
                                        alert("Couldn't cancel transaction.");
                                    }                       
                                },
                                failure: plugin.errorFetching
                            });
                        }
                    },
                    scope: this,
                    icon: Ext.MessageBox.QUESTION,
                    animEl: this.ownerCt.getEl()
                });
            }
        });
        
        this.acceptButton = new Ext.Button({
            text: "Accept",
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: "Accept",
                    msg: "Are you sure you want to complete this merge?",
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var localBranchNode = selectedNode.parentNode;
                            var repoNode = localBranchNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + localBranchNode.attributes.workspace + ':' + localBranchNode.attributes.dataStore + '/checkout?branch=' + plugin.originalBranch + '&transactionId=' + transactionId + '&output_format=JSON',
                                success: function(results){
                                    OpenLayers.Request.GET({
                                        url: plugin.geoserverUrl + 'geogit/' + localBranchNode.attributes.workspace + ':' + localBranchNode.attributes.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                        success: function(results){
                                            var transactionInfo = Ext.decode(results.responseText);                       
                                            if(transactionInfo.response.Transaction.ID === undefined) {
                                                gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                plugin.acceptButton.hide();
                                                cancelButton.hide();
                                                app.fireEvent("endMerge");
                                            } else {
                                                alert("Couldn't finish transaction.");
                                            }                       
                                        },
                                        failure: plugin.errorFetching
                                    });
                                },
                                failure: plugin.errorFetching
                            });
                            
                        }
                    },
                    scope: this,
                    icon: Ext.MessageBox.QUESTION,
                    animEl: this.ownerCt.getEl()
                });
            }
        });
        
        var panel = new Ext.tree.TreePanel({
            root: this.treeRoot,
            rootVisible: false,
            border: false,
            autoScroll: true,
            tbar: [this.acceptButton, cancelButton],
            listeners: {
                contextmenu: function(node, event) {
                    if(node.attributes.selected !== undefined) {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                        
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                if(selectedNode !== node) {
                                    if(!node.isSelected()) {
                                        panel.getSelectionModel().select(node);
                                    }
                                    repoInfo.contextMenu.showAt(event.getXY());
                                    event.stopEvent();
                                }
                            }
                        }
                    }
                },
                beforedblclick: function(node, event) {                  
                    if(node.attributes.selected !== undefined) {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                return false; 
                            }
                            selectedNode.attributes.selected = false;
                            selectedNode.setCls('');
                            if(selectedNode.text === node.text) {
                                return false;
                            }
                        }
                        
                        node.attributes.selected = true;
                        node.setCls('gxp-selected-branch-cls');
                        return false;
                    }
                }
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        xtype: 'button',
                        text: plugin.Text_Merge,
                        handler: function() {
                            if(app.tools.feature_editor.popup && !app.tools.feature_editor.popup.hidden) {
                                alert("Please finish viewing and/or editing of features before you attempt to merge.");
                                panel.contextMenu.hide();
                                return;
                            }
                            Ext.Msg.show({
                                title: "Merge",
                                msg: "Are you sure you want to start the merge process?",
                                buttons: Ext.Msg.YESNO,
                                fn: function(button) {
                                    if(button === "yes") {
                                        var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                                        var node = panel.getSelectionModel().getSelectedNode();
                                        var localBranchNode = selectedNode.parentNode;
                                        var workspace = localBranchNode.attributes.workspace;
                                        var dataStore = localBranchNode.attributes.dataStore;
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                            success: function(results){
                                                var transactionInfo = Ext.decode(results.responseText);
                                                var repoNode = localBranchNode.parentNode.parentNode;
                                                var transactionId = transactionInfo.response.Transaction.ID;
                                                gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                                OpenLayers.Request.GET({
                                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/checkout?branch=' + selectedNode.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                                    success: function(results) {
                                                        var checkoutInfo = Ext.decode(results.responseText);        
                                                        plugin.originalBranch = checkoutInfo.response.OldTarget;
                                                        plugin.acceptButton.enable();
                                                        plugin.acceptButton.show();
                                                        cancelButton.show();
                                                        
                                                        var dryRunStore = new Ext.data.Store({
                                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/merge?commit=' + node.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                                            reader: gxp.GeoGitUtil.mergeReader,
                                                            autoLoad: false
                                                        });
                                                        console.log("mergestore", dryRunStore);
                                                        app.fireEvent("beginMerge", dryRunStore, transactionId, selectedNode.text, node.text);
                                                    },
                                                    failure: plugin.errorFetching
                                                });                                   
                                            },
                                            failure: plugin.errorFetching
                                        });
                                    }
                                },
                                scope: this,
                                icon: Ext.MessageBox.QUESTION,
                                animEl: this.ownerCt.getEl()
                            });
                                                        
                            panel.contextMenu.hide();
                        }
                    }
                ]
            })
        });

        config = Ext.apply(panel, config || {});

        var repoInfo = gxp.plugins.GeoGitRepoInfo.superclass.addOutput.call(this, config);

        var plugin = this;
        
        var onLayerChange = function(tool, layerRecord, schema) {
            if(schema && schema.url){
                var typeName = schema.reader.raw.featureTypes[0].typeName;
                var workspace = schema.reader.raw.targetPrefix;
                
                if(layerRecord && layerRecord.data && layerRecord.data.layer){
                    var key = workspace + ':' + typeName;
                    
                    //isGeogit
                    var callback = function(layer){
                        if(layer !== false) {
                            plugin.workspace = workspace;
                            plugin.dataStore = layer.metadata.geogitStore;
                            plugin.addRepo(layer);
                        }
                    };
                    
                    gxp.GeoGitUtil.isGeoGitLayer(layerRecord.data.layer, callback);
                }
            }
        };

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        } 
        featureManager.on("layerchange", onLayerChange, this);
        
        return repoInfo;
    },
    
    addRepo: function(layer) {
        var node = this.treeRoot.findChild("repoId", layer.metadata.repoId, true);
        if(node === null) {
            node = this.treeRoot.findChild("type", this.repoRoot);
            var repoName = layer.metadata.repoId.substring(layer.metadata.repoId.lastIndexOf('/' || '\\') + 1, layer.metadata.repoId.length);
            var repoNode = node.appendChild(new Ext.tree.TreeNode({
                text: repoName,
                expanded: true,
                repoId: layer.metadata.repoId
            }));
            
            var branchNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Branches,
                expanded: true,
                type: this.branchRoot
            }));
            
            var plugin = this;
            if(plugin.geoserverUrl === null) {
                var geoserverIndex = layer.url.indexOf('geoserver/');
                plugin.geoserverUrl = layer.url.substring(0, geoserverIndex + 10);
            }
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/branch?list=true&remotes=true&output_format=JSON',
                success: function(results){
                    var branchInfo = Ext.decode(results.responseText);
                    var localBranchNode = branchNode.appendChild(new Ext.tree.TreeNode({
                        text: plugin.Text_Local,
                        expanded: true,
                        type: plugin.localBranchRoot,
                        workspace: plugin.workspace,
                        dataStore: plugin.dataStore
                    }));
                    var remoteBranchNode = branchNode.appendChild(new Ext.tree.TreeNode({
                        text: plugin.Text_Remote,
                        expanded: true,
                        type: plugin.remoteBranchRoot
                    }));
                    
                    if(branchInfo.response.Local.Branch !== undefined) {
                        var length = branchInfo.response.Local.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch[index], localBranchNode);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch, localBranchNode);
                        }
                    }
                    if(branchInfo.response.Remote.Branch !== undefined) {
                        var length = branchInfo.response.Remote.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch[index], remoteBranchNode);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch, remoteBranchNode);
                        }
                    }
                },
                failure: plugin.errorFetching
            });
            
            var remoteNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Remotes,
                expanded: true,
                type: this.remoteRoot
            }));
            
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/remote?list=true&output_format=JSON',
                success: function(results){
                    var remoteInfo = Ext.decode(results.responseText);
                    if(remoteInfo.response.Remote !== undefined) {
                        var length = remoteInfo.response.Remote.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                remoteNode.appendChild(new Ext.tree.TreeNode({
                                    text: remoteInfo.response.Remote[index].name
                                }));
                            }
                        } else {
                            remoteNode.appendChild(new Ext.tree.TreeNode({
                                text: remoteInfo.response.Remote.name
                            }));
                        }
                    }
                },
                failure: plugin.errorFetching
            });
            
            var tagNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Tags,
                expanded: true,
                type: this.tagRoot
            }));
            
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/tag?list=true&output_format=JSON',
                success: function(results){
                    var tagInfo = Ext.decode(results.responseText);
                    if(tagInfo.response.Tag !== undefined) {
                        var length = tagInfo.response.Tag.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                tagNode.appendChild(new Ext.tree.TreeNode({
                                    text: tagInfo.response.Tag[index].name
                                }));
                            }
                        } else {
                            tagNode.appendChild(new Ext.tree.TreeNode({
                                text: tagInfo.response.Tag.name
                            }));
                        }
                    }
                },
                failure: plugin.errorFetching
            });
        }
    },
    
    addBranchNode: function(url, branchInfo, parentNode) {
        var name = branchInfo.name;
        var plugin = this;
        var path = "";
        if(parentNode.attributes.type === this.remoteBranchRoot) {
            path = "refs/remotes/" + branchInfo.remoteName + "/";
            name += " (" + branchInfo.remoteName + ")";
        }
        path += branchInfo.name;      
        
        var branchNode = parentNode.appendChild(new Ext.tree.TreeNode({
            text: name,
            expanded: true,
            // boolean to determine which branch is 'checked out' for use with merge
            selected: parentNode.attributes.type === this.remoteBranchRoot ? undefined : false
        }));
        
        OpenLayers.Request.GET({
            url: url + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/ls-tree?path=' + path + '&output_format=JSON',
            success: function(results){
                var featureTypeInfo = Ext.decode(results.responseText);
                var length = featureTypeInfo.response.node.length;
                if(length !== undefined) {
                    for(var index = 0; index < length; index++) {
                        branchNode.appendChild(new Ext.tree.TreeNode({
                            text: featureTypeInfo.response.node[index].path
                        }));
                    }
                } else {
                    branchNode.appendChild(new Ext.tree.TreeNode({
                        text: featureTypeInfo.response.node.path
                    }));
                }
            },
            failure: plugin.errorFetching
        });
    },
    
    errorFetching: function(){
        throw "GeoGitRepoInfo: Error fetching info";
    }
    
});



Ext.preg(gxp.plugins.GeoGitRepoInfo.prototype.ptype, gxp.plugins.GeoGitRepoInfo);