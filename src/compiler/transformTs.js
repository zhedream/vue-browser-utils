// const babel = require("@babel/standalone");
const babel = require("@babel/standalone/babel.min.js");

// 在 @babel/standalone 中，typescript 预设是内置的，可以直接使用字符串 "typescript"
module.exports = function(code) {
  return babel.transform(code, {
    presets: ["typescript"],
    filename: "input.ts",
  }).code;
}