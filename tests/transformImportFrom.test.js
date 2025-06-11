// const babel = require("@babel/standalone");
const babel = require("@babel/standalone/babel.min.js");
const parser = babel.packages.parser;
const traverse = babel.packages.traverse.default;
const generate = babel.packages.generator.generate;
const t = babel.packages.types;
const transformImportFrom = require("../src/transformImportFrom");

// 示例使用
const code = `
import * as M2 from 'javascript/menu2.m.js';
import * as M3 from 'javascript/menu2.m.js';
import Mu, { menu as f, uu, aa } from 'javascript/menu.m.js';
import User2 from 'javascript/menu.m.js';

import('javascript/user.m.js').then((module) => {
  console.log(module);
});

const H1 = <h1>hello world</h1>

const nn = 123

export const hhh = 'hhh'

`;
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});
transformImportFrom(ast);
const output = generate(ast).code;
console.log(output);
