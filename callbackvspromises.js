/*function doSomething(cb) {
  cb("hola");
}

doSomething((msg) => {
  console.log("callback:", msg);
});*/

/*
function doSomething() {
  return Promise.resolve("hola");
}

(async () => {
  const msg = await doSomething();
  console.log("await:", msg);
})();
*/

function imprimir(msg) { console.log("callback:", msg); } function doSomething(imprimir) { imprimir("hola"); } doSomething(imprimir);