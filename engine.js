const Esprima = require('esprima');
const esgraph = require('esgraph');
const chalk = require('chalk');
const fs = require("fs");

const BLANK_FUNCION = () => {};
var log = (...argv) => console.log(...argv);

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
    constructor(name, scope, range, type, argument, parent, method_type, function_type) {
        this.name = name;
        this.scope = scope;
        this.range = range;
        this.type = type;
        this.argument = argument;
        this.parent = parent;
        this.method_type = method_type;
        this.function_type = function_type;
    }
}

class StaticEngine {
    constructor(code, options = {}) {

        this.code = code;
        this.options = options;

        this.real_func_names = [];
        this.real_func_call = [];
        this.real_variable = [];
        this.real_func_scope = [];

        this.parent_scope_range;
        this.scope_array = {};

        this.variable = [];
        this.entire_function = [];

        if (options.debug === false) {
            log = BLANK_FUNCION;
        }
        if (options.customlog) {
            log = options.customlog;
        }
    }

    analyze() {
        try {
            var ast = Esprima.parseScript(this.code, {
                range: true
            });
            var cfg = esgraph(ast);

            fs.writeFileSync('AST.json', JSON.stringify(ast, null, 4));

            var self = this;
            self.traverse(ast, function (node, parent_node) {
                if (node.type) {
                    self.make_scope(node, parent_node);
                }
            }, ast);

            self.traverse(ast, function (node, parent_node) {
                if (node.type) {
                    self.get_variable_declaration(node, parent_node);
                    self.get_function(node, parent_node);
                }
            }, ast);

            this.get_parameter();

            self.traverse(ast, function (node, parent_node) {
                if (node.type) { //range -> undefined
                    self.get_variable_assignment(node, parent_node);
                }
            }, ast);

            let variable_num = 0;
            for (let i of this.variable) {
                variable_num++;
                log(chalk.bgRed(` Variable Info (${variable_num}) `));
                Object.keys(i).forEach(item => {
                    log(item, ":", i[item]);
                })
                log("");
            }
            let function_num = 0;
            for (let i of this.entire_function) {
                function_num++;
                log(chalk.bgBlue(` Function Info (${function_num}) `));
                Object.keys(i).forEach(item => {
                    if (item != 'parent') {
                        log(item, ":", i[item]);
                    }
                })
                log("");
            }

            var result = {
                'variable': this.variable,
                'function': this.entire_function,
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
        if (astnode.cfg) {
            return true;
        } else return false;
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
        for (let i of this.entire_function) {
            for (let j in i.argument) {
                if (i.argument[j].type == 'Identifier') {
                    data.type = 'function parameter';
                    data.name = i.argument[j].name;
                    data.range = i.argument[j].range;

                    data.scope = this.find_scope(this.scope_array[this.parent_scope_range], data.range, this.scope_array[this.parent_scope_range], 'function');
                    data.range = [];

                    this.variable.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                    this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
                }
            }
        }
    }

    get_variable_declaration(node) {
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
                let found = this.var_hoisting_fromdeclaration(node);
                if (found != 0) {
                    return;
                }

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

            this.variable.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
            this.scope_array[data.scope.range].variables.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
        }
    }
    get_variable_assignment(node) {
        let data = {
            name: '',
            type: '',
            value: '',
            scope: [],
            argument: []
        };
        if (node.type == 'AssignmentExpression') {
            if (node.left.type != 'MemberExpression') {
                // if new key:value??

                // this??

                // if not??
            }
            // find if same identifier name is defined
            let found = this.var_if_declared(node);
            if (found == 0) {
                // if doesn't exist
                data.type = 'global';
                data.name = node.left.name; //a2
                data.scope = this.scope_array[this.parent_scope_range]
                data.value = node.right.type;
                data.range = []; //node.right.range;
                this.variable.push(new variable_info(data.name, data.scope.range, data.type, data.value, data.argument, data.range));
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
            if (parent_node.type == 'CallExpression') {
                if (node.id) data.name = node.id.name;
                else data.name = node.id;
                data.scope = node.range;
            } else {
                if (node.id) data.name = node.id.name;
                else data.name = node.id;
                data.scope = found_scope.range;
            }
            if (node.type == 'ArrowFunctionExpression' || node.type == 'FunctionExpression') {
                this.variable.filter((item) => {
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

            var tmp_function = new function_info(data.name, data.scope, data.range, data.type, data.argument, data.parent, data.method_type, data.function_type);
            this.scope_array[data.scope].functions.push(tmp_function);
            this.entire_function.push(tmp_function);
        }

    }

    find_scope(parent_scope, target_range, last_function_scope, scope_type) {
        for (let children of parent_scope.child) {
            if (children.range[0] < target_range[0] && children.range[1] > target_range[1]) {
                if (children.type != 1) { // not BlockStatement
                    last_function_scope = children;
                }
                return (this.find_scope(children, target_range, last_function_scope, scope_type));
            }
        }
        if (scope_type == 'block') return parent_scope;
        else if (scope_type == 'function') return last_function_scope;
    }

    var_if_declared(node) {
        let found = 0;
        for (let i of this.variable) {
            if (i.name == node.left.name) {
                if (node.range[0] >= i.scope[0] && i.scope[1] >= node.range[1]) {
                    found = i;
                }
            }
        }
        return found;
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
                    for (let j of this.variable) { // assume no duplicates
                        if (j.name == node2.id.name && j.type == 'global') {
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

    make_scope(node, parent_node) {
        var scope_flag = false;
        var target_range;
        var target_type;
        if (node.type == 'BlockStatement') {
            target_range = node.range;
            scope_flag = true;
            if (parent_node.type == 'ArrowFunctionExpression' || parent_node.type == 'FunctionDeclaration' || parent_node.type == 'FunctionExpression') {
                target_type = 2;
            } else target_type = 1;
        }

        if (node.type == 'ArrowFunctionExpression' || node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression') {
            if (node.body.type == 'BlockStatement') {
                target_range = node.range;
                scope_flag = true;
                target_type = 3;
            }
            if (parent_node.type == 'CallExpression') {
                target_range = node.range;
                scope_flag = true;
                target_type = 4;
            }
        }

        if (node.type == 'ClassBody') {
            target_range = node.range;
            scope_flag = true;
            if (parent_node.type == 'ClassDeclaration') target_type = 4;
        }
        if (node.type == "Program") {
            target_range = node.range;
            target_type = 0;
            this.parent_scope_range = target_range;
            scope_flag = true;
        }
        if (node.type == 'ForStatement') {
            target_range = node.range;
            target_type = 1; //same as block
            scope_flag = true;
        }
        if (node.type == 'ForOfStatement') {
            target_range = node.range;
            target_type = 1; //same as block
            scope_flag = true;
        }
        if (node.type == 'ForInStatement') {
            target_range = node.range;
            target_type = 1; //same as block
            scope_flag = true;
        }
        if (scope_flag == true && !this.scope_array[target_range]) {
            this.scope_array[target_range] = (new scope(target_range, target_type));
            if (target_type != 0) this.push_scope(this.scope_array[this.parent_scope_range], target_range);
        }
    }
    push_scope(parent_scope, target_range) {
        if (parent_scope.child.length == 0) {
            parent_scope.child.push(this.scope_array[target_range]);
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
        func(node, parent_node);

        for (let key of Object.keys(node)) {
            let child = node[key];

            if (child && typeof child === 'object') {
                parent_node = node;
                if (Array.isArray(child)) {
                    for (let idx in child) {
                        if (child[idx] && typeof child[idx] === 'object') {
                            this.traverse(child[idx], func, parent_node);
                        }
                    }
                } else {
                    this.traverse(child, func, parent_node);
                }
            }

        }
    }
}

module.exports.staticEngine = StaticEngine;