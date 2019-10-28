const path = require('path');
const fs = require('fs');
const assert = require('assert');
const StaticEngine = require('../engine.js').staticEngine;
const pattern1=require('../patterns/prototype_pollution_v1.js');
describe('module time test', ()=> {
    const dir = path.join(__dirname, 'resource', 'modules');
    const files = fs.readdirSync(dir);
    files.forEach((file)=> {
        if(/.js$/.test(file)) {
            it(`Module test ${file}`, function (done) {
                this.timeout(10000);
                const contents = fs.readFileSync(path.join(dir, file), 'utf8');
                try {
                    let engine = new StaticEngine(contents, {debug : false});
                    let result = engine.analyze();
                    var statement1=[];
                    var statement2=[];
                    engine.traverse(result.ast, function (node, parent_node) {
                        pattern1.prototype_pollution_statement1(node, statement1)
                        pattern1.prototype_pollution_statement2(node, statement2);
                    },result.ast);
                    /*
                    for (i of statement1){
                        console.log(JSON.stringify(i, null, 4));
                    }
                    for (i of statement2){
                        console.log(JSON.stringify(i, null, 4));
                    }
                    */
                    console.log(statement1.length, statement2.length);
                    
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
