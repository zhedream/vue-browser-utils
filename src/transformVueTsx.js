const babel = require("@babel/standalone");

const BabelPluginTransformVueJsx = require("babel-plugin-transform-vue-jsx");

// const BabelPresetEnv = require("babel-preset-env");
const BabelPresetTypescript = require("babel-preset-typescript");
// const babel_helper_vue_jsx_merge_props = require("babel-helper-vue-jsx-merge-props");

// babel.registerPlugin("babel-plugin-transform-vue-jsx", require("babel-plugin-transform-vue-jsx")["default"]);

// var output = babel.transform(
//   `
// import {h} from 'vue';h;

// const anExampleVariable = "Hello World"
// console.log(anExampleVariable)

// export const a:number = 1;

// export const b = function(){
//  return  (<h1></h1>)
// }
// `,
//   {
//     presets: [BabelPresetTypescript],
//     plugins: [BabelPluginTransformVueJsx],
//   }
// );

// console.log("output: ", output.code);

module.exports = function (code) {
  return babel.transform(code, {
    presets: [BabelPresetTypescript],
    plugins: [BabelPluginTransformVueJsx],
  }).code;
};

// npm install --save-dev @babel/core @babel/cli @babel/preset-env babel-preset-typescript babel-plugin-transform-vue-jsx babel-plugin-syntax-jsx
// npx babel .\test.tsx  --out-file .\test.js  --presets babel-preset-typescript --plugins babel-plugin-transform-vue-jsx
