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

exports.traverseAST = traverseAST;