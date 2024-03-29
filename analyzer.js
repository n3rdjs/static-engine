function traverseAST(node, options, callback) {
    const next = ()=> {
        Object.keys(node).forEach((key) => {
            if (key === 'cfg') return;
            if (Array.isArray(node[key])) {
                for(const childNode of node[key]) {
                    traverseAST(childNode, options, callback);
                }
            } else {
                traverseAST(node[key], options, callback);
            }
        })
    };
    callback(node, next);
}


function traverseCFG(node, options, callback, visited=new Set()) {
    visited.add(node);
    next = () => {
        const nextList = ['normal', 'true', 'false', 'exception'];
        for(const next of nextList) {
            const nextNode = node[next];
            if (nextNode !== undefined && !visited.has(nextNode)) {
                traverseCFG(nextNode, options, callback, visited);
            }
        }
    }
    callback(node, next);
}

function sliceSource(source, range) {
    return source.slice(range[0], range[1]);
}

function isInScope(parentScope, childScope) {
    if (parentScope[0] <= childScope[0] && childScope[1] <= parentScope[1])
        return true;
    return false;
}

function checkASTPattern(astNode, pattern) {
    if (astNode === undefined)
        return false;
    try {
        for (const property in pattern) {
            if (pattern.hasOwnProperty(property)) {
                if (typeof pattern[property] !== "object") {
                    if (astNode[property] !== pattern[property]) {
                        return false;
                    }
                }
                else {
                    if(!checkASTPattern(astNode[property], pattern[property]))
                        return false;
                }
            }
        }
    }
    catch(e) {
        return false;
    }
    return true;
}

function findFunctionInfoByCallExpression(callExpressionNode, functions) {
    let node = callExpressionNode;
    if (node.callee.type === 'Identifier') {
        for (const func of functions) {
            if (func.name === node.callee.name && isInScope(func.scope, node.callee.range)) {
                return func;
            }
        }
    }
    else if(node.callee.type === 'FunctionExpression') {
        for (const func of functions) {
            if (func.astNode === node.callee && isInScope(func.scope, node.callee.range)) {
                return func;
            }
        }
    }
    return null;
}

function findVariableInfoByIdentifier(identifierNode, variables) {
    let node = identifierNode;
    if (node.type === 'Identifier') {
        for (const variable of variables) {
            if (variable.name === node.name && isInScope(variable.scope, node.range)) {
                return variable;
            }
        }
    }
    return null;
}

function findCFGByEntryASTNode(entryASTNode, cfg) {
    for(const _cfg of cfg) {
        if (_cfg[0].astNode === entryASTNode) {
            return _cfg;
        }
    }
    return null;
}

class Dominator {
    constructor(cfg) {
        this.cfg = cfg;
        this.nodes = [undefined, ...this.cfg[2]];
        this.node_num = new Map();
        this.n = this.nodes.length; // this.cfg.length + 1
        for (let i = 1; i < this.n; i++) {
            this.node_num.set(this.nodes[i], i);
        }
        this.r = this.node_to_num(this.cfg[0]);
        this.parent = new Array(this.n);
        this.ancestor = new Array(this.n);
        this.child = new Array(this.n);
        this.vertex = new Array(this.n);
        this.label = new Array(this.n);
        this.semi = new Array(this.n);
        this.size = new Array(this.n);
        this.pred = new Array(this.n);
        this.bucket = new Array(this.n);
        this.dom = new Array(this.n);

    }

    compute() {
        for (let v = 1; v < this.n; v++) {
            this.pred[v] = new Set();
            this.bucket[v] = new Set();
            this.semi[v] = 0;
        }
        this.n = 0;
        this.dfs(this.r);    // should be this.dfs(1);
        this.size[0] = this.label[0] = this.semi[0] = 0;
        for (let i = this.n; i >= 2; i--) {
            let w = this.vertex[i];
            for (const v of this.pred[w]) {
                let u = this.eval(v);
                if (this.semi[u] < this.semi[w]) {
                    this.semi[w] = this.semi[u];
                }
            }
            this.bucket[this.vertex[this.semi[w]]].add(w);
            this.link(this.parent[w], w);
            for (const v of this.bucket[this.parent[w]]) {
                this.bucket[this.parent[w]].delete(v);
                let u = this.eval(v);
                if (this.semi[u] < this.semi[v]) {
                    this.dom[v] = u;
                }
                else {
                    this.dom[v] = this.parent[w];
                }
            }
        }

        for (let i = 2; i < this.n; i++) {
            let w = this.vertex[i];
            if (this.dom[w] !== this.vertex[this.semi[w]]) {
                this.dom[w] = this.dom[this.dom[w]];
            }
        }
        this.dom[this.r] = 0;
    }

    num_to_node(num) {
        if (num < 1 || num >= this.nodes.length) {
            throw "num_to_node error";
        }
        return this.nodes[num];
    }

    node_to_num(node) {
        if (!this.node_num.has(node)) {
            throw "node_to_num error";
        }
        return this.node_num.get(node);
    }

    succ(v) {
        const result = [];
        for (const key of ['normal', 'true', 'false', 'exception']) {
            const succ = this.num_to_node(v)[key];
            if (succ !== undefined) {
                result.push(this.node_to_num(succ));
            }
        }
        return result;
    }

    dfs(v) {
        this.n += 1;
        this.semi[v] = this.n;
        this.vertex[this.n] = this.label[v] = v;
        this.ancestor[v] = this.child[v] = 0;
        this.size[v] = 1;

        for (const w of this.succ(v)) {
            if (this.semi[w] === 0) {
                this.parent[w] = v;
                this.dfs(w);
            }
            this.pred[w].add(v);
        }
    }

    compress(v) {
        if (this.ancestor[this.ancestor[v]] !== 0) {
            this.compress(this.ancestor[v]);
            if (this.semi[this.label[this.ancestor[v]]] < this.semi[this.label[v]]) {
                this.label[v] = this.label[this.ancestor[v]];
            }
            this.ancestor[v] = this.ancestor[this.ancestor[v]];
        }
    }

    eval(v) {
        if (this.ancestor[v] === 0) {
            return this.label[v];
        }   
        this.compress(v);
        if (this.semi[this.label[this.ancestor[v]]] >= this.semi[this.label[v]]) {
            return this.label[v];
        }
        return this.label[this.ancestor[v]];
    }

    link(v, w) {
        let s = w;
        while (this.semi[this.label[w]] < this.semi[this.label[this.child[s]]]) {
            if (this.size[s] + this.size[this.child[this.child[s]]] >= 2) {
                this.ancestor[this.child[s]] = s;
                this.child[s] = this.child[this.child[s]];
            }
            else {
                this.size[this.child[s]] = this.size[s];
                s = this.ancestor[s] = this.child[s];
            }
        }
        this.label[s] = this.label[w];
        this.size[v] = this.size[v] + this.size[w];
        if (this.size[v] < 2 * this.size[w]) {
            s, this.child[v] = this.child[v], s;
        }
        while (s !== 0) {
            this.ancestor[s] = v;
            s = this.child[s];
        }
    }

    dominates(domnode, node) {
        let cu = this.node_to_num(node);
        let end = this.node_to_num(domnode);
        while (cu !== 0) {
            cu = this.dom[cu];
            if (end === cu)
                return true
        }
        return false;
    }
}

Set.prototype.union = function(setB) {
    var union = new Set(this);
    for (var elem of setB) {
        union.add(elem);
    }
    return union;
}
class DataInfo {
    constructor(datas=new Set(), directAssignment=false) {
        this.datas = datas;
        this.directAssignment = directAssignment;
    }
    setIsDirectAssignment(directAssignment) {
        this.directAssignment = directAssignment;
        return this;
    }
    isDirectAssignment() {
        return this.directAssignment;
    }
    addData(data /** DataInfo */) {
        this.directAssignment = false;
        this.datas.add(data);
    }
    isTaintedBy(candidate) {
        if (candidate instanceof Candidate) {
            if (candidate.datainfo instanceof DataInfo) {
                for (const data of candidate.dataInfo.datas) {
                    if (!this.datas.has(data)) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }
    union(dataInfo) {
        if (dataInfo instanceof DataInfo)
            return new DataInfo(this.datas.union(dataInfo.datas), this.directAssignment && dataInfo.directAssignment);
        return this.clone();
    }
    clone() {
        return new DataInfo(new Set(this.datas), this.directAssignment);
    }
}

class ReferenceInfo {
    constructor(properties=new Map(), references=new Set(), directAssignment=false) {
        this.properties = properties;
        this.references = references;
        this.directAssignment = directAssignment;
    }
    setIsDirectAssignment(directAssignment) {
        this.directAssignment = directAssignment
        return this;
    }
    isDirectAssignment() {
        return this.directAssignment;
    }
    addProperty(property, value) {
        this.directAssignment = false;
        this.properties.set(property, value);
    }
    getProperty(property) {
        if (!this.properties.has(property))
            return null;
        return this.properties.get(property);
    }
    addReference(reference) {
        this.references.add(reference);
    }
    isTaintedBy(candidate) {
        if (candidate instanceof Candidate) {
            if (candidate.referenceInfo instanceof ReferenceInfo) {
                let flag = true;
                for (const reference of candidate.referenceInfo.references) {
                    if (!this.references.has(reference)) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    return true;
                }
            }
            for (const property of this.properties.values()) {
                if (property.isTaintedBy(candidate)) {
                    return true;
                }
            }
        }
        return false;
    }
    union(referenceInfo) {
        if (referenceInfo instanceof ReferenceInfo) {
            let properties = new Map();
            for (const [property, value] of this.properties.entries()) {
                properties.set(property, value.union(referenceInfo.properties[property]));
            }
            for (const [property, value] of referenceInfo.properties.entries()) {
                if (!properties.has(property)) {
                    properties.set(property, value.clone());
                }
            }
            return new ReferenceInfo(properties, this.references.union(referenceInfo.references), this.directAssignment && referenceInfo.directAssignment);
        }
        return this;
    }
}

class Candidate {
    constructor(dataInfo, referenceInfo) {
        this.dataInfo = dataInfo;
        this.referenceInfo = referenceInfo;
    }
    setIsDirectAssignment(isDataInfoDirectAssignment, isReferenceInfoDirectAssignment) {
        if (this.dataInfo instanceof DataInfo && typeof isDataInfoDirectAssignment === "boolean") {
            this.dataInfo.setIsDirectAssignment(isDataInfoDirectAssignment);
        }
        if (this.referenceInfo instanceof ReferenceInfo && typeof isReferenceInfoDirectAssignment === "boolean") {
            this.referenceInfo.setIsDirectAssignment(isReferenceInfoDirectAssignment);
        }
        return this;
    }
    union(candidate) {
        if (candidate instanceof Candidate) {
            return new Candidate(
                (this.dataInfo instanceof DataInfo) ? this.dataInfo.union(candidate.dataInfo) : candidate.dataInfo,
                (this.referenceInfo instanceof ReferenceInfo) ? this.referenceInfo.union(candidate.referenceInfo) : candidate.referenceInfo
            );
        }
        return this.clone();
    }
    isTaintedBy(candidate) {
        if (this.dataInfo instanceof DataInfo && this.dataInfo.isTaintedBy(candidate)) {
            return true;
        }
        if (this.referenceInfo instanceof ReferenceInfo && this.referenceInfo.isTaintedBy(candidate)) {
            return true;
        }
        return false;
    }
    isSame(candidate) {

    }
    clone() {
        return new Candidate((this.dataInfo instanceof DataInfo) ? this.dataInfo.clone() : this.dataInfo, this.referenceInfo);
    }
}

class TaintAnalysis {
    constructor(engineResult, options={}) {
        this.engineResult = engineResult;
        this.cfgCache = [];
        this.contextCache = new Map();
        this.dominators = new Map();
        this.options = options;

        // Fast cfg search
        for (const cfg of this.engineResult.cfg) {
            this.cfgCache.push(new Set(cfg[2]));
        }
    }

    computeTaintAnalysisContext(cfg, firstContext=new Map(), callback=()=>{}) {
        let rpo = this.getRPO(cfg);
        let contexts = new Map();
        let outerscope_variables = new Map();
        let unknown_variables = new Map();
        let return_candidate = new Candidate();

        for (let i = 0; i < rpo.length; i++) {
            const flowNode = rpo[i];
            const astNode = flowNode.astNode
            let currentContext;
            let allprevcalculated = true;
            if (flowNode.prev.length === 0) {
                currentContext = firstContext;
            }
            else {
                currentContext = firstContext;
                // Combine prev
                let combinePrev = (flowNode) => {
                    let allprevcalculated = true;
                    for (const prevNode of flowNode.prev) {
                        if (contexts.has(prevNode)) {
                            if (contexts.get(prevNode).allprevcalculated === false) {
                                contexts.get(prevNode).allprevcalculated = combinePrev(prevNode);
                            }
                            for (const [variable, data] of contexts.get(prevNode).currentContext) {
                                if (currentContext.has(variable)) {
                                    currentContext.set(variable, currentContext.get(variable).union(data));
                                }
                                else {
                                    currentContext.set(variable, data.clone());
                                }
                            }
                        }
                        else {
                            allprevcalculated = false;
                        }
                    }
                    return allprevcalculated;
                };
                allprevcalculated = combinePrev(flowNode);
            }
            const setValue = (astNode, value, base=undefined) => {
                const node = astNode;
                if (node.type === 'Identifier') {
                    const varinfo = findVariableInfoByIdentifier(node, this.engineResult.variables);
                    currentContext.set(varinfo, value);
                }
                /** 
                 * TODO: Implement Assignment on MemberExpression
                if (node.type === 'MemberExpression') {
                    membernode === astNode;
                    if (base === undefined) {
                        const varinfo = findVariableInfoByIdentifier(node, this.engineResult.variables);
                    }
                }
                */
            };
            const getCandidate = (astNode) => {
                const node = astNode;
                if (contexts.has(node.cfg)) {
                    const tmp = contexts.get(node.cfg).expressionValue;
                    if (tmp instanceof Candidate) {
                        return tmp;
                    }
                }
                
                if (node.type === 'Identifier') {
                    const varinfo = findVariableInfoByIdentifier(node, this.engineResult.variables);
                    if (varinfo === null) {
                        const dataInfo = new DataInfo();
                        dataInfo.addData(node);
                        dataInfo.setIsDirectAssignment(true);
                        const referenceInfo = new ReferenceInfo();
                        referenceInfo.addReference(node);
                        dataInfo.setIsDirectAssignment(true);
                        const candidate = new Candidate(dataInfo, referenceInfo);
                        currentContext.set(varinfo, candidate);
                        unknown_variables.set(node, candidate);
                    }
                    if (!currentContext.has(varinfo)) {
                        const dataInfo = new DataInfo();
                        dataInfo.addData(node);
                        dataInfo.setIsDirectAssignment(true);
                        const referenceInfo = new ReferenceInfo();
                        referenceInfo.addReference(node);
                        dataInfo.setIsDirectAssignment(true);
                        const candidate = new Candidate(dataInfo, referenceInfo);
                        currentContext.set(varinfo, candidate);
                        outerscope_variables.set(varinfo, candidate);
                    }
                    const candidate = currentContext.get(varinfo);
                    return candidate;
                }
                else if (node.type === 'Literal') {
                    // console.log(4);
                    const dataInfo = new DataInfo();
                    dataInfo.addData(node);
                    dataInfo.setIsDirectAssignment(true);
                    const candidate = new Candidate(dataInfo);
                    return candidate;
                }
                else if (astNode.type === 'AssignmentExpression') {
                    if (astNode.operator === '=') {
                        const rightCandidate = getCandidate(astNode.right);
                        // console.log(rightdatainfo);
                        setValue(astNode.left, rightCandidate);
                        return rightCandidate;
                    }
                    else {
                        const rightCandidate = getCandidate(astNode.right);
                        const varinfo = findVariableInfoByIdentifier(astNode.left, this.engineResult.variables);
                        const leftCandidate = getCandidate(astNode.left);
                        const ret = leftCandidate.union(rightCandidate).setIsDirectAssignment(false, false);
                        setValue(astNode.left, ret);
                        return ret;
                    }
                }
                else if (astNode.type === 'BinaryExpression') {
                    const leftCandidate = getCandidate(astNode.left);
                    const rightCandidate = getCandidate(astNode.right);
                    return leftCandidate.union(rightCandidate).setIsDirectAssignment(false, undefined);
                }
                else if (astNode.type === 'ArrayExpression') {
                    const arrayReference = new ReferenceInfo();
                    for (let i = 0; i < astNode.elements.length; i++) {
                        const elementCandidate = getCandidate(astNode.elements[i]);
                        arrayReference.addProperty(i, elementCandidate);
                        arrayReference.setIsDirectAssignment(true);
                    }
                    return (new Candidate(undefined, arrayReference));
                }
                else if (astNode.type === 'MemberExpression') {
                    const objectCandidate = getCandidate(astNode.object);
                    let ret = new Candidate();
                    let found = false;
                    if (objectCandidate.referenceInfo instanceof ReferenceInfo && objectCandidate.referenceInfo.isDirectAssignment()) {
                        if (astNode.computed) {
                            const propertyCandidate = getCandidate(astNode.property);
                            if (propertyCandidate.dataInfo instanceof DataInfo && propertyCandidate.dataInfo.isDirectAssignment()) {
                                for (const propertyNode of propertyCandidate.dataInfo.datas) {
                                    if (propertyNode.type === 'Literal') {
                                        if (objectCandidate.referenceInfo.properties.has(propertyNode.value)) {
                                            ret = ret.union(objectCandidate.referenceInfo.properties.get(propertyNode.value));
                                            found = true;
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            if (astNode.property.type === 'Identifier') {
                                if (objectCandidate.referenceInfo.properties.has(astNode.property.name)) {
                                    ret = ret.union(objectCandidate.referenceInfo.properties.get(astNode.property.name));
                                    found = true;
                                }
                            }
                        }
                    }
                    if (!found && this.options.strongAssumption === true) {
                        ret = ret.union(objectCandidate);
                    }
                    return ret;
                }
                else if (astNode.type === 'VariableDeclaraton') {
                    for (const declarator of astNode.declarations) {
                        getCandidate(declarator);
                    }
                    return null;
                }
                else if (astNode.type === 'FunctionDeclaration') {
                    const referenceInfo = new ReferenceInfo();
                    referenceInfo.addReference(astNode);
                    referenceInfo.setIsDirectAssignment(true);
                    const candidate = new Candidate(undefined, referenceInfo);
                    setValue(astNode.id, candidate);
                }
                else if (astNode.type === 'VariableDeclarator') {
                    // console.log(rightdatainfo);
                    if (astNode.init !== null) {
                        const initCandidate = getCandidate(astNode.init);
                        setValue(astNode.id, initCandidate);
                        return initCandidate;
                    }
                    return null;
                }
                else if (astNode.type === 'FunctionExpression' || astNode.type === 'ArrowFunctionExpression') {
                    const referenceInfo = new ReferenceInfo();
                    referenceInfo.addReference(node);
                    referenceInfo.setIsDirectAssignment(true);
                    const candidate = new Candidate(undefined, referenceInfo);
                    return candidate;
                }
                else if (astNode.type === 'UnaryExpression') {
                    return getCandidate(astNode.argument).setIsDirectAssignment(false);
                }
                else if (astNode.type === 'LogicalExpression') {
                    const leftCandidate = getCandidate(astNode.left);
                    const rightCandidate = getCandidate(astNode.right);
                    return leftCandidate.union(rightCandidate).setIsDirectAssignment(false, false);
                }
                else if (astNode.type === 'ConditionalExpression') {
                    const consequentCandidate = getCandidate(astNode.consequent);
                    const alternateCandidate = getCandidate(astNode.alternate);
                    return consequentCandidate.union(alternateCandidate);
                }
                else if (astNode.type === 'ClassExpression') {
                    const referenceInfo = new ReferenceInfo();
                    referenceInfo.addReference(node);
                    referenceInfo.setIsDirectAssignment(true);
                    const candidate = new Candidate(undefined, referenceInfo);
                    return candidate;
                }
                else if (astNode.type === 'ObjectExpression') {
                    const referenceInfo = new ReferenceInfo();
                    for (const property of astNode.properties) {
                        if (property.kind === 'init') {
                            if (property.computed === false) {
                                const key = property.key;
                                if (key.type === 'Identifier') {
                                    referenceInfo.addProperty(key.name, getCandidate(property.value));
                                }
                                else {
                                    referenceInfo.addProperty(null, getCandidate(property.value));
                                }
                            }
                        }
                    }
                    referenceInfo.setIsDirectAssignment(true);
                    return new Candidate(undefined, referenceInfo);
                }
                else if (astNode.type === 'CallExpression') {
                    const calleeCandidate = getCandidate(astNode.callee);
                    let found = false;
                    let ret = new Candidate();
                    if (calleeCandidate.referenceInfo instanceof ReferenceInfo) {
                        const refInfo = calleeCandidate.referenceInfo;
                        if (refInfo.isDirectAssignment()) {
                            const callarguments = [];
                            for (const argument of astNode.arguments) {
                                if (argument.type !== 'SpreadElement') {
                                    callarguments.push(getCandidate(argument));
                                }
                            }
                            for (const reference of refInfo.references) {
                                if (['FunctionDeclaration', 'FunctionExpression', 'ArrayFunctionExpression'].includes(reference.type)) {
                                    const cfg = findCFGByEntryASTNode(reference, this.engineResult.cfg);
                                    if (cfg !== null) {
                                        const context = currentContext;
                                        for (let i = 0; i < reference.params.length; i++) {
                                            if (reference.params[i].type === 'Identifier') {
                                                const paramInfo = findVariableInfoByIdentifier(reference.params[i], this.engineResult.variables);
                                                if (i < callarguments.length) {
                                                    context.set(paramInfo, callarguments[i]);
                                                }
                                            }
                                        }
                                        ret = ret.union(this.computeTaintAnalysisContext(cfg, context, callback).return_candidate);
                                        found = true;
                                    }
                                }
                            }
                        }
                        if (!found) {
                            // Simple assumtion -> tainted
                            for (const argument of astNode.arguments) {
                                if (argument.type !== 'SpreadElement') {
                                    ret.union(getCandidate(argument));
                                }
                            }
                            ret.setIsDirectAssignment(false);
                        }
                        return ret;
                        
                    }
                }
                else if (astNode.type === 'ReturnStatement') {
                    return_candidate = return_candidate.union(getCandidate(astNode.argument));
                }
                return new Candidate(undefined, undefined);
            }
            
            contexts.set(flowNode, {
                currentContext: currentContext,
                expressionValue: getCandidate(astNode),
                allprevcalculated: allprevcalculated
            });
            callback(flowNode, contexts);
        }
        return {
            contexts,
            outerscope_variables,
            unknown_variables,
            return_candidate
        };
    }

    getDominator(cfg) {
        let dominator;
        if (this.dominators.has(cfg[0]))
            dominator = this.dominators.get(cfg[0]);
        else {
            dominator = new Dominator(cfg);
            dominator.compute();
            this.dominators.set(cfg[0], cfg);
        }
        return dominator;
    }

    getRPO(cfg) {
        let po = [];
        let visited = new Set();
        let dominator = this.getDominator(cfg);
        let traverse = function(node) {
            visited.add(node);
            let latetraverse = new Set();
            for (const prevNode of node.prev) {
                if (!visited.has(prevNode)) {
                    const nextList = ['normal', 'true', 'false'].reverse();
                    for (const next of nextList) {
                        const nextNode = node[next];
                        if (nextNode !== undefined && !visited.has(nextNode) && dominator.dominates(nextNode, prevNode)) {
                            latetraverse.add(nextNode);
                            break;
                        }
                    }
                }
            }
            const nextList = ['normal', 'true', 'false'].reverse();
            for (const next of nextList) {
                const nextNode = node[next];
                if (nextNode !== undefined && !visited.has(nextNode) && !latetraverse.has(nextNode)) {
                    traverse(nextNode);
                }
            }
            // latetraverse
            for (const late of latetraverse) {
                traverse(late);
            }
            po.push(node);
        }
        traverse(cfg[0]);
        return po.reverse();
    }

    getCachedContext(cfg) {
        if (this.cache.has(cfg))
            return this.cache.get(cfg);
        return null;
    }
}

function scc(ast, cfg){
    var scc = [];
    var vt = [];
    var rvt = [];
    var visited = [];
    var st = [];
    var nextnode = ['normal', 'true', 'false']; //...exception
    
    var num = 0;
    var visit_ptr = [];
    
    //console.time('make_adjarray');
    for (let i = 0 ; i < cfg.length; i++){
        make_adjarray(cfg[i][2][0]);
    }
    //console.timeEnd('make_adjarray');

    function make_adjarray(flownode){
        visited[flownode.id] = true;
        visit_ptr[num] = flownode.id;
        num++;
        for (let i = 0; i < nextnode.length; i++){
            if (flownode.hasOwnProperty(nextnode[i])){ //if next exists
                if (vt[flownode.id]){
                    vt[flownode.id].push(flownode[nextnode[i]].id);
                }
                else{
                    vt[flownode.id] = [];
                    vt[flownode.id].push(flownode[nextnode[i]].id);
                }
                if (rvt[flownode[nextnode[i]].id]){
                    rvt[flownode[nextnode[i]].id].push(flownode.id);
                }
                else {
                    rvt[flownode[nextnode[i]].id] = []
                    rvt[flownode[nextnode[i]].id].push(flownode.id);
                }
                if (visited[flownode[nextnode[i]].id] !== true){
                    make_adjarray(flownode[nextnode[i]]);
                }
            }
        }
    }

    var v = Object.keys(visited).length;
    /*console.time('test');
    for (let i = 0; i < v; i++){
        visit_ptr[i] = Object.keys(visited)[i];
    }
    console.timeEnd('test');
    console.time('test2');
    for (let i = 0; i < v; i++){
        const p = visited[visit_ptr[i]];
    }
    console.timeEnd('test2');*/
    var r = 0;
    /*vt[1].push(4)
    vt[4].push(5)
    vt[5].push(1)
    vt[1].push(6)
    vt[6].push(7)
    vt[2].push(7)
    vt[7].push(3)
    vt[3].push(7)
    vt[7].push(2)
    rvt[4].push(1)
    rvt[5].push(4)
    rvt[1].push(5)
    rvt[6].push(1)
    rvt[7].push(6)
    rvt[7].push(2)
    rvt[3].push(7)
    rvt[7].push(3)
    rvt[2].push(7)*/
    //console.log(vt);
    //console.log(rvt);

    //console.time('dfs');
    for (let i = 0; i < v; i++){
        visited[visit_ptr[i]] = false;
    }
    for (let i = 0; i < v; i++){
        if (visited[visit_ptr[i]]==true) continue;
        dfs(visit_ptr[i]);
    }
    //console.timeEnd('dfs');

    //console.log(st);
    //console.time('reverse dfs');
    for (let i = 1; i <= v; i++){
        visited[visit_ptr[i]] = false;
    }
    while(st.length != 0){
        let here = st[st.length - 1]
        st.pop();
        if (visited[here]==true) continue;
        r+=1;
        func(here, r - 1)
    }
    //console.log(scc);
    //console.timeEnd('reverse dfs');

    function dfs(v){
        visited[v] = true;
        if (vt[v]){
            for (let i of vt[v]){
                if (visited[i]==true) continue;
                dfs(i);
            }
        }
        st.push(v);
    }
    function func(v, c){
        visited[v] = true;
        if (scc[c]){
            scc[c].push(v);
        }
        else{
            scc[c] = [];
            scc[c].push(v);
        }
        if (rvt[v]){
            for (let i of rvt[v]){
                if (visited[i]==true) continue;
                func(i, c);
            }
        }
    }
    var result = {};
    result.scc = scc;
    result.vt = vt;
    result.visited = visited;
    result.v = v;
    result.visit_ptr = visit_ptr;
    return result;
}

module.exports = {
    scc: scc,
    traverseAST: traverseAST,
    traverseCFG: traverseCFG,
    findFunctionInfoByCallExpression: findFunctionInfoByCallExpression,
    findCFGByEntryASTNode: findCFGByEntryASTNode,
    checkASTPattern: checkASTPattern,
    Dominator: Dominator,
    TaintAnalysis: TaintAnalysis,
    sliceSource: sliceSource
}