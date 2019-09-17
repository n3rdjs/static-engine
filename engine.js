const Esprima = require('esprima');
const esgraph = require('esgraph');

var scope = [];
//var scopenum = 0;

class StaticEngine {
    constructor(code, options) {
        this.code = code;
        this.options = options;

        this.real_func_names = [];
        this.real_func_call = [];
        this.real_variable = [];
        this.real_func_scope = [];
    }

    analyze() {
        let result = {}
        //let ast = Esprima.parseScript(this.code);
        let ast = Esprima.parseScript(this.code, {range: true});
        let cfg = esgraph(ast);
        result.ast = ast;
        result.cfg = cfg;

        let str_ast = JSON.stringify(result.ast, null, 4);
        console.log(str_ast);
        let rslt = JSON.parse(str_ast); //only for debugging purpose

        var self = this;
        self.traverse(rslt, function (node) {
            if (node.type){ //range -> undefined
                console.log(node);
                //console.log('\n');
                
                self.getVariables(node);
            }
        });

        //console.log(scope);
        return result;
    }

    traverse(node, func) {
        func(node);
        for (let key in node) {
            if(node.hasOwnProperty(key)) {
                let child = node[key];
                if (typeof child === 'object' && child !== null) {
                    if (Array.isArray(child)) {
                        for (let idx in child) {
                            this.traverse(child[idx], func);
                        }
                    }
                    else {
                        this.traverse(child, func);
                    }
                }
            }
        }
    }
    
    getVariables(node){
        if (node.type == 'Program'){ //first global scope
            var scopename = node.range[0].toString() + ':' + node.range[1].toString();
            scope.push({[scopename]: [node.range[0], node.range[1]]});
            //scopenum += 1;
        }
        if (node.type == 'BlockStatement'){
            var scopename = node.range[0].toString() + ':' + node.range[1].toString();
            var tmp = scope[scope.length - 1];
            while(!(tmp[Object.keys(tmp)[0]][0] <= node.range[0] && tmp[Object.keys(tmp)[0]][1] >= node.range[1])){
                scope.pop();
                tmp = scope[scope.length - 1];
            } //pop until range is included in scope
            scope.push({[scopename]: [node.range[0], node.range[1]]});            
        }
        console.log(scope);
    }
}

exports.StaticEngine = StaticEngine;