const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');



function transformExportFrom(ast) {

  const exportProperties = [];

  traverse(ast, {
    ExportNamedDeclaration(path) {
      // export xx from 'xx' 使用
      const { source, specifiers } = path.node;
      // export const  class function 声明使用
      const { declaration } = path.node;
      if (source) {
        // 生成唯一标识符
        const hash = Math.random().toString(36).substring(2, 15);
        const moduleName = `_${source.value.replace(/[^\w]/gi, '')}_${hash}`;

        // 创建异步加载模块的声明
        const loadModuleCall = t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier(moduleName),
            t.awaitExpression(t.callExpression(t.identifier("loadModule"), [t.stringLiteral(source.value)]))
          )
        ]);

        // 将原始导出语句替换为注释
        path.insertBefore(loadModuleCall);
        path.replaceWith(t.expressionStatement(t.stringLiteral('// ' + generate(path.node).code)));
        // path.remove();

        specifiers.forEach(specifier => {
          if (t.isExportNamespaceSpecifier(specifier)) {
            // 特别处理 export * as Name 的情况
            const namespaceImport = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(specifier.exported.name),
                t.identifier(moduleName) // 直接引用加载的模块
              )
            ]);
            // path.insertAfter(namespaceImport);

            // 添加到 exportProperties，以便在最后统一创建 exposeModule 调用
            const property = t.objectProperty(
              t.identifier(specifier.exported.name),
              t.identifier(moduleName),
              false,
              true
            );
            exportProperties.push(property);
          } else if (t.isExportSpecifier(specifier)) {
            // 处理普通的导出指定符
            const transformedSpecifier = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(specifier.exported.name),
                t.memberExpression(t.identifier(moduleName), t.identifier(specifier.local.name))
              )
            ]);
            path.insertAfter(transformedSpecifier);

            // 非 default 导出添加到 exportProperties
            if (specifier.exported.name !== 'default') {
              const property = t.objectProperty(
                t.identifier(specifier.exported.name),
                t.memberExpression(t.identifier(moduleName), t.identifier(specifier.local.name), false)
              );
              exportProperties.push(property);
            }
          }
        });
      } else if (specifiers.length) {
        // 处理 export {UU, Aa} 的情况
        specifiers.forEach(specifier => {
          if (t.isExportSpecifier(specifier)) {
            const localName = specifier.local.name;
            const exportedName = specifier.exported.name;
            const property = t.objectProperty(
              t.identifier(exportedName),
              t.identifier(localName),
              false,
              localName === exportedName // 使用简写形式当本地名和导出名相同时
            );
            exportProperties.push(property);
          }
        });
        // const { node } = path;
        // const originalCode = generate(path.node, { compact: true }).code;
        // // 添加多行注释
        // node.leadingComments = node.leadingComments || [];
        // node.leadingComments.push({
        //   type: "CommentLine", // 对于多行注释使用 CommentBlock CommentLine
        //   value: ` ${originalCode}\n `
        // });
        // // 移除原节点内容，只保留注释
        // path.replaceWith(t.emptyStatement());
        path.remove();

      }


      if (declaration) {

        if (declaration.type === 'VariableDeclaration') {
          // 处理变量声明
          declaration.declarations.forEach(declaration => {
            if (declaration.id.name) {
              const property = t.objectProperty(
                t.identifier(declaration.id.name),
                t.identifier(declaration.id.name),
                false,
                true
              );
              exportProperties.push(property);
            }
          });
          // 仅保留声明，移除export关键字
          path.replaceWith(declaration);
        } else if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
          // 处理函数和类声明
          const { id } = declaration;
          if (id && id.name) {
            const property = t.objectProperty(
              t.identifier(id.name),
              t.identifier(id.name),
              false,
              true
            );
            exportProperties.push(property);
          }
          // 仅保留声明，移除export关键字
          path.replaceWith(declaration);
        }

      }

    },
    ExportDefaultDeclaration(path) {
      const { declaration } = path.node;

      // 情况1: 有名字的函数或类
      if (declaration.id && (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration')) {
        const propertyName = declaration.id.name; // 获取函数或类的名称
        const property = t.objectProperty(
          t.identifier('default'), // 使用"default"作为属性名
          t.identifier(propertyName),
          false,
          true
        );
        exportProperties.push(property);
        // 仅保留声明，移除export default
        path.replaceWith(declaration);
      } else {
        // 情况2: 匿名函数、类或其他表达式
        const anonymousFuncOrClassExpr = t.isFunctionDeclaration(declaration) || t.isClassDeclaration(declaration) ?
          t.toExpression(declaration) : declaration;

        const property = t.objectProperty(
          t.identifier('default'),
          anonymousFuncOrClassExpr,
          false,
          false
        );
        exportProperties.push(property);
        // 移除该节点，因为我们会在最后统一处理exposeModule调用
        path.remove();
      }
    }
  });


  // 创建 exposeModule 调用
  if (exportProperties.length) {
    const exposeModuleCall = t.expressionStatement(
      t.callExpression(t.identifier("exposeModule"), [
        t.arrowFunctionExpression([], t.objectExpression(exportProperties))
      ])
    );

    ast.program.body.push(exposeModuleCall);
  }

}

// 示例使用
// const code = `
// export {menu as ff,uua} from 'javascript/menu2.m.js';
// export * as M2 from 'javascript/user.m.js';
// export class Button { }
// export function User() { }
// export const PI = 3.1415;
// export let title = 'hello world'
// export var text = 'hello world'

// export default class  {}

// let UU,Aa

// export {UU, Aa}
// `;

// const ast = parser.parse(code, { sourceType: 'module' });

// transformExportFrom(ast);
// const output = generate(ast).code;
// console.log(output);

module.exports = transformExportFrom;