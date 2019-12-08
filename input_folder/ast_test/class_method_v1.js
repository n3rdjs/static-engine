/* class parameter(this), method */
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