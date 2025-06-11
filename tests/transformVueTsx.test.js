const transformVueTsx = require("../src/transformVueTsx");

console.log(transformVueTsx(
`
const anExampleVariable = "Hello World"
console.log(anExampleVariable)

export const a:number = 1;

const aa = <h1></h1>

export const b = function(h){
const props = {class: 'test2'}
 return  (<h1 class="test" {...props}></h1>)
}
`))