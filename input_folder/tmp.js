function b(){
  {
    a = 1;
  }
}
function c(){
  a = 2;
  var a;
}
function d(a){
  a = 3;
}
function x(a){
  let y = 1 + (function z(){
    a = 1;
    return a;
  })()
}
function ax(b=function (){console.log(1)}) {
	b();
}
a++;
a = -1;
console.log((a=1, a=2, a));