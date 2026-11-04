const babel = require("@babel/standalone/babel.min.js");

const parser = babel.packages.parser;
const traverse = babel.packages.traverse.default;
const generator = babel.packages.generator.default;
const t = babel.packages.types;

const transformVueTsx = require("./transformVueTsx");
const transformTs = require("./transformTs");



function transformCodeToExposeModule(code) {
  // 1. 生成 AST
  const ast = parser.parse(code, { sourceType: "module", plugins: ['jsx', 'typescript'] });

  // 2. 处理导入的标识符
  transformImportFrom(ast);

  // 3. 处理导出的标识符
  transformExportFrom(ast);

  // 7. 生成新的代码 newCode
  const newCode = generator(ast).code;

  // 8. 打印 exportNames 和 newCode
  // console.log("Export Names:", exportNames);
  // console.log("\nNew Code:\n", newCode);
  return newCode;
}

const transformImportFrom = require("./transformImportFrom");
const transformExportFrom = require("./transformExportFrom");

transformCodeToExposeModule.transformExport = transformExportFrom;
transformCodeToExposeModule.transformImport = transformImportFrom;

transformCodeToExposeModule.babel = babel;
transformCodeToExposeModule.parse = parser.parse;
transformCodeToExposeModule.generator = generator;
transformCodeToExposeModule.traverse = traverse;
transformCodeToExposeModule.t = t;

// 处理 ts jsx tsx (vue2版本)
transformCodeToExposeModule.transformVueTsx = transformVueTsx;
transformCodeToExposeModule.transformTs = transformTs;

module.exports = transformCodeToExposeModule;
