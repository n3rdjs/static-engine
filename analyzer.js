function traverseAST(node, func) {
	func(node);
	for (let key in node) {
        if(node.hasOwnProperty(key)) {
            let child = node[key];
            if (typeof child === 'object' && child !== null) {
                if (Array.isArray(child)) {
                    child.forEach(function (node) {
                        traverseAST(node, func);
                    });
                }
                else {
                    traverseAST(child, func);
                }
            }
        }
    }
}


function traverseCFG(node, options, func) {
    func(node);
    const nextList = ['normal', 'true', 'false', 'exception'];
    for(const next of nextList) {
        const nextNode = node[next];
        if (nextNode !== undefined) {
            traverseCFG(nextNode, options, func);
        }
    }
}

function isInScope(parentScope, childScope) {
    if (parentScope[0] <= childScope[0] && childScope[1] <= parentScope[1])
        return true;
    return false;
}

function findCallExpressionReference(context, node) {
    console.log(node.callee.type);
    for (const func of context.function) {
        if (node.callee.type === 'Identifier') {
            console.log(func.name);
            if (func.name === node.callee.name && isInScope(func.scope, node.callee.range)) {
                console.log(func.name);
                return func;
            }
        }
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
    return scc;
}
module.exports = {
    scc: scc,
    traverseAST: traverseAST,
    traverseCFG: traverseCFG,
    findCallExpressionReference: findCallExpressionReference,
}