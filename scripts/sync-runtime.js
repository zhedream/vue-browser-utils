// 将已构建的 moduleM/ 产物同步到业务项目，不负责构建或监听。
// 用法（在库目录）：npm run build
// 然后：npm run sync -- E:/www/air-grid/Grid_Web_Front/moduleM
// 同步运行时、编译 bundle、JSX helper、配置示例和 Babel 插件。
// 不覆盖 moduleM.config.js；内容相同不写入，保留文件时间。
// 新项目请复制 moduleM.config.example.js 为 moduleM.config.js 并调整配置。
const fs = require("fs");
const path = require("path");
const { writeChanged } = require("./build-runtime");
const root = path.resolve(__dirname, "..");
const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/sync-runtime.js <project/moduleM> (build first)");
const destination = path.resolve(target);
for (const name of [
  "moduleM.js",
  "moduleM.config.example.js",
  "mergeJsxProps.js",
  "transformCodeToExposeModule.min.js",
])
  writeChanged(path.join(destination, name), fs.readFileSync(path.join(root, "moduleM", name)));
for (const name of [
  "moduleIdentifier.js",
  "injectExposeModule.js",
  "injectExposeModulePlugin.js",
  "transformImportFrom.js",
  "transformExportFrom.js",
  "transformImportExportPlugin.js",
])
  writeChanged(
    path.join(destination, "babel", name),
    fs.readFileSync(path.join(root, "moduleM/babel", name))
  );
console.log("Runtime synced to " + destination + "; project configuration preserved");
