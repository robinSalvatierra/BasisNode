/*console.log("A");

setTimeout(() => console.log("B timeout"), 0);

Promise.resolve().then(() => console.log("C promise"));

console.log("D");
const doSomething = (x) => console.log(x);

[1,2,3].forEach(async (x) => {
  await doSomething(x); // NO se espera correctamente
});


for (const x of [1,2,3]) {
  await doSomething(x);
}
// o
await Promise.all([1,2,3].map(doSomething));
*/


console.log("1");
setTimeout(() => console.log("2 timeout"), 0);
Promise.resolve().then(() => console.log("3 promise"));
console.log("4");
