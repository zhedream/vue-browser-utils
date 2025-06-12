const babel = require("@babel/standalone/babel.min.js");

const traverse = babel.packages.traverse.default;
const t = babel.packages.types;

function injectExposeModule(ast, options = {}) {
  // 获取程序的所有语句
  const programBody = ast.program.body;
  
  if (programBody.length === 0) {
    return; // 如果没有代码，直接返回
  }

  // 检查代码中是否包含 await 关键字来决定是否使用异步函数
  let hasAwait = false;
  traverse(ast, {
    AwaitExpression() {
      hasAwait = true;
    }
  });

  // 创建检查代码块
  const checkStatements = [
    // if (!document.currentScript || !document.currentScript.resolve) { throw new Error('...'); }
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.unaryExpression('!', t.memberExpression(t.identifier('document'), t.identifier('currentScript'))),
        t.unaryExpression('!', t.memberExpression(
          t.memberExpression(t.identifier('document'), t.identifier('currentScript')),
          t.identifier('resolve')
        ))
      ),
      t.blockStatement([
        t.throwStatement(
          t.newExpression(t.identifier('Error'), [
            t.stringLiteral('must load by moduleM loadModule')
          ])
        )
      ])
    ),

    // const currentScript = document.currentScript;
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('currentScript'),
        t.memberExpression(t.identifier('document'), t.identifier('currentScript'))
      )
    ]),

    // const exposeModule = currentScript.exposeModule;
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('exposeModule'),
        t.memberExpression(t.identifier('currentScript'), t.identifier('exposeModule'))
      )
    ])
  ];

  // 添加开发环境调试日志（如果启用）
  if (options.isDevelopment !== false) {
    checkStatements.push(
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('console'), t.identifier('log')),
          [
            t.stringLiteral('module loaded'),
            t.memberExpression(t.identifier('currentScript'), t.identifier('id')),
            t.stringLiteral('load id'),
            t.memberExpression(t.identifier('exposeModule'), t.identifier('id'))
          ]
        )
      )
    );
  }

  // ID 验证
  checkStatements.push(
    t.ifStatement(
      t.binaryExpression(
        '!==',
        t.memberExpression(t.identifier('exposeModule'), t.identifier('id')),
        t.memberExpression(t.identifier('currentScript'), t.identifier('id'))
      ),
      t.blockStatement([
        t.throwStatement(
          t.callExpression(
            t.memberExpression(t.identifier('currentScript'), t.identifier('reject')),
            [t.stringLiteral('exposeModule.id !== document.currentScript.id')]
          )
        )
      ])
    )
  );

  // 创建 try-catch 包装的原始代码
  const tryStatement = t.tryStatement(
    t.blockStatement(programBody),
    t.catchClause(
      t.identifier('error'),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.memberExpression(t.identifier('document'), t.identifier('currentScript')),
              t.identifier('reject')
            ),
            [t.identifier('error')]
          )
        )
      ])
    )
  );

  // 将检查语句和 try-catch 合并
  const wrappedBody = [...checkStatements, tryStatement];

  // 创建立即执行函数（根据是否有 await 决定是否异步）
  const iife = t.callExpression(
    t.parenthesizedExpression(
      hasAwait 
        ? t.arrowFunctionExpression([], t.blockStatement(wrappedBody), true) // async
        : t.arrowFunctionExpression([], t.blockStatement(wrappedBody), false) // sync
    ),
    []
  );

  // 替换整个程序体
  ast.program.body = [t.expressionStatement(iife)];
}

module.exports = injectExposeModule;
