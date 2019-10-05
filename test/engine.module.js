const path = require('path');
const fs = require('fs');
const assert = require('assert');
const StaticEngine = require('../engine.js').StaticEngine;

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
                }
                catch(e) {
                    if(e.message === 'esprima error')
                        done();
                    else {
                        console.log(e);
                        assert()
                    }
                }
                done();
            })
        }
    })
})