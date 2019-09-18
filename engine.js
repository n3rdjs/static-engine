const Esprima = require('esprima');
const esgraph = require('esgraph');
var parent_scope_range;
var scope_array={};

function scope(range,type){
    this.range=range;
    this.type=type;
    this.child=[];
}

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
        //let cfg = esgraph(ast);
        result.ast = ast;
        //result.cfg = cfg;

        let str_ast = JSON.stringify(result.ast, null, 4);
        console.log(str_ast);
        let rslt = JSON.parse(str_ast); //only for debugging purpose

        var self = this;
        self.traverse(ast, function (node) {
            if (node.type){ //range -> undefined
                console.log("NODE:");
                console.log(node);
                self.make_scope(node);
                
            }
        });
        console.log(scope_array);
        //let scope_result=JSON.stringify(scope_array[0], null, 4);
       // console.log(scope_result);
        return result;
    }
    make_scope(node){
        var scope_flag=false;
        var target_range;
        var target_type;
        if(node.type=="BlockStatement"){
            target_range=node.range;
            target_type=1;
            scope_flag=true;
        }

        /*function x(){
            a = 5;
        }*/ 
        if (node.type == 'FunctionDeclaration'){
            if (node.body.type == 'BlockStatement'){
                // console.log(node.body.range);
                target_range=node.body.range; 
                target_type=1;
                scope_flag=true;

            }
        }

        /*var a=(m,n)=>{
            return m+n;
        }*/
        if (node.type == 'ArrowFunctionExpression'){
            if (node.body.type == 'BlockStatement'){
                target_range=node.body.range;
                target_type=2;
                scope_flag=true;
            }
        }

        if(node.type=="Program"){
            target_range=node.range;
            target_type=0;
            parent_scope_range=target_range;
            scope_flag=true;
            
        }

        if(scope_flag==true && !scope_array[target_range]){
            scope_array[target_range]=(new scope(target_range, target_type));
            if(target_type!=0)this.push_scope(scope_array[parent_scope_range], target_range);
        }
    }
    push_scope(parent_scope, target_range){
        if(parent_scope.child.length==0){
            parent_scope.child.push(scope_array[target_range]);
            return;
        }  
        for (let children of parent_scope.child){
            if(children.range[0]<=scope_array[target_range].range[0]&&children.range[1]>=scope_array[target_range].range[1])
            {
                this.push_scope(children, target_range);
                return;
            }
        }
        parent_scope.child.push(scope_array[target_range]);
        return;
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
        if (node.type == 'FunctionDeclaration'){
            if (node.body.type == 'BlockStatement'){
                console.log("function block\n");
            }
        }
        if (node.type == 'ArrowFunctionExpression'){
            if (node.body.type == 'BlockStatement'){
                console.log("function block\n");
            }
        }
        console.log(scope);
    }
}

exports.StaticEngine = StaticEngine;