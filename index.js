const StaticEngine = require('./engine.js').StaticEngine

let code = '[...Array(100).keys()]\
'
let engine = new StaticEngine(code)
let result = engine.analyze()
console.log(result.ast.body[0])
//console.log(result.ast.body[0].body)

//console.log(result.cfg[2][1]);
