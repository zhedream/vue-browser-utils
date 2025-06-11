// const babel = require("@babel/standalone");
const babel = require("@babel/standalone/babel.min.js");
const parser = babel.packages.parser;
const traverse = babel.packages.traverse.default;
const generate = babel.packages.generator.generate;
const t = babel.packages.types;
const transformExportFrom = require("../src/transformExportFrom");
const code = `
export {menu as ff,uua} from 'javascript/menu2.m.js';
export * as M2 from 'javascript/user.m.js';
export class Button { }
export function User() { }
export const PI = 3.1415;
export let title = 'hello world'
export var text = 'hello world'

export default class  {}

let UU,Aa

export {UU, Aa}
`;
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});
transformExportFrom(ast);
const output = generate(ast).code;
console.log(output);
module.exports = transformExportFrom;
