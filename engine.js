const Esprima = require('esprima');
const esgraph = require('esgraph');
var fs=require("fs");

var variable = [];
var entire_function=[];
var num=0;

function scope(range,type){
    this.range=range;
    this.type=type;
    this.child=[];
    this.variables=[];
    this.functions=[];
}
function variable_info(name, scope, type, value, argument){
    this.type = type;
    this.name = name;
    this.value = value;
    this.scope=scope;
    this.argument = argument;
}
function function_info(name,scope,range, type, argument){
    this.name=name;
    this.scope=scope;
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
        fs.writeFile('result_ast.txt', str_ast, function (err) {
            if (err) throw err;
        }); 
        console.log(str_ast);
        let rslt = JSON.parse(str_ast); //only for debugging purpose

        var self = this;
        self.traverse(ast, function (node) {
            if (node.type){ //range -> undefined
                self.make_scope(node);
            }
        });
        
        self.traverse(ast, function (node) {
            if (node.type){ //range -> undefined
                self.get_function(node);
            }
        });
        console.log(this.scope_array);

        self.traverse(ast, function (node) {
            if (node.type){ //range -> undefined
                self.get_variable(node);
            }
        });
        
        for (let i of variable){
            console.log(i);
        }
        console.log("#######################################################################");
        for (let i of entire_function){
            console.log(i);
        }
        return result;
    }

    get_variable(node){
        let data = {
            name: '',
            type: '',
            value: '',
            use_range: [],
            argument: []
        };
        if (node.type == 'VariableDeclaration'){
            if (node.declarations[0].type == 'VariableDeclarator'){
                let node2 = node.declarations[0];
                if (node2.init == null){ 
                    //"var a1";
                    data.name = node2.id.name; //a1
                    
                    data.type = node.kind; //var/let/const
                    
                } else {
                    if (node2.init.type == 'Literal'){
                        //"var a2 = 1; var a2 = 'a';"
                        data.name = node2.id.name; //a2
                        //data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range);
                        data.type = node.kind; //var/let/const
                        data.value = node2.init.value;
                    }
                    else if (node2.init.type == 'ArrayExpression'){
                        data.name = node2.id.name; //
                        data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range);
                        data.type = node.kind; //var/let/const
                        data.value = node2.init.elements;
                    }
                    else if (node2.init.type == 'ObjectExpression'){
                        //var a5 = {a:1, b:function x(){return a}};
                        data.name = node2.id.name; //a5
                        //data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range);
                        data.type = node.kind; //var/let/const
                        data.value = {};
                        if (node2.init.properties){
                            for (let i = 0; i < node2.init.properties.length; i++) {
                                data.value[node2.init.properties[i].key.name] = node2.init.properties[i].value
                            }
                            //data.value = node2.init.properties;
                        }
                    }
                    else if (node2.init.type == 'CallExpression'){
                        //"var a4 = a(1, 2);"
                        data.name = node2.id.name; //a4
                        //data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range);
                        data.type = node.kind; //var/let/const
                    }
                    else if (node2.init.type == 'BinaryExpression'){
                        //"var a3 = 1 + 2 + x()" --> CallExpression????
                        data.name = node2.id.name; //a3
                        //data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range);
                        data.type = node.kind; //var/let/const
                        data.value = "BinaryExpression";
                        //data.argument <- arguments
                    }
                }
            }
            if (data.type == 'var') data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            else data.use_range = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'block');
            
            variable.push(new variable_info(data.name, data.use_range, data.type, data.value, data.argument));
        }
        else if (node.type == 'AssignmentExpression'){
            if (node.left.type != 'MemberExpression'){
                // if new key:value??

                // if not??
            }
            // find if same identifier name is defined
            
            // if doesn't exist
            if (node.right.type == 'Literal'){
                data.type = 'global';
                data.name = node.left.name; //a2
                data.use_range = this.scope_array[this.parent_scope_range]
                data.value = node.right.value;
            }
            else if (node.right.type == 'ArrayExpression'){
                data.type = 'global';
                data.name = node.left.name; //a2
                data.use_range = this.scope_array[this.parent_scope_range]
                data.value = node.right.elements;
            } 
            else if (node.right.type == 'ObjectExpression'){

            }
            else if (node.right.type == 'CallExpression'){

            }
            else if (node.right.type == 'BinaryExpression'){

            }
            //hoisting?

            //if not hoisted(automatic global)
            variable.push(new variable_info(data.name, data.use_range, data.type, data.value, data.argument));
        }        
    }

    get_function(node){
        var target_range;
        var found_scope;
        var self = this;
        if(node.type=='FunctionDeclaration'){
            found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            this.scope_array[found_scope.range].functions.push(new function_info(node.id.name, node.range,node.type, node.params));
            entire_function.push(new function_info(node.id.name, found_scope.range, node.range, node.type, node.params));
        }
        if(node.type=='ArrowFunctionExpression'){
            found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            if(node.id&&node.id.name){
                this.scope_array[found_scope.range].functions.push(new function_info(node.id.name, node.range,node.type, node.params));
                entire_function.push(new function_info(node.id.name, found_scope.range, node.range, node.type, node.params));
            }
            else {
                this.scope_array[found_scope.range].functions.push(new function_info("NULL_ArrowFunctionExpression", node.range,node.type, node.params));
                entire_function.push(new function_info("NULL_ArrowFunctionExpression", found_scope.range, node.range, node.type, node.params));
            }
        }
        if(node.type=='FunctionExpression'){
            found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            if(node.id&&node.id.name){
                this.scope_array[found_scope.range].functions.push(new function_info(node.id.name, node.range,node.type, node.params));
                entire_function.push(new function_info(node.id.name, found_scope.range, node.range, node.type, node.params));
            }
            else {
                this.scope_array[found_scope.range].functions.push(new function_info("NULL_FunctionExpression", node.range,node.type, node.params));
                entire_function.push(new function_info("NULL_FunctionExpression", found_scope.range, node.range, node.type, node.params)); 
            }
        }
    }
    find_scope(parent_scope, target_range, last_function_scope, scope_type){
        for (let children of parent_scope.child){
            if(children.range[0]<=target_range[0]&&children.range[1]>=target_range[1])
            {
                if (children.type != 1){ // not BlockStatement
                    last_function_scope = children;
                }
                return(this.find_scope(children, target_range, last_function_scope, scope_type));
                
            }
        }
        if (scope_type == 'block') return parent_scope;
        else if (scope_type == 'function') return last_function_scope;
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
                target_type=2;
                scope_flag=true;

            }
        }

        /*var a=(m,n)=>{
            return m+n;
        }*/
        if (node.type == 'ArrowFunctionExpression'){
            if (node.body.type == 'BlockStatement'){
                target_range=node.body.range;
                target_type=3;
                scope_flag=true;
            }
        }
        /*
        (function() {
            'use strict';
            console.log('a');
        })();
        */
        if (node.type == 'FunctionExpression'){
            if (node.body.type == 'BlockStatement'){
                target_range=node.body.range;
                target_type=4;
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