const { staticEngine } = require('../engine.js');
const fs = require('fs');
const path = require('path');
const analyzer = require('../analyzer.js');

if (process.argv.length < 3) {
    console.log("node [pattern analyzer] [input file]");
	process.exit('-1');
}

var source = fs.readFileSync(process.argv[2]).toString();
var engine_inst = new staticEngine(source, {'debug' : false});
var result = engine_inst.analyze();

var statement1=[];
var statement2=[];
engine_inst.traverse(result.ast, function (node, parent_node) {

    if(node.type=='ExpressionStatement'){
        if(Object.keys(node).includes('expression')){
            if(node.expression.type=='AssignmentExpression'){ //-> cfg node
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='Identifier' && node.expression.right.type=='MemberExpression'){                        
                        if(Object.keys(node.expression.right).includes('computed')&&Object.keys(node.expression.right).includes('object')&&Object.keys(node.expression.right).includes('property')){
                            if(node.expression.right.computed==true && node.expression.right.object.type=='Identifier'&&node.expression.right.property.type=='Identifier'){
                                if(node.expression.left.name==node.expression.right.object.name){
                                    if (node.expression.cfg){
                                        statement1.push(node)
                                    }
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
            if(node.expression.type=='AssignmentExpression'){ //-> cfg node
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='MemberExpression' && node.expression.right.type=='Identifier'){                        
                        if(Object.keys(node.expression.left).includes('computed')&&Object.keys(node.expression.left).includes('object')&&Object.keys(node.expression.left).includes('property')){
                            if(node.expression.left.computed==true && node.expression.left.object.type=='Identifier'&&node.expression.left.property.type=='Identifier'){
                                if (node.expression.cfg){
                                    statement2.push(node)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
},result.ast);

for (i of statement1){
    console.log(i.range, i.expression.left.name,'=',i.expression.left.name, '[',i.expression.right.property.name,']', i.expression.cfg.id)
  
  //  console.log(JSON.stringify(i, null, 4));
}

console.log("=========================================")
for (i of statement2){
    console.log(i.range, i.expression.left.object.name, '[',i.expression.left.property.name,']=', i.expression.right.name, i.expression.cfg.id)
  
    //console.log(JSON.stringify(i, null, 4));
}
console.log(statement1.length, statement2.length);
if (statement1.length > 0 && statement2.length > 0){
    id1 = [];
    id2 = [];
    for (let i in statement1){
        if (statement1[i].expression.cfg){
            id1.push(statement1[i].expression.cfg.id);
        }
    }
    for (let j in statement2){
        if (statement2[j].expression.cfg){
            id2.push(statement2[j].expression.cfg.id);
        }
    }
    let scc = analyzer.scc(result.ast, result.cfg);

    var found1 = [];
    var found2 = [];
    for (let i = 0; i < scc.length; i++){
        found1[i] = [];
        found2[i] = [];
    }
    //console.dir( scc, {'maxArrayLength': null} );
    for (let i in scc){
        for (let j of scc[i]){
            for (let k in id1){
                if (id1[k] == j) found1[i].push(k);
            }
        }
    }
    for (let i in scc){
        for (let j of scc[i]){
            for (let k in id2){
                if (id2[k] == j) found2[i].push(k);
            }
        }
    }
    for (let i in scc){
        if (found1[i].length * found2[i].length == 0) continue;
        for (let j in found1[i]){
            for (let k in found2[i]){
                console.log("**********Connected components found!**********");
                console.log(statement1[found1[i][j]].range, statement1[found1[i][j]].expression.left.name,'=', statement1[found1[i][j]].expression.left.name, '[',statement1[found1[i][j]].expression.right.property.name,']')
                console.log(statement2[found2[i][k]].range, statement2[found2[i][k]].expression.left.object.name, '[',statement2[found2[i][k]].expression.left.property.name,']=', statement2[found2[i][k]].expression.right.name)
            }
        }
    }
}