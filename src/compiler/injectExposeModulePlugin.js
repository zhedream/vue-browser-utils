const injectExposeModule = require("./injectExposeModule");

// Babel 7 插件格式
module.exports = function injectExposeModulePlugin(babel, options = {}) {
  return {
    name: "inject-expose-module-plugin",
    visitor: {
      Program: {
        exit(path) {
          // 获取完整的 AST，包含 program
          const ast = {
            type: 'File',
            program: path.node
          };
          
          // 注入 exposeModule 包装代码，传递选项
          injectExposeModule(ast, options);
        }
      }
    }
  };
};
