const fs = require("fs");
const path = require("path");
const browserify = require("browserify");
const root = path.resolve(__dirname, "..");
function writeChanged(file, data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (fs.existsSync(file) && fs.readFileSync(file).equals(bytes)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}
async function build() {
  const bundle = await new Promise((resolve, reject) =>
    browserify(path.join(root, "src/compiler/transformCodeToExposeModule.js"), {
      standalone: "transformCodeToExposeModule",
    }).bundle((error, bytes) => (error ? reject(error) : resolve(bytes)))
  );
  writeChanged(path.join(root, "moduleM/transformCodeToExposeModule.min.js"), bundle);
  for (const name of ["moduleM.js", "moduleM.config.example.js", "mergeJsxProps.js"])
    writeChanged(
      path.join(root, "moduleM", name),
      fs.readFileSync(path.join(root, "src/moduleM", name))
    );
  for (const name of [
    "moduleIdentifier.js",
    "injectExposeModule.js",
    "injectExposeModulePlugin.js",
    "transformImportFrom.js",
    "transformExportFrom.js",
    "transformImportExportPlugin.js",
  ])
    writeChanged(
      path.join(root, "moduleM/babel", name),
      fs.readFileSync(path.join(root, "src/compiler", name))
    );
  console.log("Runtime built: " + bundle.length + " bytes (compiler bundle)");
}
if (require.main === module)
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { build, writeChanged };
