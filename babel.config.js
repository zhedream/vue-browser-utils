// 简单默认配置：npx babel .\test.tsx --out-file test.js --presets=@vue/babel-preset-jsx,@babel/preset-typescript
// npx babel .\test.tsx --out-file test.js 完整配置：要使用 babel.config.js 配置文件
const transformImportExportPlugin = require("./src/transformImportExportPlugin");
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
  plugins: [transformImportExportPlugin],
  sourceMaps: true
};