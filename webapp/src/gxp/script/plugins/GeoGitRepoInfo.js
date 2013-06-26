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
    Text_FinishViewing: "Please finish viewing and/or editing of features before you attempt to merge.",
    Text_Cancel: "Cancel",
    Text_Accept: "Accept",
    Text_CancelPopup: "Are you sure you want to cancel this merge?",
    Text_AcceptPopup: "Are you sure you want to complete this merge?",
    Text_MergeStartPopup: "Are you sure you want to start the merge process?",
    Text_Push: "Push",
    Text_Pull: "Pull",
    Text_RemoteAdd: "Add Remote",
    Text_RemoteRemove: "Remove Remote",
    Text_Fetch: "Fetch",
    Text_FetchAll: "Fetch All",
    Text_TransactionCancelFailed: "Couldn't cancel transaction.",
    Text_TransactionEndFailed: "Couldn't finish transaction.",
    Text_Updated: "updated",
    Text_Added: "added",
    Text_Removed: "removed",
    Text_Modified: "modified",
    Text_UpToDate: " is already up to date.",
    Text_RemoteInfo: "Remote Information",
    Text_URL: "URL",
    Text_Name: "Name",
    Text_URLBlank: "The path to the remote repository.",
    Text_NameBlank: "The name to give this remote.",
    Text_URLValidateFail: "Please provide a path to the remote repository.",
    Text_NameValidateFail: "Please provide a name to give the remote.",
    Text_NameVerification: "Are you sure you want to create a remote called ",
    Text_URLVerification: " from a repository at the location ",
    Text_RemoteExists: "A remote by that name already exists, please enter a different name.",
    Text_RemoteAddError: "There was an error creating this remote.",
    Text_RemoteRemoveVerification: "Are you sure you want to remove this remote from the repository?",
    Text_RemoteRemoveError: "There was an error removing this remote.",
    /* end i18n */
    
    treeRoot: null,
    
    featureManager: null,
    
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
    
    numConflicts: 0,

    constructor: function() {
        this.addEvents(
                /** api: event[conflictsDetected]
                 *  Fired when conflicts in a merge are found.
                 */
                "conflictsDetected",
                /** api: event[conflictsResolved]
                 *  Fired when all conflicts in a merge are resolved.
                 */
                "conflictResolved"
        );
        this.on({
            conflictsDetected: function(numConflicts) {
                this.numConflicts = numConflicts;
                this.acceptButton.disable();
            },
            conflictResolved: function() {
                this.numConflicts -= 1;
                if(this.numConflicts === 0) {
                    var plugin = this;
                    var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                    var repoNode = selectedNode.parentNode.parentNode.parentNode;
                    var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];
                    OpenLayers.Request.GET({
                        url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/commit?transactionId=' + transactionId + '&all=true&output_format=JSON',
                        success: function(results){
                            var commitInfo = Ext.decode(results.responseText);
                            console.log("commitInfo", commitInfo);
                            if(commitInfo.response.error || commitInfo.response.success === false) {
                                alert("Couldn't commit, reason: " + commitInfo.response.error);
                            } else {
                                Ext.Msg.show({
                                    title: plugin.Text_Merge,
                                    msg: "All conflicts have been resolved, please press the accept button to complete the merge.",
                                    buttons: Ext.Msg.OK,
                                    fn: function(button) {
                                        plugin.acceptButton.enable();
                                    },
                                    scope: plugin,
                                    icon: Ext.MessageBox.INFO
                                });    
                                
                            }
                        },
                        failure: plugin.errorFetching
                    }); 
                    
                }
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
            text: plugin.Text_Cancel,
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: plugin.Text_Cancel,
                    msg: plugin.Text_CancelPopup,
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];               
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?cancel=true&transactionId=' + transactionId + '&output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);                       
                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                        plugin.numConflicts = 0;
                                        plugin.originalBranch = null;
                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                        plugin.acceptButton.hide();
                                        cancelButton.hide();
                                        app.fireEvent("endMerge");
                                    } else {
                                        alert(plugin.Text_TransactionCancelFailed);
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
            text: plugin.Text_Accept,
            hidden: true,
            handler: function() {
                Ext.Msg.show({
                    title: plugin.Text_Accept,
                    msg: plugin.Text_AcceptPopup,
                    buttons: Ext.Msg.YESNO,
                    fn: function(button) {
                        if(button === "yes") {
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            var transactionId = gxp.GeoGitUtil.transactionIds[repoNode.attributes.repoId];
                            if(plugin.originalBranch) {
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/checkout?branch=' + plugin.originalBranch + '&transactionId=' + transactionId + '&output_format=JSON',
                                    success: function(results){
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                            success: function(results){
                                                var transactionInfo = Ext.decode(results.responseText);                       
                                                if(transactionInfo.response.Transaction.ID === undefined) {
                                                    gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                    plugin.originalBranch = null;
                                                    plugin.acceptButton.hide();
                                                    cancelButton.hide();
                                                    app.fireEvent("endMerge");
                                                } else {
                                                    alert(plugin.Text_TransactionEndFailed);
                                                }                       
                                            },
                                            failure: plugin.errorFetching
                                        });
                                    },
                                    failure: plugin.errorFetching
                                });
                            } else {
                                OpenLayers.Request.GET({
                                    url: plugin.geoserverUrl + 'geogit/' + repoNode.attributes.workspace + ':' + repoNode.attributes.dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                    success: function(results){
                                        var transactionInfo = Ext.decode(results.responseText);                       
                                        if(transactionInfo.response.Transaction.ID === undefined) {
                                            gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                            plugin.originalBranch = null;
                                            plugin.acceptButton.hide();
                                            cancelButton.hide();
                                            app.fireEvent("endMerge");
                                        } else {
                                            alert(plugin.Text_TransactionEndFailed);
                                        }                       
                                    },
                                    failure: plugin.errorFetching
                                });
                            }                           
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
                    if(!node.isSelected()) {
                        panel.getSelectionModel().select(node);
                    }
                  
                    if(node.attributes.type === plugin.remoteRoot) {
                        var repoNode = node.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            repoInfo.contextMenu.items.items[4].show();
                            repoInfo.contextMenu.items.items[5].show();
                            repoInfo.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    } else if(node.parentNode.attributes.type === plugin.remoteRoot) {  
                        var repoNode = node.parentNode.parentNode;
                        if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                            repoInfo.contextMenu.items.items[3].show();
                            repoInfo.contextMenu.items.items[6].show();
                            repoInfo.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    } else {
                        var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                        if(selectedNode) {
                            var repoNode = selectedNode.parentNode.parentNode.parentNode;
                            if(node.parentNode.attributes.type === plugin.localBranchRoot) {                                
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(selectedNode !== node) {
                                        if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {                                       
                                            repoInfo.contextMenu.items.items[0].show(); 
                                            repoInfo.contextMenu.showAt(event.getXY());
                                            event.stopEvent();
                                        }
                                    }
                                }
                            }
                            else if(node.parentNode.attributes.type === plugin.remoteBranchRoot) {
                                if(!gxp.GeoGitUtil.checkForTransaction(repoNode.attributes.repoId)) {
                                    if(repoNode.attributes.repoId === node.parentNode.parentNode.parentNode.attributes.repoId) {  
                                        repoInfo.contextMenu.items.items[1].show();
                                        repoInfo.contextMenu.items.items[2].show();
                                        repoInfo.contextMenu.showAt(event.getXY());
                                        event.stopEvent();
                                    }
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
                        text: plugin.Text_Merge,
                        iconCls: 'salamati-icon-merge',
                        hidden: true,
                        handler: function() {
                            if(app.tools.feature_editor.popup && !app.tools.feature_editor.popup.hidden) {
                                alert(plugin.Text_FinishViewing);
                                panel.contextMenu.hide();
                                return;
                            }
                            Ext.Msg.show({
                                title: plugin.Text_Merge,
                                msg: plugin.Text_MergeStartPopup,
                                buttons: Ext.Msg.YESNO,
                                fn: function(button) {
                                    if(button === "yes") {
                                        var selectedNode = plugin.treeRoot.findChild("selected", true, true);
                                        var node = panel.getSelectionModel().getSelectedNode();
                                        var repoNode = selectedNode.parentNode.parentNode.parentNode;
                                        var workspace = repoNode.attributes.workspace;
                                        var dataStore = repoNode.attributes.dataStore;
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                            success: function(results){
                                                var transactionInfo = Ext.decode(results.responseText);
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
                                                        app.fireEvent("beginMerge", dryRunStore, transactionId, selectedNode.text, node.text, true);
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
                    }, {
                        text: plugin.Text_Push,
                        hidden: true,
                        handler: function() {
                            var node = panel.getSelectionModel().getSelectedNode();
                            var repoNode = node.parentNode.parentNode.parentNode;
                            var workspace = repoNode.attributes.workspace;
                            var dataStore = repoNode.attributes.dataStore;
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                            var refSpec = selectedNode.text + ':' + node.text.substring(0,node.text.indexOf(" ("));
                            console.log("refspec", refSpec);
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);
                                    var transactionId = transactionInfo.response.Transaction.ID;
                                    gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                    OpenLayers.Request.GET({
                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/push?ref=' + refSpec + '&remoteName=' + node.attributes.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                                        success: function(results) {
                                            var pushInfo = Ext.decode(results.responseText);
                                            var msg = "";
                                            if(pushInfo.response.error) {
                                                msg = pushInfo.response.error;
                                            } else {
                                                msg = "Push Completed.";
                                            }
                                            Ext.Msg.show({
                                                title: plugin.Text_Push,
                                                msg: msg,
                                                buttons: Ext.Msg.OK,
                                                fn: function(button) {
                                                    OpenLayers.Request.GET({
                                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                        success: function(results){
                                                            var transactionInfo = Ext.decode(results.responseText);                       
                                                            if(transactionInfo.response.Transaction.ID === undefined) {
                                                                gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                            } else {
                                                                alert(plugin.Text_TransactionEndFailed);
                                                            }                       
                                                        },
                                                        failure: plugin.errorFetching
                                                    });
                                                },
                                                scope: plugin,
                                                icon: Ext.MessageBox.INFO
                                            });                                            
                                        },
                                        failure: plugin.errorFetching
                                    });                                   
                                },
                                failure: plugin.errorFetching
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_Pull,
                        hidden: true,
                        handler: function() {                           
                            var node = panel.getSelectionModel().getSelectedNode();
                            var repoNode = node.parentNode.parentNode.parentNode;
                            var workspace = repoNode.attributes.workspace;
                            var dataStore = repoNode.attributes.dataStore;
                            var selectedNode = plugin.treeRoot.findChild("selected", true, true); 
                            var refSpec = node.text.substring(0,node.text.indexOf(" (")) + ':' + selectedNode.text;
                            console.log("refspec", refSpec);
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);
                                    var transactionId = transactionInfo.response.Transaction.ID;
                                    gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                    OpenLayers.Request.GET({
                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/pull?ref=' + refSpec + '&remoteName=' + node.attributes.remoteName + '&transactionId=' + transactionId + '&output_format=JSON',
                                        success: function(results) {
                                            var pullInfo = Ext.decode(results.responseText);
                                            var msg = "";
                                            var conflicts = false;
                                            var testStore = null;
                                            if(pullInfo.response.error) {
                                                msg = pullInfo.response.error;
                                            } else if(pullInfo.response.Pull !== undefined && pullInfo.response.Pull.Ref !== undefined) {
                                                msg = pullInfo.response.Pull.Ref + " " + plugin.Text_Updated + ": " + pullInfo.response.Pull.Added + " " + plugin.Text_Added + ", " + pullInfo.response.Pull.Removed + " " + plugin.Text_Removed + " , " + pullInfo.response.Pull.Modified + " " + plugin.Text_Modified + ".";
                                            } else if(pullInfo.response.Merge !== undefined && pullInfo.response.Merge.conflicts !== undefined) {
                                                testStore = new Ext.data.Store({
                                                    url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/',
                                                    reader: gxp.GeoGitUtil.mergeReader,
                                                    autoLoad: false
                                                });
                                                testStore.loadData(pullInfo);                                             
                                                console.log("testStore", testStore);                                                
                                                msg = "This pull has resulted in merge conflicts, you will be able to complete this pull as you would a merge.";
                                                conflicts = true;
                                            } else {
                                                msg = selectedNode.text + plugin.Text_UpToDate;
                                            }

                                            Ext.Msg.show({
                                                title: plugin.Text_Pull,
                                                msg: msg,
                                                buttons: Ext.Msg.OK,
                                                fn: function(button) {
                                                    if(!conflicts) {
                                                        OpenLayers.Request.GET({
                                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                            success: function(results){
                                                                var transactionInfo = Ext.decode(results.responseText);                       
                                                                if(transactionInfo.response.Transaction.ID === undefined) {
                                                                    gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                                } else {
                                                                    alert(plugin.Text_TransactionEndFailed);
                                                                }                       
                                                            },
                                                            failure: plugin.errorFetching
                                                        });
                                                    } else {
                                                        plugin.acceptButton.enable();
                                                        plugin.acceptButton.show();
                                                        cancelButton.show();
                                                        app.fireEvent("beginMerge", testStore, transactionId, selectedNode.text, node.text, false);
                                                    }
                                                },
                                                scope: plugin,
                                                icon: Ext.MessageBox.INFO
                                            });                                                                                    
                                        },
                                        failure: plugin.errorFetching
                                    });                                   
                                },
                                failure: plugin.errorFetching
                            });
                            
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_Fetch,
                        hidden: true,
                        handler: function() {
                            var node = panel.getSelectionModel().getSelectedNode();
                            var repoNode = node.parentNode.parentNode;
                            var workspace = repoNode.attributes.workspace;
                            var dataStore = repoNode.attributes.dataStore;
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);
                                    var transactionId = transactionInfo.response.Transaction.ID;
                                    gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                    OpenLayers.Request.GET({
                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/fetch?prune=true&remote=' + node.text + '&transactionId=' + transactionId + '&output_format=JSON',
                                        success: function(results) {
                                            var fetchInfo = Ext.decode(results.responseText);

                                            OpenLayers.Request.GET({
                                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                success: function(results){
                                                    var transactionInfo = Ext.decode(results.responseText);                       
                                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                        if(fetchInfo.response.Fetch.Remote && fetchInfo.response.Fetch.Remote.Branch) {                                                
                                                            repoNode.remove(true);
                                                            plugin.addRepo(repoNode.attributes.repoId, plugin.geoserverUrl, workspace, dataStore);
                                                        }
                                                    } else {
                                                        alert(plugin.Text_TransactionEndFailed);
                                                    }                       
                                                },
                                                failure: plugin.errorFetching
                                            });                                           
                                        },
                                        failure: plugin.errorFetching
                                    });                                   
                                },
                                failure: plugin.errorFetching
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_FetchAll,
                        hidden: true,
                        handler: function() {
                            var node = panel.getSelectionModel().getSelectedNode();
                            var repoNode = node.parentNode;
                            var workspace = repoNode.attributes.workspace;
                            var dataStore = repoNode.attributes.dataStore;
                            OpenLayers.Request.GET({
                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/beginTransaction?output_format=JSON',
                                success: function(results){
                                    var transactionInfo = Ext.decode(results.responseText);
                                    var transactionId = transactionInfo.response.Transaction.ID;
                                    gxp.GeoGitUtil.addTransactionId(transactionId, repoNode.attributes.repoId);
                                    OpenLayers.Request.GET({
                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/fetch?all=true&prune=true&transactionId=' + transactionId + '&output_format=JSON',
                                        success: function(results) {
                                            var fetchInfo = Ext.decode(results.responseText);

                                            OpenLayers.Request.GET({
                                                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/endTransaction?transactionId=' + transactionId + '&output_format=JSON',
                                                success: function(results){
                                                    var transactionInfo = Ext.decode(results.responseText);                       
                                                    if(transactionInfo.response.Transaction.ID === undefined) {
                                                        gxp.GeoGitUtil.addTransactionId(null, repoNode.attributes.repoId);
                                                        if(fetchInfo.response.Fetch.Remote && fetchInfo.response.Fetch.Remote.Branch) {                                                
                                                            repoNode.remove(true);
                                                            plugin.addRepo(repoNode.attributes.repoId, plugin.geoserverUrl, workspace, dataStore);
                                                        }
                                                    } else {
                                                        alert(plugin.Text_TransactionEndFailed);
                                                    }                       
                                                },
                                                failure: plugin.errorFetching
                                            });                                           
                                        },
                                        failure: plugin.errorFetching
                                    });                                   
                                },
                                failure: plugin.errorFetching
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_RemoteAdd,
                        hidden: true,
                        handler: function() {
                            var window = new Ext.Window({
                                closable: true,
                                modal: true,
                                draggable: false,
                                resizable: false,
                                hidden: false,
                                height: 200,
                                width: 500,
                                title: plugin.Text_RemoteInfo,
                                layout: "absolute",
                                items: [{
                                    xtype: 'textfield',
                                    allowBlank: false,
                                    height: 30,
                                    anchor: '90%',
                                    x: 50,
                                    y: 30,
                                    emptyText: plugin.Text_URL,
                                    minLength: 1,
                                    blankText: plugin.Text_URLBlank
                                },{
                                    xtype: 'textfield',
                                    allowBlank: false,
                                    x: 50,
                                    y: 70,
                                    height: 30,
                                    anchor: '90%',
                                    emptyText: plugin.Text_Name,
                                    minLength: 1,
                                    blankText: plugin.Text_NameBlank
                                },{
                                    xtype: 'button',
                                    text: plugin.Text_RemoteAdd,
                                    y: 130,
                                    x: 25,
                                    height: 30,
                                    anchor: '95%',
                                    handler: function(){
                                        if(!window.items.items[0].validate()) {
                                            alert(plugin.Text_URLValidateFail);
                                            return;
                                        } else if (!window.items.items[1].validate()) {
                                            alert(plugin.Text_NameValidateFail);
                                            return;
                                        }
                                        var name = window.items.items[1].getValue();
                                        var path = window.items.items[0].getValue();
                                        Ext.Msg.show({
                                            title: plugin.Text_RemoteAdd,
                                            msg: plugin.Text_NameVerification + name + plugin.Text_URLVerification + path + "?",
                                            buttons: Ext.Msg.YESNO,
                                            fn: function(button) {
                                                if(button === "yes") {
                                                    var remoteNode = panel.getSelectionModel().getSelectedNode();
                                                    var repoNode = remoteNode.parentNode;
                                                    var workspace = repoNode.attributes.workspace;
                                                    var dataStore = repoNode.attributes.dataStore;
                                                    OpenLayers.Request.GET({
                                                        url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?remoteName=' + name + '&remoteURL=' + path + '&output_format=JSON',
                                                        success: function(results){
                                                            var remoteInfo = Ext.decode(results.responseText);                                                           
                                                            if(remoteInfo.response.name) {
                                                                remoteNode.appendChild(new Ext.tree.TreeNode({
                                                                    text: remoteInfo.response.name
                                                                }));
                                                                window.close();
                                                            } else {
                                                                var msg = "";
                                                                if(remoteInfo.response.error === "REMOTE_ALREADY_EXISTS") {
                                                                    msg = plugin.Text_RemoteExists;
                                                                } else {
                                                                    msg = plugin.Text_RemoteAddError;
                                                                    console.log("error", remoteInfo.response.error);
                                                                }
                                                                Ext.Msg.show({
                                                                    title: plugin.Text_RemoteAdd,
                                                                    msg: msg,
                                                                    buttons: Ext.Msg.OK,
                                                                    fn: function(button) {
                                                                        return;
                                                                    },
                                                                    scope: plugin,
                                                                    icon: Ext.MessageBox.WARNING
                                                                });
                                                            }
                                                        },
                                                        failure: plugin.errorFetching
                                                    });                                                    
                                                }
                                            },
                                            scope: plugin,
                                            icon: Ext.MessageBox.QUESTION,
                                            animEl: this.ownerCt.getEl()
                                        });                                        
                                    }
                                }]
                            });
                            panel.contextMenu.hide();
                        }
                    }, {
                        text: plugin.Text_RemoteRemove,
                        hidden: true,
                        handler: function() {
                            Ext.Msg.show({
                                title: plugin.Text_RemoteRemove,
                                msg: plugin.Text_RemoteRemoveVerification,
                                buttons: Ext.Msg.YESNO,
                                fn: function(button) {
                                    if(button === "yes") {
                                        var remoteNode = panel.getSelectionModel().getSelectedNode();
                                        var name = remoteNode.text;
                                        var repoNode = remoteNode.parentNode.parentNode;
                                        var workspace = repoNode.attributes.workspace;
                                        var dataStore = repoNode.attributes.dataStore;
                                        OpenLayers.Request.GET({
                                            url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?remoteName=' + name + '&remove=true&output_format=JSON',
                                            success: function(results){
                                                var remoteInfo = Ext.decode(results.responseText);                                                           
                                                if(remoteInfo.response.name) {
                                                    remoteNode.remove(true);
                                                } else {
                                                    var msg = plugin.Text_RemoteRemoveError;
                                                    console.log("error", remoteInfo.response.error);
                                                    Ext.Msg.show({
                                                        title: plugin.Text_RemoteRemove,
                                                        msg: msg,
                                                        buttons: Ext.Msg.OK,
                                                        fn: function(button) {
                                                            return;
                                                        },
                                                        scope: plugin,
                                                        icon: Ext.MessageBox.WARNING
                                                    });
                                                }
                                            },
                                            failure: plugin.errorFetching
                                        });      
                                    }
                                },
                                scope: plugin,
                                icon: Ext.MessageBox.QUESTION
                            });
                            panel.contextMenu.hide();
                        }
                    }
                ], 
                listeners: {
                    beforehide: function(menu) {
                        var length = menu.items.length;
                        for(var index = 0; index < length; index++) {
                            menu.items.items[index].hide();
                        }
                    }
                }
            })
        });

        config = Ext.apply(panel, config || {});

        var repoInfo = gxp.plugins.GeoGitRepoInfo.superclass.addOutput.call(this, config);
        
        var onLayerChange = function(tool, layerRecord, schema) {
            if(schema && schema.url){
                var typeName = schema.reader.raw.featureTypes[0].typeName;
                var workspace = schema.reader.raw.targetPrefix;
                
                if(layerRecord && layerRecord.data && layerRecord.data.layer){
                    var key = workspace + ':' + typeName;
                    
                    //isGeogit
                    var callback = function(layer){
                        if(layer !== false) {
                            var geoserverIndex = layer.url.indexOf('geoserver/');
                            plugin.addRepo(layer.metadata.repoId, layer.url.substring(0, geoserverIndex + 10), workspace, layer.metadata.geogitStore);
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
    
    addRepo: function(repoId, url, workspace, dataStore) {
        var node = this.treeRoot.findChild("repoId", repoId, true);
        if(node === null) {
            node = this.treeRoot.findChild("type", this.repoRoot);
            var repoName = repoId.substring(repoId.lastIndexOf('/' || '\\') + 1, repoId.length);
            var repoNode = node.appendChild(new Ext.tree.TreeNode({
                text: repoName,
                expanded: true,
                repoId: repoId,
                workspace: workspace,
                dataStore: dataStore
            }));
            
            var branchNode = repoNode.appendChild(new Ext.tree.TreeNode({
                text: this.Text_Branches,
                expanded: true,
                type: this.branchRoot
            }));
            
            var plugin = this;
            if(plugin.geoserverUrl === null) {
                plugin.geoserverUrl = url;
            }
            OpenLayers.Request.GET({
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/branch?list=true&remotes=true&output_format=JSON',
                success: function(results){
                    var branchInfo = Ext.decode(results.responseText);
                    var localBranchNode = branchNode.appendChild(new Ext.tree.TreeNode({
                        text: plugin.Text_Local,
                        expanded: true,
                        type: plugin.localBranchRoot
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
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch[index], localBranchNode, workspace, dataStore);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Local.Branch, localBranchNode, workspace, dataStore);
                        }
                    }
                    if(branchInfo.response.Remote.Branch !== undefined) {
                        var length = branchInfo.response.Remote.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch[index], remoteBranchNode, workspace, dataStore);
                            }
                        } else {
                            plugin.addBranchNode(plugin.geoserverUrl, branchInfo.response.Remote.Branch, remoteBranchNode, workspace, dataStore);
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
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/remote?list=true&output_format=JSON',
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
                url: plugin.geoserverUrl + 'geogit/' + workspace + ':' + dataStore + '/tag?list=true&output_format=JSON',
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
    
    addBranchNode: function(url, branchInfo, parentNode, workspace, dataStore) {
        var name = branchInfo.name;
        if(name === "HEAD") {
            return;
        }
        var plugin = this;
        var path = "";
        if(parentNode.attributes.type === this.remoteBranchRoot) {
            path = "refs/remotes/" + branchInfo.remoteName + "/";
            name += " (" + branchInfo.remoteName + ")";
        }
        path += branchInfo.name;      
        
        var branchNode = parentNode.appendChild(new Ext.tree.TreeNode({
            text: name,
            // boolean to determine which branch is 'checked out' for use with merge
            selected: parentNode.attributes.type === this.remoteBranchRoot ? undefined : false,
            remoteName: parentNode.attributes.type === this.remoteBranchRoot ? branchInfo.remoteName : undefined      
        }));
        
        OpenLayers.Request.GET({
            url: url + 'geogit/' + workspace + ':' + dataStore + '/ls-tree?path=' + path + '&output_format=JSON',
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