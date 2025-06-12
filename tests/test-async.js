const babel = require("@babel/standalone/babel.min.js");
const injectExposeModulePlugin = require("../src/injectExposeModulePlugin");

// 异步测试代码
const asyncCode = `
const p = await loadModule('@/examples/tool');
const { log, logError, logWarn } = p;
exposeModule(() => ({
  log,
  logError,
  logWarn
}));
`;

console.log("=== 异步代码测试 ===");
console.log("原始代码:");
console.log(asyncCode);

try {
  const result = babel.transform(asyncCode, {
    plugins: [[injectExposeModulePlugin, { isDevelopment: true }]]
  });

  console.log("\n转换后代码:");
  console.log(result.code);
} catch (error) {
  console.error("转换失败:", error);
} 