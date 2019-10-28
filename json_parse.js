const fs = require('fs');
const path = require('path');

var json = fs.readFileSync(process.argv[2]).toString();
//console.log(source)
obj = JSON.parse(json);

console.log(Object.keys(obj));
for (i of Object.keys(obj)){
    if(i!=='range')console.log(obj[i]);
    if
}
//console.log(obj[Object.keys(obj)[0]])
function scope(range,type){

}

//called with every property and its value
function print_key_value(key,value) {
    console.log(key + " : "+value);
}

var parse={
    key:[]

}
function traverse(o,func) {
    for (var i of Object.keys(obj)) {
        if(i!=='range'){
            if()
        }
        func.apply(this,[i,o[i]]);  
        if (o[i] !== null && typeof(o[i])=="object") {
            //going one step down in the object tree!!
            //console.log("HIHI"+JSON.stringify(o, null, 4))
            traverse(o[i],func);
        }
       // else if(typeof(o[i])!=='object')console.log("hihi"+o[i])
    }
}

//that's all... no magic, no bloated framework
traverse(obj,print_key_value);
