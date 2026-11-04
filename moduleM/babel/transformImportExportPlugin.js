const transformImportFrom = require("./transformImportFrom");
const transformExportFrom = require("./transformExportFrom");

// Babel 7 插件格式
module.exports = function transformImportExportPlugin(babel) {
  return {
    name: "transform-import-export-plugin",
    visitor: {
      Program: {
        exit(path) {
          // 获取完整的 AST，包含 program
          const ast = {
            type: 'File',
            program: path.node
          };
          
          // 先处理 import 语句
          transformImportFrom(ast);
          
          // 再处理 export 语句
          transformExportFrom(ast);
        }
      }
    }
  };
};