let obj = {a:1, b:2};
let arr = [1, 2];
for (let i = 0; i < 5; i++){
    console.log(i);
}
for (let i in obj){
    console.log(obj[i]);
}
for (let i of arr){
    console.log(i);
}
for (var i = 0; i < 5; i++){
    console.log(i);
}
for (var i in obj){
    console.log(obj[i]);
}
for (var i of arr){
    console.log(i);
}