const StaticEngine = require('./engine.js').StaticEngine
const fs = require('fs');
const path = require('path');

let filepath = '';

if(process.argv.length < 3) {
    filepath = './input.js';
}
else {
    filepath = process.argv[2];
}
function walk(dir) {
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            walk(file);
        } else if(stat.isFile()){ 
            let code = fs.readFileSync(file).toString();
            console.log(file);
            let engine = new StaticEngine(code);
            let result = engine.analyze();
            console.log(result);
            console.log("");
        }
    });
}

try {
    if(fs.existsSync(filepath)) {
        let stat = fs.statSync(filepath);
        if(stat.isFile()) {
            let code = fs.readFileSync(filepath).toString();
            console.log(filepath);
            let engine = new StaticEngine(code);
            let result = engine.analyze();
            console.log(result);
            console.log("");
        }
        else if(stat.isDirectory()) 
            walk(filepath);
    }
} catch(err) {
    console.error(err);
    process.exit(-1);
}
