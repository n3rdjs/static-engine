/* eslint-disable global-require */
/* eslint-disable no-console */
const esprima = require('esprima');
const walkes = require('walkes');
const esgraph = require('esgraph');
const { staticEngine } = require('../engine');

function analyze(code, options) {
  if(require.cache[require.resolve('esgraph')]) {
    delete require.cache[require.resolve('esgraph')];
  }
  
  let text = '';
  let infotext = ''
  try {
    const fullAst = esprima.parse(code, { range: true });
    const astinfo = (new staticEngine(code, {customlog: (...a) => { a.forEach((b)=>{infotext += b;}); infotext += '\n' }})).analyze();
    const functions = findFunctions(fullAst);

    text += 'digraph cfg {';
    text += 'node [shape="box"]';
    const dotOptions = { counter: 0, source: code };
    functions.concat(fullAst).forEach((ast, i) => {
      let cfg;
      let label = '[[main]]';
      if (ast.type.includes('Function')) {
        cfg = esgraph(ast.body);
        const name = (ast.id && ast.id.name) || '';
        const params = ast.params.map(p => p.name);
        label = `function ${name}(${params})`;
      } else {
        cfg = esgraph(ast);
      }

      text += `subgraph cluster_${i}{`;
      text += `label = "${label}"`;
      text += esgraph.dot(cfg, dotOptions);
      text += '}';
    });
    text += '}';
    return { success: true, info: JSON.stringify(astinfo), ast: JSON.stringify(fullAst), cfg: text, infotext: infotext };
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
