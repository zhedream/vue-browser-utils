const babel = require("@babel/standalone/babel.min.js");
const injectExposeModulePlugin = require("../src/injectExposeModulePlugin");

// 测试代码
const testCode = `
const log = (...args) => {
  console.log(...args);
};
const logError = (...args) => {
  console.error(...args);
};
const logWarn = (...args) => {
  console.warn(...args);
};
exposeModule(() => ({
  log,
  logError,
  logWarn
}));
`;

console.log("原始代码:");
console.log(testCode);

try {
  const result = babel.transform(testCode, {
    plugins: [injectExposeModulePlugin]
  });

  console.log("\n转换后代码:");
  console.log(result.code);
} catch (error) {
  console.error("转换失败:", error);
} 