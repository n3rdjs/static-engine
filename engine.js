const Esprima = require('esprima');
const esgraph = require('esgraph');
const chalk = require('chalk');
const fs = require("fs");
const analyzer = require('./analyzer');

var log = () => {};

class scope {
    constructor(range, type) {
        this.range = range;
        this.type = type;
        this.child = [];
        this.variables = [];
        this.functions = [];
    }
}

class variable_info {
    constructor(name, scope, type, value, argument, range) {
        this.type = type;
        this.name = name;
        this.value = value;
        this.scope = scope;
        this.argument = argument;
        this.range = range;
    }
}

class function_info {
    constructor(name, scope, range, type, argument, parent, method_type, function_type, astNode) {
        this.name = name;
        this.scope = scope;
        this.range = range;
        this.type = type;
        this.argument = argument;
        this.parent = parent;
        this.method_type = method_type;
        this.function_type = function_type;
        this.astNode = astNode;
    }
}

class StaticEngine {
    constructor(code, options = {}) {

        this.code = code;
        this.options = options;

        this.real_func_names = [];
        this.real_func_call = [];
        this.real_variables = [];
        this.real_func_scope = [];

        this.parent_scope_range;
        this.scope_array = {};

        this.variables = [];
        this.functions = [];

        if (!!options.debug) {
            log = console.log;
        }

        if (!!options.customlog) {
            log = options.customlog;
        }
    }

    analyze() {
        try {
            var ast = Esprima.parseScript(this.code, {
                range: true
            });
            var cfg = esgraph(ast);

            // don't need this anymore. just for debug
            // fs.writeFileSync(path.join(__dirname, 'out', 'ast.json'), JSON.stringify(ast, null, 4));

            var self = this;
            self.traverse(ast, (node, parent_node) => {
                if (node.type) {
                    self.make_scope(node, parent_node);
                }
            }, ast);

            self.traverse(ast, (node, parent_node) => {
                if (node.type) {
                    self.get_variables_declaration(node, parent_node);
                    self.get_function(node, parent_node);
                }
            }, ast);

            this.get_parameter();

            self.traverse(ast, (node, parent_node) => {
                if (node.type) {
                    self.get_variables_assignment(node, parent_node);
                }
            }, ast);

            this.variables.forEach((variables, index) => {
                log(chalk.bgWhiteBright(`        Variable Info (${index + 1})        `));
                for (let key of Object.keys(variables)) {
                    log(key.padStart(8), ':', variables[key]);
                }
                log();
            });

            this.functions.forEach((func, index) => {
                log(chalk.bgWhiteBright(`        Function Info (${index + 1})        `));
                for (let key of Object.keys(func)) {
                    log(key, ':', func[key]);
                }
                log();
            });

            var result = {
                'variables': this.variables,
                'functions': this.functions,
                'ast': ast,
                'cfg': cfg
            }

            return result;

        } catch (e) {
            console.log(e);
            throw new Error('Error while analyze');
        }
    }

    isFlowNode(astnode) {
        return !!astnode.cfg;
    }

    get_parameter() {
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            range: [],
            argument: []
        };
        this.functions.forEach(node => {
            Object.keys(node.argument).forEach(key => {
                if (node.argument[key].type == 'Identifier') {
                    data.type = 'function parameter';
                    data.name = node.argument[key].name;
                    data.range = node.argument[key].range;

                    data.scope = this.find_scope(this.scope_array[this.parent_scope_range], data.range, this.scope_array[this.parent_scope_range], 'function');
                    data.range = [];

                    this.variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                    this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                }
            });
        })
    }

    get_variables_declaration(node) {
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            range: [],
            argument: []
        };
        if (node.type == 'VariableDeclaration') {
            if (node.declarations[0].type == 'VariableDeclarator') {
                let node2 = node.declarations[0];

                //already used global(var_hoisting)
                /*let found = this.var_hoisting_fromdeclaration(node);
                if (found != 0) {
                    return;
                }*/

                if (node2.init == null) {
                    //"var a1";
                    data.name = node2.id.name; //a1
                    data.type = node.kind; //var/let/const
                    data.range = []; //node2.range;

                } else {
                    if (node2.init.type == 'FunctionExpression') {
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.argument = node2.init.params;
                        data.value = 'FunctionExpression';
                        data.range = node2.init.range;
                    } else if (node2.init.type == 'ArrowFunctionExpression') {
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.argument = node2.init.params;
                        data.value = 'ArrowFunctionExpression';
                        data.range = node2.init.range;
                    } else {
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.range = []; //node2.init.range;
                        data.value = node2.init.type;
                    }
                }
            }
            if (data.type == 'var') data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');
            else data.scope = this.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'block');

            this.variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
            this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
        }
    }
    get_variables_assignment(node) {
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            argument: []
        };
        if (node.type == 'AssignmentExpression') {
            if (node.left.type == 'MemberExpression') {
                // if new key:value??

                // this??
                if (node.left.object.type == 'ThisExpression'){
                    if (!this.is_declared(node.left.property)) {
                        data.type = 'class parameter';
                        data.name = node.left.property.name;
                        data.scope = this.scope_array[this.parent_scope_range]
                        data.value = node.right.type;
                        data.range = []; //node.right.range;
                        this.variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                        this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                    }
                }
                // if not??
            }
            // check variable already declared
            else if (!this.is_declared(node.left)) {
                // if doesn't exist
                data.type = 'global';
                data.name = node.left.name; //a2
                data.scope = this.scope_array[this.parent_scope_range]
                data.value = node.right.type;
                data.range = []; //node.right.range;
                this.variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
            }
        }
    }

    get_function(node, parent_node) {
        var self = this;
        let data = {
            name: '',
            scope: [],
            range: [],
            type: '',
            argument: [],
            parent: {},
            method_type: undefined,
            function_type: undefined
        };
        var found_scope = self.find_scope(this.scope_array[this.parent_scope_range], node.range, this.scope_array[this.parent_scope_range], 'function');

        if (node.type == 'FunctionDeclaration' || node.type == 'ArrowFunctionExpression' || node.type == 'FunctionExpression') {
            if (parent_node.type == 'MethodDefinition') {
                data.name = parent_node.key.name;
                data.method_type = parent_node.kind;
                data.scope = found_scope.range;
            }
            else if (parent_node.type == 'CallExpression') {
                if (node.id) data.name = node.id.name;
                else data.name = node.id; // what does it mean?
                data.scope = node.range;
            } else {
                if (node.id) data.name = node.id.name;
                else data.name = node.id; // what does it mean?
                data.scope = found_scope.range;
            }
            if (node.type == 'ArrowFunctionExpression' || node.type == 'FunctionExpression') {
                this.variables.filter((item) => {
                    if ((node.type == item.value) && (node.range == item.range)) {
                        data.function_type = item.type;
                        data.name = item.name;
                    }
                })
            }

            data.range = node.range;
            data.type = node.type;
            data.argument = node.params;
            data.parent = parent_node;

            var tmp_function = new function_info(data.name, data.scope, data.range, data.type, data.argument, data.parent, data.method_type, data.function_type, node);
            this.scope_array[data.scope].functions.push(tmp_function);
            this.functions.push(tmp_function);
            if (node.type == 'FunctionDeclaration'){
                var tmp_var = new variable_info(data.name, data.scope, "Function", data.type, data.argument, data.range);
                this.scope_array[data.scope].variables.push(tmp_var);
                this.variables.push(tmp_var)
            }
        }

    }

    /*
    usage:
    find_variable(this.scope_array[this.parent_scope_range], identifier.range, null, identifier.name) 
    */
    find_variable(parent_scope, target_range, last_variable_found, name){
        for (let v of parent_scope.variables){
            if (v.name == name && v.scope[0] < target_range[0] && target_range[1] < v.scope[1]){
                last_variable_found = v;
            }
        }
        for (let children of parent_scope.child){
            if (children.range[0] < target_range[0] && target_range[1] < children.range[1]) {
                return (this.find_variable(children, target_range, last_variable_found, name));
            }
        }
        return last_variable_found;
    }

    find_scope(parent_scope, target_range, last_function_scope, scope_type) {
        for (let children of parent_scope.child) {
            if (children.range[0] < target_range[0] && target_range[1] < children.range[1]) {
                if (children.type != 1) { // not BlockStatement
                    last_function_scope = children;
                }
                return (this.find_scope(children, target_range, last_function_scope, scope_type));
            }
        }
        if (scope_type == 'block') {
            return parent_scope;
        } else if (scope_type == 'function') {
            return last_function_scope;
        }
    }

    is_declared(node) {
        let flag = 0;
        this.variables.forEach(i => {
            if (i.name == node.name) {
                if (node.range[0] >= i.scope[0] && i.scope[1] >= node.range[1]) {
                    flag = 1;
                }
            }
        });
        if (flag === 1) return true;
        return false;
    }

    var_hoisting_fromdeclaration(node) {
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

        for (let i of root.variables) {
            if (i.name == node2.id.name && i.type == 'global') {

                if (data.scope.range[0] <= i.range[0] && i.range[1] <= data.scope.range[1]) {
                    i.type = node.kind;

                    root.variables = root.variables.filter(function (value) {
                        return value != i;
                    });

                    if (node2.init == null) {
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.range = node2.range;
                    } else {
                        data.name = node2.id.name;
                        data.type = node.kind;
                        data.range = node2.init.range;
                        data.value = node2.init.type;
                    }

                    i.scope = data.scope.range;
                    this.variables.forEach(j => { // assume no duplicates
                        if (j.name == node2.id.name && j.type == 'global') {
                            j.type = node.kind;
                            j.scope = data.scope.range;
                        }
                    });
                    this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                    return data;
                }

            }
        }
        return 0;
    }

    make_scope(node, parent_node) {
        var target_range, target_type, _flag = false;

        switch(node.type) {
            case 'BlockStatement':
            case 'ForStatement':
            case 'ForOfStatement':
            case 'ForInStatement':
                target_range = node.range;
                _flag = true;
                target_type = 1;

                if (['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression'].includes(parent_node.type)) {
                    target_type = 2;
                }
                break;

            case 'ArrowFunctionExpression':
            case 'FunctionDeclaration':
            case 'FunctionExpression':
                if (node.body.type == 'BlockStatement') {
                    target_range = node.range;
                    _flag = true;
                    target_type = 3;
                } else if (parent_node.type == 'CallExpression') {
                    target_range = node.range;
                    _flag = true;
                    target_type = 4;
                }
                break;

            case 'ClassBody':
                target_range = node.range;
                _flag = true;
                if (parent_node.type == 'ClassDeclaration') {
                    target_type = 4;
                }
                break;

            case 'Program':
                target_range = node.range;
                target_type = 0;
                this.parent_scope_range = target_range;
                _flag = true;
                break;

        }

        if (_flag && !this.scope_array[target_range]) {
            this.scope_array[target_range] = (new scope(target_range, target_type));
            if (target_type != 0) this.push_scope(this.scope_array[this.parent_scope_range], target_range);
        }
    }
    push_scope(parent_scope, target_range) {
        if (parent_scope.child.length == 0) {
            parent_scope.child = [this.scope_array[target_range]];
            return;
        }
        for (let children of parent_scope.child) {
            if (children.range[0] <= this.scope_array[target_range].range[0] && children.range[1] >= this.scope_array[target_range].range[1]) {
                this.push_scope(children, target_range);
                return;
            }
        }
        parent_scope.child.push(this.scope_array[target_range]);
        return;
    }

    traverse(node, func, parent_node) {
        if (!node || typeof node != 'object') return;
        func(node, parent_node);

        Object.keys(node).forEach(key => {

            let child = node[key];
            this.traverse(child, func, node);

        });
    }

    printSourceByRange(range) {
        return this.code.slice(range[0], range[1]);
    }
}

module.exports = {
    staticEngine : StaticEngine,
    analyzer : analyzer
};