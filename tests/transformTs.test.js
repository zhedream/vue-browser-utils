const transformTs = require("../src/transformTs");

console.log(transformTs(`
const anExampleVariable = "Hello World"
console.log(anExampleVariable)
import  { Bye, type ByeType } from "b";
import type { ItemType } from "./a";
export const a:ItemType = 1;
const bbb = Bye()

export { type CType } from "c";
export type { BType } from "b";

export type Ntype = number;

export const b = function(){
 return  123
}
`)) 