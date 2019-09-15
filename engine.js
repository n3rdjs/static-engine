const Esprima = require('esprima');
const esgraph = require('esgraph');

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
        let ast = Esprima.parseScript(this.code);
        let cfg = esgraph(ast);
        result.ast = ast;
        result.cfg = cfg;
        return result;
    }

    traverse(node, func) {
        func(node);
        for (let key in node) {
            if(node.hasOwnProperty(key)) {
                let child = node[key];
                if (typeof child === 'object' && child !== null) {
                    if (Array.isArray(child)) {
                        child.forEach(function (node) {
                            traverse(node, func);
                        });
                    }
                    else {
                        traverse(child, func);
                    }
                }
            }
        }
    }
}

exports.StaticEngine = StaticEngine;