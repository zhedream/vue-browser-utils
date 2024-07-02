const babel = require("@babel/standalone");

const BabelPresetTypescript = require("babel-preset-typescript");


// var output = babel.transform(
//   `
// const anExampleVariable = "Hello World"
// console.log(anExampleVariable)

// export const a:number = 1;

// export const b = function(){
//  return  123
// }
// `,
//   {
//     presets: [BabelPresetTypescript],
//   }
// );

// console.log("output: ", output.code);

module.exports = function(code) {
  return babel.transform(code, {
    presets: [BabelPresetTypescript],
  }).code;
}


// npm install --save-dev @babel/core @babel/cli @babel/preset-env babel-preset-typescript babel-plugin-transform-vue-jsx babel-plugin-syntax-jsx
// npx babel .\test.tsx  --out-file .\test.js  --presets babel-preset-typescript --plugins babel-plugin-transform-vue-jsx