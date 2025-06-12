// 简单默认配置：npx babel .\test.tsx --out-file test.js --presets=@vue/babel-preset-jsx,@babel/preset-typescript
// npx babel .\test.tsx --out-file test.js 完整配置：要使用 babel.config.js 配置文件
const transformImportExportPlugin = require("./src/transformImportExportPlugin");
const injectExposeModulePlugin = require("./src/injectExposeModulePlugin");

module.exports = {
  presets: [
    [
      '@vue/babel-preset-jsx',
      {
        vModel: false,
        compositionAPI: 'native',
      },
    ],
    '@babel/preset-typescript'
    // ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
  ],
  plugins: [
    transformImportExportPlugin, 
    [injectExposeModulePlugin, {
      // 开发环境默认启用调试日志，生产环境可以通过环境变量禁用
      isDevelopment: true
    }]
  ],
  sourceMaps: true,
};