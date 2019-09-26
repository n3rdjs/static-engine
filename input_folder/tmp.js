class Person {
  constructor(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set name(newName) {
    this._name = newName;
  }

  walk() {
    console.log(this._name + ' is walking.');
  }
}
         
class Programmer extends Person { 
  constructor(name, programmingLanguage) {
    super(name);
    this._programmingLanguage = programmingLanguage;
  }

  get programmingLanguage() {
    return this._programmingLanguage;
  }

  set programmingLanguage(newprogrammingLanguage) {
    this._programmingLanguage = newprogrammingLanguage;
  }

  writeCode() {
    console.log(this._name + ' is coding in ' + this._programmingLanguage + '.');
  }
}
         
let bob = new Person('Bob');
bob.walk();
         
let cory = new Programmer('Cory', 'JavaScript');
cory.walk();
cory.writeCode();
console.log(cory.name);
