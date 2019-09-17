const StaticEngine = require('./engine.js').StaticEngine
const fs = require('fs');

var code = fs.readFileSync('./input.js').toString();
console.log(code);

let engine = new StaticEngine(code)
let result = engine.analyze()

//console.log(result.ast.body[0])
//console.log(result.ast.body[0].body)

//console.log(result.cfg[2][1]);