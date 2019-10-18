const { staticEngine } = require('./engine.js');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.log("npm index.js [input file]");
	process.exit('-1');
}

var source = fs.readFileSync(process.argv[2]).toString();
var engine_inst = new staticEngine(source);
var result = engine_inst.analyze();

//console.log(result.res);

