/* eslint-disable global-require */
/* eslint-disable no-console */
const esprima = require('esprima');
const walkes = require('walkes');
const esgraph = require('esgraph');
const util = require('util');
const { staticEngine } = require('../engine');

function analyze(code, options) {
  if(require.cache[require.resolve('esgraph')]) {
    delete require.cache[require.resolve('esgraph')];
  }
  
  let text = '';
  let infotext = ''
  try {
    const fullAst = esprima.parse(code, { range: true });
    const astinfo = (new staticEngine(code, {customlog: (...a) => { a.forEach((b)=>{
      if(typeof b === 'string')
        infotext += b;
      else
        infotext += util.inspect(b);
      infotext += ' ';
    }); infotext += '\n' }})).analyze();
    
    const cfgs = esgraph(fullAst);
    text += 'digraph cfg {';
    text += 'node [shape="box"]';
    const dotOptions = { counter: 0, source: code };
    cfgs.forEach((cfg, i) => {
      let label = '[[main]]';
      console.log(cfg);
      const ast = cfg[0].astNode;
      if (ast.type.includes('Function')) {
        const name = (ast.id && ast.id.name) || '';
        const params = ast.params.map(p => p.name);
        label = `function ${name}(${params})`;
      }

      text += `subgraph cluster_${i}{`;
      text += `label = "${label}"`;
      text += esgraph.dot(cfg, dotOptions);
      text += '}';
    });
    text += '}';
    console.log('wow');
    a = JSON.stringify(astinfo);
    console.log('wow');
    b = JSON.stringify(fullAst);
    console.log('wow');
    return { success: true, info: a, ast: b, cfg: text, infotext: infotext };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message };
  }
}

function findFunctions(ast) {
  const functions = [];
  function handleFunction(node, recurse) {
    functions.push(node);
    recurse(node.body);
  }
  walkes(ast, {
    FunctionDeclaration: handleFunction,
    FunctionExpression: handleFunction,
  });
  return functions;
}
module.exports = analyze;
