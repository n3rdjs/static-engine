const { staticEngine } = require('../engine.js');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.log("npm [pattern analyzer] [input file]");
	process.exit('-1');
}

var source = fs.readFileSync(process.argv[2]).toString();
var engine_inst = new staticEngine(source);
var result = engine_inst.analyze();

engine_inst.traverse(result.ast, function (node, parent_node) {
    if (engine_inst.isFlowNode(node)){ //if ast node is included in cfg
        
    }
},result.ast);
