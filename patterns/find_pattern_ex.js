const { staticEngine } = require('../engine.js');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.log("node [pattern analyzer] [input file]");
	process.exit('-1');
}

var source = fs.readFileSync(process.argv[2]).toString();
var engine_inst = new staticEngine(source);
var result = engine_inst.analyze();

var statement1=[];
var statement2=[];
engine_inst.traverse(result.ast, function (node, parent_node) {

    if(node.type=='ExpressionStatement'){
        if(Object.keys(node).includes('expression')){
            if(node.expression.type=='AssignmentExpression'){
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='Identifier' && node.expression.right.type=='MemberExpression'){                        
                        if(Object.keys(node.expression.right).includes('computed')&&Object.keys(node.expression.right).includes('object')&&Object.keys(node.expression.right).includes('property')){
                            if(node.expression.right.computed==true && node.expression.right.object.type=='Identifier'&&node.expression.right.property.type=='Identifier'){
                                if(node.expression.left.name==node.expression.right.object.name){
                                    statement1.push(node)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    if(node.type=='ExpressionStatement'){
        if(Object.keys(node).includes('expression')){
            if(node.expression.type=='AssignmentExpression'){
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='MemberExpression' && node.expression.right.type=='Identifier'){                        
                        if(Object.keys(node.expression.left).includes('computed')&&Object.keys(node.expression.left).includes('object')&&Object.keys(node.expression.left).includes('property')){
                            if(node.expression.left.computed==true && node.expression.left.object.type=='Identifier'&&node.expression.left.property.type=='Identifier'){
                                statement2.push(node)
                            }
                        }
                    }
                }
            }
        }
    }

    if (engine_inst.isFlowNode(node)){ //if ast node is included in cfg
        
    }
},result.ast);

for (i of statement1){
    console.log(JSON.stringify(i, null, 4));
}

console.log("=========================================")
for (i of statement2){
    console.log(JSON.stringify(i, null, 4));
}
console.log(statement1.length, statement2.length);
