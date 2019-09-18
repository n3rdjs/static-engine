// GLOBAL SCOPE
var dog = 'Lewis';
function func1(){
  // SCOPE 1
  var cat = 'Jerry';
  var func2 = function(){
    // SCOPE 2
    console.log(cat); // Jerry
    console.log(dog); // Lewis
  }
}