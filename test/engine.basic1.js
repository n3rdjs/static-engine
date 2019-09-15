const path = require('path');
const fs = require('fs');
const assert = require('assert');
const StaticEngine = require('../engine.js').StaticEngine;

describe('engine basic1 test', function () {
    it('result object test', function (done) {
        console.log(process.cwd());
        let code = fs.readFileSync(path.join(__dirname, 'resource', 'basic1.js'));
        let a = new StaticEngine(code.toString(), {});
        let result = a.analyze();
        assert(typeof result.ast === 'object', "result should have ast");
        done();
    });
});