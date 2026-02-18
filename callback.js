let value = 1;

function cambiarValue() {
  value = 2;
}

function doSomething(cb) {
  cb();
}

doSomething(cambiarValue);

console.log(value); // 2
