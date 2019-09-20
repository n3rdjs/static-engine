const Esprima = require('esprima');
const esgraph = require('esgraph');

function scope(range,type){
    this.range=range;
    this.type=type;
    this.child=[];
    this.variables=[];
    this.functions=[];
}
function variable_info(name,range,type){
    this.name=name;
    this.range=range;
    this.type=type;
    this.value;
    this.argument;
}
function function_info(name,range, type, argument){
    this.name=name;
    this.range=range;
    this.type=type;
    this.argument=argument;
}

class StaticEngine {
    constructor(code, options) {
        this.code = code;
        this.options = options;

        this.real_func_names = [];
        this.real_func_call = [];
        this.real_variable = [];
        this.real_func_scope = [];

        this.parent_scope_range;
        this.scope_array={};
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
        console.log(this.scope_array);
        //let scope_result=JSON.stringify(this.scope_array[0], null, 4);
       // console.log(scope_result);


       self.traverse(ast, function (node) {
        if (node.type){ //range -> undefined
            self.get_function(node);
            }
        });
        return result;
    }
    get_function(node){
        var target_range;
        var found_scope;
        var self = this;
        if(node.type=='FunctionDeclaration'){
            found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range);
            console.log(found_scope);
            console.log(node);
        }
        if(node.type=='ArrowFunctionExpression'){
            found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range);
            console.log(found_scope);
            console.log(node);
        }
    }
    find_scope(parent_scope, target_range){
        for (let children of parent_scope.child){
            if(children.range[0]<=target_range[0]&&children.range[1]>=target_range[1])
            {
                return(this.find_scope(children, target_range));
                
            }
        }
        return parent_scope;
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
            this.parent_scope_range=target_range;
            scope_flag=true;
            
        }

        if(scope_flag==true && !this.scope_array[target_range]){
            this.scope_array[target_range]=(new scope(target_range, target_type));
            if(target_type!=0)this.push_scope(this.scope_array[this.parent_scope_range], target_range);
        }
    }
    push_scope(parent_scope, target_range){
        if(parent_scope.child.length==0){
            parent_scope.child.push(this.scope_array[target_range]);
            return;
        }  
        for (let children of parent_scope.child){
            if(children.range[0]<=this.scope_array[target_range].range[0]&&children.range[1]>=this.scope_array[target_range].range[1])
            {
                this.push_scope(children, target_range);
                return;
            }
        }
        parent_scope.child.push(this.scope_array[target_range]);
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
    
    
}

exports.StaticEngine = StaticEngine;