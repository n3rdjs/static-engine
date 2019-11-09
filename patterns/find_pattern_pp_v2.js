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
                            if(node.expression.left.computed==true && node.expression.left.object.type=='Identifier'){
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
    if (i.expression.cfg){
        console.log(i.range, i.expression.left.name,'=',i.expression.left.name, '[',i.expression.right.property.name,']', i.expression.cfg.id)
    }
    else{
        console.log(i.range, i.expression.left.name,'=',i.expression.left.name, '[',i.expression.right.property.name,']')
    }
  
  //  console.log(JSON.stringify(i, null, 4));
}

console.log("=========================================")
for (i of statement2){
    if (i.expression.cfg){
        console.log(i.range, i.expression.left.object.name, '[',i.expression.left.property.name,']=', i.expression.right.name, i.expression.cfg.id)    
    }
    else{
        console.log(i.range, i.expression.left.object.name, '[',i.expression.left.property.name,']=', i.expression.right.name)
    }
  
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
    let ar = analyzer.scc(result.ast, result.cfg);
    let scc = ar.scc;
    let vt = ar.vt;
    let visit_ptr = ar.visit_ptr;
    let visited = ar.visited;
    let v = ar.v;
    var found1 = [];
    var found2 = [];
    for (let i = 0; i < scc.length; i++){
        found1[i] = [];
        found2[i] = [];
    }
    for (let i in scc){
        for (let j of scc[i]){
            for (let k in id1){
                if (id1[k] == j){
                    let tmp = [];
                    tmp[0] = k;
                    tmp[1] = id1[k];
                    found1[i].push(tmp);
                }
            }
        }
    }
    for (let i in scc){
        for (let j of scc[i]){
            for (let k in id2){
                if (id2[k] == j){
                    let tmp = [];
                    tmp[0] = k;
                    tmp[1] = id2[k];
                    found2[i].push(tmp);
                }
            }
        }
    }
    for (let i in scc){
        if (found1[i].length == 0 || scc[i].length < 2) continue;
        for (let j in found1[i]){ //-> statement1[j] ( hash )
            for (let k = 0; k < v; k++){
                visited[visit_ptr[k]] = false;
            }
            dfs(i, j, found1[i][j][1]);
        }
    }
        
    function dfs(sccptr, st1, v){
        visited[v] = true;
        if (vt[v]){
            for (let i of vt[v]){ //i: hash
                if (visited[i]==true) continue;
                for (let j in statement2){
                    if (statement2[j].expression.cfg.id === i){
                        console.log("**********Prototype Pollution v2 found!**********");
                        console.log(statement1[found1[sccptr][st1][0]].range, statement1[found1[sccptr][st1][0]].expression.left.name,'=', statement1[found1[sccptr][st1][0]].expression.left.name, '[',statement1[found1[sccptr][st1][0]].expression.right.property.name,']')
                        console.log(statement2[j].range, statement2[j].expression.left.object.name, '[',statement2[j].expression.left.property.name,']=', statement2[j].expression.right.name)    
                    }
                }
                dfs(sccptr, st1, i);
            }
        }
    }
}

[[1,"abc"], [2,"cde"]].findIndex((x,y)=>x[1]==='abc');