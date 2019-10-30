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

function traverseCFG(node, func) {

}

function scc(ast, cfg, nodenum){
    var scc = [];
    var vt = [];
    var rvt = [];
    var visited = [];
    var st = [];
    var nextnode = ['normal', 'true', 'false']; //...
    for (let i = 0; i < nodenum; i++){
        vt[i] = [];
        rvt[i] = [];
        scc[i] = [];
        visited[i] = false;
    }
    make_adjarray(main);
    //make_adjarray(functions...);

    function make_adjarray(flownode){
        visited[flownode.id] = true;
        for (let i = 0; i < nextnode.length; i++){
            if (flownode.hasOwnProperty(nextnode[i])){ //if next exists
                vt[flownode.id] = flownode.nextnode[i].id;
                rvt[flownode.nextnode[i].id] = flownode.id;
                if (visited[flownode.nextnode[i].id] == false){
                    make_adjarray(flownode.nextnode[i]);
                }
            }
        }
    }

    var v = nodenum;
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
    console.log(vt);
    console.log(rvt);
    for (let i = 1; i <= v; i++){
        if (visited[i]==true) continue;
        dfs(i);
    }
    console.log(st);
    for (let i = 1; i <= v; i++){
        visited[i] = false;
    }
    while(st.length != 0){
        let here = st[st.length - 1]
        st.pop();
        if (visited[here]==true) continue;
        r+=1;
        func(here, r - 1)
    }
    console.log(scc);
    
    function dfs(v){
        visited[v] = true;
        for (let i of vt[v]){
            if (visited[i]==true) continue;
            dfs(i);
        }
        st.push(v);
    }
    function func(v, c){
        visited[v] = true;
        scc[c].push(v);
        for (let i of rvt[v]){
            if (visited[i]==true) continue;
            func(i, c);
        }
    }
    return scc;
}
exports.traverseAST = traverseAST;
exports.scc = scc;