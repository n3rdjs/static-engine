const obj = {};
obj.prototype_pollution_statement1=function(node, result_array){
    if(node.type=='ExpressionStatement'){
        if(Object.keys(node).includes('expression')){
            if(node.expression.type=='AssignmentExpression'){
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='Identifier' && node.expression.right.type=='MemberExpression'){                        
                        if(Object.keys(node.expression.right).includes('computed')&&Object.keys(node.expression.right).includes('object')&&Object.keys(node.expression.right).includes('property')){
                            if(node.expression.right.computed==true && node.expression.right.object.type=='Identifier'&&node.expression.right.property.type=='Identifier'){
                                if(node.expression.left.name==node.expression.right.object.name){
                                    if (node.expression.cfg){
                                        result_array.push(node)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
obj.prototype_pollution_statement2 = function(node, result_array) {
    if(node.type=='ExpressionStatement'){
        if(Object.keys(node).includes('expression')){
            if(node.expression.type=='AssignmentExpression'){
                if(Object.keys(node.expression).includes('operator')&&Object.keys(node.expression).includes('left')&&Object.keys(node.expression).includes('right')){
                    if(node.expression.operator=='=' && node.expression.left.type=='MemberExpression' && node.expression.right.type=='Identifier'){                        
                        if(Object.keys(node.expression.left).includes('computed')&&Object.keys(node.expression.left).includes('object')&&Object.keys(node.expression.left).includes('property')){
                            if(node.expression.left.computed==true && node.expression.left.object.type=='Identifier'&&node.expression.left.property.type=='Identifier'){
                                if (node.expression.cfg){
                                    result_array.push(node)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
module.exports = obj;
