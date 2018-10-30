//Plugin Javascript
//This script uses parts of the default code generated from icore and also has parts of my own code.
//Most of the code was taken from tutorials in https://webgme.readthedocs.io/en/latest/interpreters/creating_the_interpreter.html
//https://github.com/webgme/webgme/wiki/Plugin-Step-by-Step-Tutorial
//In this file we generate two json scripts and store all the information related to the nodes in my composition.
//My first miniproject was on passive elcetrical circuit. For this project I have created an example of RLC circuit and used for writing a plugin for it.

//All JS bindings and dependencies.
define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function PassiveCircuits() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    PassiveCircuits.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    PassiveCircuits.prototype = Object.create(PluginBase.prototype);
    PassiveCircuits.prototype.constructor = PassiveCircuits;

    //Main function
    PassiveCircuits.prototype.main = function (callback) {

   var self = this,
      activeNode = this.activeNode,//activeNode
      core = this.core,//core with all dependencies
      logger = this.logger,//loggers for info and debug
      artifact, //artifact required for storing in blob
      blobClient = this.blobClient,
      //Required Json files one for model infor and other for meta information.
      CircuitmodelJson = {
           //name: '',
           //components: [],
           //connections: []
      },
      CircuitmetaJson = [];
        //Json for metadata


    //Function to get node info and metadata information.
    //This function when called looks for children and if any iterates through them and returns node info and meta data.
    //Most of the code got from https://webgme.readthedocs.io/en/latest/interpreters/creating_the_interpreter.html
   function getCircuit(nodes, node, traversal, metaData){
        var metaDataInfo = metaData;
        var childData = {
        };
        childData.name = core.getAttribute(node, 'name');
        if (traversal > 1)//if the traversal for the active Node is only 1, then does not enter here
        {
          childData.isMeta = core.isMetaNode(node);
          childData.metaType = core.getAttribute(core.getBaseType(node), 'name');

          var attributesName = core.getAttributeNames(node);
          var isConn = core.isConnection(node);//connection nodes
          var isMeta = core.isMetaNode(node);//Node is meta or not
          //Connection has two ends src and dst
          if (isConn)//if there is a connection and it is not meta node then find the src and dst
          {
            if(!isMeta){
              var sourceNodePath = self.core.getPointerPath(node, 'src');
              var destNodePath = self.core.getPointerPath(node, 'dst');
              childData.src = core.getAttribute(nodes[sourceNodePath], 'name');//source
              childData.dst = core.getAttribute(nodes[destNodePath], 'name');//destination
            }
          }

          for (var z=0; z < attributesName.length; z++)
          {
                childData[attributesName[z]] = core.getAttribute(node, attributesName[z]);
          }
        }

        if (core.isMetaNode(node)){
          var metaNodeInfo = {
          };
          metaNodeInfo.name = core.getAttribute(node, 'name');//node name
          metaNodeInfo.path = core.getPath(node);//node path
          metaNodeInfo.numChildren = core.getChildrenPaths(node).length;//number of children
          //Getting the base information if it exists.
          var BaseNode = core.getBase(node)
          if (BaseNode == null){
            metaNodeInfo.base = null;
          }
          else{
            metaNodeInfo.base = core.getAttribute(BaseNode, 'name');
          }
          //metaNodeInfo.base = core.getAttribute(core.getBase(node), 'name');
          metaDataInfo.push(metaNodeInfo);
        }

        //Getting children path information
        childData.children = {};
        var childNodePaths = core.getChildrenPaths(node);
        if (childNodePaths.length > 0){
          for (var x = 0; x < childNodePaths.length; x++){
            var childNode = nodes[childNodePaths[x]];
            //Get the relative id's
            var relid = core.getRelid(childNode);
            childData.children[relid] = getCircuit(nodes, childNode, traversal+1, metaData)[0];//Getting relative id at each traversal steps


            /*
            //Storing the json files as a blob this is not from iCore
              function getMoFileContent(){
                var moFile = 'model' + modelJson.name;
                modelJson.components.forEach(function(data){

                  moFile += '\n' + data.URI + ' ' + data.name + ';';

                });
                moFile += '\nequation';

                modelJson.connections.forEach(function(data){
                  moFile += '\n connect(' + data.src + ','+ data.dst+ ');';

                });

                  moFile += '\nend' + modelJson.name + ';';
                  logger.info(moFile);

                  return moFile;

              }
              */

          }
        }

       return [childData, metaDataInfo];//return the metadata and the children information
      }

    //Loads all the nodes and starting from the root node and returns mapping from paths to nodes
    //Here I have 2 jsons created one for circuit model and the other for circuit meta
    this.loadNodeMap(activeNode)
    .then(function (nodes) {
      //For every branch in the circuit iterate and get the childdata and the metadata
      [CircuitmodelJson, CircuitmetaJson] = getCircuit(nodes, activeNode, 1, []);//The childreninfo and the metadata returned for each node gets logged in json.

      //Convert JavaScript value to JSON format
      //Section of code taken as it is from the icore
      artifact = self.blobClient.createArtifact('MICArtifact');
      artifact.addFiles({
      //'hello.txt': 'Hello world!',
      //'dir/hello2.txt': 'Hello from folder!'
      'Circuitmeta.json': JSON.stringify(CircuitmetaJson, null, 0),//CircuitmodelJsonOut, //Circuittree.json for holding the tree info
      'Circuittree.json': JSON.stringify(CircuitmodelJson, null, 2),//CircuitmetaJsonOut//CircuitMeta.json for holding the Meta info.
            })
      .then(function (fileMetadataHashes) {
        self.logger.info('Added files to blob-storage', fileMetadataHashes);
        self.result.addArtifact(fileMetadataHashes[0]);
        self.result.addArtifact(fileMetadataHashes[1]);
        return artifact.save();
      })
      .then(function (artifactHash) {
        self.result.addArtifact(artifactHash);
        self.logger.info('Added complex artifact to blob-storage', artifactHash);
        self.result.setSuccess(true);
        callback(null, self.result);
      })
      .catch(function (err) {
        callback(err);
      });

    })
    .catch(function (err) {
      logger.error(err);
      callback(err);
    });
}
  return PassiveCircuits
});
