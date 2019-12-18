const {
    staticEngine, analyzer
} = require('./engine.js');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.log("node index.js [input file]");
    return;
}

var source = fs.readFileSync(process.argv[2]).toString();
var engine_inst = new staticEngine(source, {debug : false});
var result = engine_inst.analyze();
let dominator = new analyzer.Dominator(result.cfg[0]);
dominator.compute();
// console.log(dotDominator(dominator, { source:source }));
let taintAnalysis = new analyzer.TaintAnalysis(result, { strongAssumption: true });
let { contexts } = taintAnalysis.computeTaintAnalysisContext(result.cfg[0]);
// console.log(contexts);
for (let i = 0; i < result.cfg[0][2].length; i++) {
    // console.log(result.cfg[0].length);
    let context = contexts.get(result.cfg[0][2][i]).currentContext;
    for (var [key, value] of context.entries()) {
        // console.log(key, value);
        if (key === null) {
            console.log(key, '==', value.dataInfo, value.referenceInfo);
        }
        else {
            console.log(key.name, '==', value.dataInfo, value.referenceInfo);
        }
    }
    console.log('allprevcalculated', contexts.get(result.cfg[0][2][i]).allprevcalculated);
    console.log('=======================================');
}
for (var [key, value] of contexts.get(result.cfg[0][1]).currentContext.entries()) {
    // console.log(key, value);
    if (key === null) {
        console.log(key, '==', value.dataInfo, value.referenceInfo);
    }
    else {
        console.log(key.name, '==', value.dataInfo, value.referenceInfo);
    }
}

function dotDominator(dominator, options) {
    // console.log(dominator);
    const { counter = 0, source } = options;
    const output = [];
    const nodes = dominator.nodes;
    output.push('digraph cfg {');
    output.push('node [shape="box"]');
    output.push(`subgraph cluster_0{`);

    for (const [i, node] of nodes.entries()) {
        if (i === 0) continue;
        let { label = node.type } = node;
        if (!label && source && node.astNode.range) {
            const ast = node.astNode;
            let { range } = ast;
            let add = '';

            // special case some statements to get them properly printed
            if (ast.type === 'SwitchCase') {
            if (ast.test) {
                range = [range[0], ast.test.range[1]];
                add = ':';
            } else {
                range = [range[0], range[0]];
                add = 'default:';
            }
            } else if (ast.type === 'ForInStatement') {
            range = [range[0], ast.right.range[1]];
            add = ')';
            } else if (ast.type === 'CatchClause') {
            range = [range[0], ast.param.range[1]];
            add = ')';
            }

            label =
            source
                .slice(range[0], range[1])
                .replace(/\n/g, '\\n')
                .replace(/\t/g, '    ')
                .replace(/"/g, '\\"') + add;
        }

        if (!label && node.astNode) {
            label = node.astNode.type;
        }

        output.push(`n${counter + i} [label="${label}"`);

        if (['entry', 'exit'].includes(node.type)) output.push(', style="rounded"');

        output.push(']\n');
    }
    // console.log(dominator.dom);
    for (const [i, j] of dominator.dom.entries()) {
        if (i === 0 || j === 0) continue;
        output.push(`n${counter + j} -> n${counter + i} [`);
        output.push(']\n');
    }
    output.push("}");
    output.push("}");
    return output.join('');
}