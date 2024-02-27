const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");

const transformExportFrom = require("./transformExportFrom");
const transformImportFrom = require("./transformImportFrom");

// let code = `

// import * as M2 from 'javascript/menu2.m.js';

// import * as M3 from 'javascript/menu2.m.js';

// import Mu , {menu as f,uu,aa} from 'javascript/menu.m.js';

// import User2  from 'javascript/menu.m.js';

// export default {
//   a: 1,
// }

// export class Button { }

// let ccc = 1;

// export {uu,aa ,ccc,User2}

// `;

// let nextCode = transformCodeToExposeModule(code);
// console.log(nextCode);

function transformCodeToExposeModule(code) {
  // 1. 生成 AST
  const ast = parser.parse(code, { sourceType: "module" });


  // 2. 处理导出的标识符
  transformExportFrom(ast);

  // 3. 处理导入的标识符
  transformImportFrom(ast);

  // 7. 生成新的代码 newCode
  const newCode = generator(ast).code;

  // 8. 打印 exportNames 和 newCode
  // console.log("Export Names:", exportNames);
  // console.log("\nNew Code:\n", newCode);
  return newCode;
}

function transformExport(ast) {
  const exportNames = [];
  let defaultExportValue = null;
  traverse(ast, {
    ExportNamedDeclaration(path) {
      // 3. 将标识符保存到数组 exportNames 中
      path.node.specifiers.forEach((specifier) => {
        if (t.isExportSpecifier(specifier)) {
          exportNames.push(specifier.exported.name);
        }
      });

      // 如果有声明，提取声明的标识符
      if (path.node.declaration) {
        if (t.isFunctionDeclaration(path.node.declaration)) {
          exportNames.push(path.node.declaration.id.name);
        } else if (t.isVariableDeclaration(path.node.declaration)) {
          path.node.declaration.declarations.forEach((declaration) => {
            exportNames.push(declaration.id.name);
          });
        }
      }

      // 4. 去除 export 关键字
      path.replaceWith(path.node.declaration);
    },
    ExportDefaultDeclaration(path) {
      // 8.1. 将 default 作为属性名添加到 exportNames 中
      exportNames.push("default");

      // 8.2. 获取 export default 的值，并处理 ClassDeclaration 和 FunctionDeclaration
      defaultExportValue = path.node.declaration;
      if (t.isClassDeclaration(defaultExportValue)) {
        defaultExportValue = t.toExpression(defaultExportValue);
      } else if (t.isFunctionDeclaration(defaultExportValue)) {
        defaultExportValue = t.functionExpression(
          defaultExportValue.id,
          defaultExportValue.params,
          defaultExportValue.body
        );
      }

      // 8.3. 将原 export default 去除
      path.remove();
    },
    ExportAllDeclaration(path) {
      console.log('path: ', path);

    }
  });

  // 5. 创建 exposeModule 函数调用及其参数
  const objectProperties = exportNames.map((name) => {
    if (name === "default") {
      return t.objectProperty(t.identifier(name), defaultExportValue, false);
    } else {
      return t.objectProperty(
        t.identifier(name),
        t.identifier(name),
        false,
        true
      );
    }
  });

  const exposeModuleFunction = t.arrowFunctionExpression(
    [],
    t.objectExpression(objectProperties)
  );
  const exposeModuleCall = t.expressionStatement(
    t.callExpression(t.identifier("exposeModule"), [exposeModuleFunction])
  );

  // 6. 将 exposeModule 函数调用添加到 AST 中
  ast.program.body.push(exposeModuleCall);
}

function transformImport(ast) {
  traverse(ast, {
    ImportDeclaration(path) {
      const importSource = path.node.source.value;
      const defaultSpecifier = path.node.specifiers.find((specifier) =>
        t.isImportDefaultSpecifier(specifier)
      );
      const namedSpecifiers = path.node.specifiers.filter((specifier) =>
        t.isImportSpecifier(specifier)
      );
      const namespaceSpecifier = path.node.specifiers.find((specifier) =>
        t.isImportNamespaceSpecifier(specifier)
      );

      const tempIdentifier = path.scope.generateUidIdentifierBasedOnNode(
        t.identifier(importSource)
      );

      tempIdentifier.name = `_${tempIdentifier.name}` + Math.random().toString(16).slice(2, 8);

      const importBinding = t.variableDeclarator(
        tempIdentifier,
        t.awaitExpression(
          t.callExpression(t.identifier("loadModule"), [
            t.stringLiteral(importSource),
          ])
        )
      );

      const defaultBinding = defaultSpecifier
        ? t.variableDeclarator(
          defaultSpecifier.local,
          t.memberExpression(tempIdentifier, t.identifier("default"))
        )
        : null;

      const namedBindings = namedSpecifiers.length
        ? t.variableDeclarator(
          t.objectPattern(
            namedSpecifiers.map((specifier) =>
              t.objectProperty(specifier.imported, specifier.local)
            )
          ),
          tempIdentifier
        )
        : null;

      const namespaceBinding = namespaceSpecifier
        ? t.variableDeclarator(
          namespaceSpecifier.local,
          t.awaitExpression(
            t.callExpression(t.identifier("loadModule"), [
              t.stringLiteral(importSource),
            ])
          )
        )
        : null;

      const variableDeclarations = [
        importBinding,
        ...(defaultBinding ? [defaultBinding] : []),
        ...(namedBindings ? [namedBindings] : []),
        ...(namespaceBinding ? [namespaceBinding] : []),
      ];

      if (variableDeclarations.length) {
        path.replaceWithMultiple(
          variableDeclarations.map((declarator) =>
            t.variableDeclaration("const", [declarator])
          )
        );
      } else {
        path.remove();
      }
    },

    // ExportNamedDeclaration(path) {
    //   if (path.node.declaration) {
    //     path.replaceWith(path.node.declaration);
    //   }
    // },
  });
}

transformCodeToExposeModule.transformExport = transformExport;
transformCodeToExposeModule.transformImport = transformImport;

transformCodeToExposeModule.parse = parser.parse;
transformCodeToExposeModule.generator = generator;

module.exports = transformCodeToExposeModule;
