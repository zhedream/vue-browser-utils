const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

function transformImportFrom(ast) {
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value; // 获取模块路径
      const specifiers = path.node.specifiers; // 获取所有导入的标识符
      const importStatements = []; // 用于存放转换后的声明

      // 生成一个基于模块路径的唯一标识符
      const hash = Math.random().toString(36).substring(2, 10);
      const moduleName = `__${source.replace(/[^\w]/gi, '')}${hash}`;

      // 创建 await loadModule() 调用表达式
      const loadModuleCall = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier(moduleName),
          t.awaitExpression(t.callExpression(t.identifier("loadModule"), [t.stringLiteral(source)]))
        )
      ]);

      importStatements.push(loadModuleCall);

      specifiers.forEach(specifier => {
        if (t.isImportNamespaceSpecifier(specifier)) {
          // 处理 import * as name
          const namespaceImport = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(specifier.local.name),
              t.identifier(moduleName)
            )
          ]);
          importStatements.push(namespaceImport);
        } else if (t.isImportDefaultSpecifier(specifier)) {
          // 处理默认导入
          const defaultImport = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(specifier.local.name),
              t.memberExpression(t.identifier(moduleName), t.identifier("default"))
            )
          ]);
          importStatements.push(defaultImport);
        } else if (t.isImportSpecifier(specifier)) {
          // 处理命名导入
          const namedImport = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.objectPattern([
                t.objectProperty(t.identifier(specifier.imported.name), t.identifier(specifier.local.name), false, specifier.imported.name === specifier.local.name)
              ]),
              t.identifier(moduleName)
            )
          ]);
          importStatements.push(namedImport);
        }
      });

      // 替换原有的import声明
      path.replaceWithMultiple(importStatements);
    }
  });
}


// 示例使用
// const code = `
// import * as M2 from 'javascript/menu2.m.js';

// import * as M3 from 'javascript/menu2.m.js';

// import Mu , {menu as f,uu,aa} from 'javascript/menu.m.js';

// import User2  from 'javascript/menu.m.js';
// `;

// const ast = parser.parse(code, { sourceType: 'module' });

// transformImportFrom(ast);

// const output = generate(ast).code;
// console.log(output);

module.exports = transformImportFrom;