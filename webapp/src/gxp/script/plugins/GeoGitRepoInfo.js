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
    
    // These are used to find the specified node, you can search the treeRoot for a type attribute value equal to these strings
    repoRoot: "RepoRoot",
    
    branchRoot: "BranchRoot",
    
    localBranchRoot: "LocalBranchRoot",
    
    remoteBranchRoot: "RemoteBranchRoot",
    
    remoteRoot: "RemoteRoot",
    
    tagRoot: "TagRoot",

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
        
        var panel = new Ext.tree.TreePanel({
            root: this.treeRoot,
            rootVisible: false,
            border: false,
            autoScroll: true,
            selModel: new Ext.tree.MultiSelectionModel(),
            listeners: {
                contextmenu: function(node, event) {
                    //repoInfo.contextMenu.showAt(event.getXY());
                    //event.stopEvent();
                }
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        xtype: 'button',
                        text: plugin.Text_Merge,
                        handler: function() {
                            //console.log("panel", panel);
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
                    
                    var geoserverIndex = schema.url.indexOf('geoserver/');
                    var geoserverUrl = schema.url.substring(0, geoserverIndex + 10);
                    
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
            var geoserverIndex = layer.url.indexOf('geoserver/');
            var geoserverUrl = layer.url.substring(0, geoserverIndex + 10);
            OpenLayers.Request.GET({
                url: geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/branch?list=true&remotes=true&output_format=JSON',
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
                                plugin.addBranchNode(geoserverUrl, branchInfo.response.Local.Branch[index], localBranchNode);
                            }
                        } else {
                            plugin.addBranchNode(geoserverUrl, branchInfo.response.Local.Branch, localBranchNode);
                        }
                    }
                    if(branchInfo.response.Remote.Branch !== undefined) {
                        var length = branchInfo.response.Remote.Branch.length;
                        if(length !== undefined) {
                            for(var index = 0; index < length; index++) {
                                plugin.addBranchNode(geoserverUrl, branchInfo.response.Remote.Branch[index], remoteBranchNode);
                            }
                        } else {
                            plugin.addBranchNode(geoserverUrl, branchInfo.response.Remote.Branch, remoteBranchNode);
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
                url: geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/remote?list=true&output_format=JSON',
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
                url: geoserverUrl + 'geogit/' + plugin.workspace + ':' + plugin.dataStore + '/tag?list=true&output_format=JSON',
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
            expanded: true
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