const Esprima = require('esprima');
const esgraph = require('esgraph');
var fs=require("fs");

var variable = [];
var entire_function=[];

function scope(range,type){
    this.range=range;
    this.type=type;
    this.child=[];
    this.variables=[];
    this.functions=[];
}
function variable_info(name, scope, type, value, argument, range){
    this.type = type;
    this.name = name;
    this.value = value;
    this.scope=scope;
    this.argument = argument;
    this.range=range;

}
function function_info(name,scope,range, type, argument, parent, method_type, function_type){
    this.name=name;
    this.scope=scope;
    this.range=range;
    this.type=type;
    this.argument=argument;
    this.parent=parent;
    this.method_type=method_type;
    this.function_type=function_type;
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
        console.log("#######################################################################");
        console.log("");
        let rslt = JSON.parse(str_ast); //only for debugging purpose

        var self = this;
        self.traverse(ast, function (node, parent_node) {
            if (node.type){ //range -> undefined
                self.make_scope(node, parent_node);
            }
        },ast);
        
        self.traverse(ast, function (node, parent_node) {
            if (node.type){ //range -> undefined
                self.get_variable(node, parent_node);
                self.get_function(node, parent_node);
            }
        },ast);

        console.log("#######################################################################");
        console.log("");
        console.log(this.scope_array);
        console.log("#######################################################################");
        console.log("");
        let variable_num = 0;
        for (let i of variable){
            variable_num++;
            console.log("**********  "+variable_num+"  Variable Info*************");
            Object.keys(i).forEach(item =>{
                console.log(item, ":", i[item]);
            })
            console.log("");
        }
        console.log("#######################################################################");
        console.log("");
        let function_num=0;
        for (let i of entire_function){
            function_num++;
            console.log("**********  "+function_num+"  Function Info*************");
            Object.keys(i).forEach(item => {
                if(item!='parent'){
                    console.log(item, ":" ,i[item]);
                }
            })
            console.log("");
        }
        return result;
    }

    get_variable(node){
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            argument: []
        };
        if (node.type == 'VariableDeclaration'){
            if (node.declarations[0].type == 'VariableDeclarator'){
                let node2 = node.declarations[0];

                //already used global(var_hoisting)
                let found = this.var_hoisting_fromdeclaration(node);
                if (found != 0){
                    return ;
                }

                if (node2.init == null){ 
                    //"var a1";
                    data.name = node2.id.name; //a1
                    data.type = node.kind; //var/let/const
                    data.range = node2.range;
                    
                } else {
                    if (node2.init.type == 'FunctionExpression'){
                        data.name=node2.id.name;
                        data.type=node.kind;
                        data.argument=node2.init.params;
                        data.value='FunctionExpression';
                        data.range=node2.init.range;
                    }
                    else if (node2.init.type == 'ArrowFunctionExpression'){
                        data.name=node2.id.name;
                        data.type=node.kind;
                        data.argument=node2.init.params;
                        data.value='ArrowFunctionExpression';
                        data.range=node2.init.range;
                    }
                    else {
                        data.name=node2.id.name;
                        data.type=node.kind;
                        data.range=node2.init.range;
                        data.value=node2.init.type;
                    }
                }
            }
            if (data.type == 'var') data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            else data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'block');
            
            variable.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
            this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
        }
        else if (node.type == 'AssignmentExpression'){
            if (node.left.type != 'MemberExpression'){
                // if new key:value??

                // this??

                // if not??
            }
            // find if same identifier name is defined
            let found = this.var_if_declared(node);
            if (found == 0){
                // if doesn't exist
                data.type = 'global';
                data.name = node.left.name; //a2
                data.scope = this.scope_array[this.parent_scope_range]
                data.value = node.right.type;
                data.range = node.right.range;
                variable.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
            }
        }        
    }
    get_function(node, parent_node){
        var self = this;
        let data = {
            name:'',
            scope:[],
            range:[],
            type:'',
            argument:[],
            parent:{},
            method_type:undefined,
            function_type:undefined
        };
        var found_scope=self.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
      
        data.scope=found_scope.range;
        data.range=node.range;
        data.type=node.type;
        data.argument=node.params;
        data.parent=parent_node;

        if(node.type=='FunctionDeclaration'||node.type=='ArrowFunctionExpression'||node.type=='FunctionExpression'){
            if(parent_node.type=='MethodDefinition'){
                data.name=parent_node.key.name;
                data.method_type=parent_node.kind;
            }
            else{
                if(node.id)data.name=node.id.name;
                else data.name=node.id;
            }
            if(node.type=='ArrowFunctionExpression'||node.type=='FunctionExpression'){
                variable.filter((item)=>{
                    if((node.type==item.value)&&(node.range==item.range)){
                        data.function_type=item.type;
                        data.name=item.name;
                    }
                })
            }
            var tmp_function=new function_info(data.name, data.scope, data.range, data.type, data.argument, data.parent, data.method_type, data.function_type);
            this.scope_array[data.scope].functions.push(tmp_function);
            entire_function.push(tmp_function);
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

    var_if_declared(node){
        let found;
        for (let i of variable){
            if (i.name = node.left.name){
                if (node.range[0] <= i.scope[0] && i.scope[1] <= node.range[1]){
                    found = i;
                }
            }
        }
        return found;
    }

    var_hoisting_fromdeclaration(node){
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            argument: []
        };
        let node2 = node.declarations[0];
        if (node.kind == 'var') data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
        else data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'block');

        let root = this.scope_array[this.parent_scope_range];

        for (let i of root.variables){
            if (i.name == node2.id.name && i.type == 'global'){

                if (data.scope.range[0] <= i.range[0] && i.range[1] <= data.scope.range[1]){
                    i.type = node.kind;
                
                    root.variables = root.variables.filter(function(value){
                        return value != i;
                    });
                 
                    if (node2.init == null){ 
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.range = node2.range;
                    } else {
                        data.name=node2.id.name;
                        data.type=node.kind;
                        data.range=node2.init.range;
                        data.value=node2.init.type;
                    }
    
                    i.scope = data.scope.range;
                    for (let j of variable){ // assume no duplicates
                        if (j.name == node2.id.name && j.type == 'global'){
                            j.type = node.kind;
                            j.scope = data.scope.range;
                        }
                    }
                    this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                    return data;
                }
                
            }
        }
        return 0;
    }

    make_scope(node, parent_node){
        var scope_flag=false;
        var target_range;
        var target_type;
        if(node.type=='BlockStatement'){
            target_range=node.range;
            scope_flag=true;
            if(parent_node.type=='ArrowFunctionExpression'|| parent_node.type=='FunctionDeclaration' || parent_node.type=='FunctionExpression'){
                target_type=2;
            }
            else target_type=1;
        }
        if(node.type=='ClassBody'){
            target_range=node.range;
            scope_flag=true;
            if(parent_node.type=='ClassDeclaration')target_type=3;
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

    traverse(node, func, parent_node) {
        func(node, parent_node);
        for (let key in node) {
            if(node.hasOwnProperty(key)) {
                let child = node[key];
               
                if (typeof child === 'object' && child !== null) {
                    parent_node=node;
                    if (Array.isArray(child)) {
                        for (let idx in child) {
                            this.traverse(child[idx], func, parent_node);
                        }
                    }
                    else {
                        this.traverse(child, func, parent_node);
                    }
                }
            }
        }
    }
    
    
}

exports.StaticEngine = StaticEngine;