const path = require('path');
const fs = require('fs');
const assert = require('assert');
const StaticEngine = require('../engine.js').staticEngine;
const analyzer = require('../analyzer.js');
const pattern1=require('../patterns/prototype_pollution_v1.js');
describe('module time test', ()=> {
    const dir = path.join(__dirname, 'resource', 'modules');
    const files = fs.readdirSync(dir);
    files.forEach((file)=> {
        if(/.js$/.test(file)) {
            it(`Module test ${file}`, function (done) {
                this.timeout(10000);
                const contents = fs.readFileSync(path.join(dir, file), 'utf8');
                /**** make length limit ****/
                if (contents.length > 200000){
                    console.log("too long");
                    assert()
                } 
                try {
                    let engine = new StaticEngine(contents, {debug : false});
                    let result = engine.analyze();
                    var statement1=[];
                    var statement2=[];
                    engine.traverse(result.ast, function (node, parent_node) {
                        pattern1.prototype_pollution_statement1(node, statement1)
                        pattern1.prototype_pollution_statement2(node, statement2);
                    },result.ast);
                    
                    for (i of statement1){
                        //console.log(i.range, i.expression.left.name,'=',i.expression.left.name, '[',i.expression.right.property.name,']')
  
                       // console.log(JSON.stringify(i, null, 4));
                    }
                    console.log("===================================================")
                    for (i of statement2){
                        //console.log(i.range, i.expression.left.object.name, '[',i.expression.left.property.name,']=', i.expression.right.name)
  
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
                        console.log("scc generation complete");
                        var found1 = [];
                        var found2 = [];
                        for (let i = 0; i < scc.length; i++){
                            found1[i] = [];
                            found2[i] = [];
                        }
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
                }
                catch(e) {
                    if(e.message !== 'esprima error') {
                        console.log(e);
                        assert()
                    }
                }
                done();
            })
        }
    })
})

