// const babel = require("@babel/standalone");
const babel = require("@babel/standalone/babel.min.js");

const VueBabelPresetJsx = require("@vue/babel-preset-jsx");
const transformImportExportPlugin = require("./transformImportExportPlugin");

module.exports = function (code) {
  return babel.transform(code, {
    presets: [
      [
        VueBabelPresetJsx,
        {
          vModel: false,
          compositionAPI: 'native',
        },
      ],
      'typescript'
    ],
    plugins: [transformImportExportPlugin],
    filename: "input.tsx",
  }).code;
};