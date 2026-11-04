// Each batch runs in a fresh process so edits to Babel config/plugins take effect.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const CACHE = path.join(ROOT, '.cache/ts-compiler.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => { try { return fs.readFileSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const digest = file => { const data = read(file); return data === null ? null : hash(data); };
const ignored = new Set(['node_modules', '.git', '.cache', 'dist', 'vendor']);
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  }).sort();
}
function writeChanged(file, content) {
  const data = Buffer.from(content);
  const previous = read(file);
  if (previous && previous.equals(data)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, data);
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return true;
}
function compile() {
  const inputs = files(path.join(ROOT, 'examples')).filter(file => /\.tsx?$/.test(file) && !/\.d\.ts$/.test(file));
  const compilerFiles = [__filename, path.join(ROOT, 'babel.config.js'), path.join(ROOT, 'package.json'), path.join(ROOT, 'package-lock.json'), ...files(path.join(ROOT, 'src/compiler'))];
  const versions = ['@babel/core', '@babel/preset-typescript', '@vue/babel-preset-jsx', '@babel/standalone'].map(name => require(`${name}/package.json`).version);
  const signature = hash(JSON.stringify([process.version, process.env.BABEL_ENV || process.env.NODE_ENV || 'development', versions, compilerFiles.map(file => [path.relative(ROOT, file), digest(file)])]));
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* Missing/corrupt cache is safe to rebuild. */ }
  const next = { signature, entries: {} };
  let compiled = 0, skipped = 0, changed = 0, failed = 0;
  for (const file of inputs) {
    const key = path.relative(ROOT, file).replace(/\\/g, '/');
    const output = file.replace(/\.tsx?$/, '.m.js');
    const mapFile = `${output}.map`;
    const source = fs.readFileSync(file, 'utf8');
    const sourceHash = hash(source);
    const old = cache.signature === signature && cache.entries && cache.entries[key];
    if (old && old.source === sourceHash && old.code === digest(output) && old.map === digest(mapFile)) {
      next.entries[key] = old;
      skipped++;
      continue;
    }
    try {
      const result = require('@babel/core').transformSync(source, {
        cwd: ROOT, filename: file, configFile: path.join(ROOT, 'babel.config.js'), babelrc: false,
        sourceMaps: true, sourceFileName: path.basename(file),
      });
      result.map.file = path.basename(output);
      const code = `${result.code}\n//# sourceMappingURL=${path.basename(mapFile)}`;
      const map = JSON.stringify(result.map);
      const codeChanged = writeChanged(output, code);
      const mapChanged = writeChanged(mapFile, map);
      if (codeChanged || mapChanged) changed++;
      next.entries[key] = { source: sourceHash, code: hash(code), map: hash(map) };
      compiled++;
    } catch (error) {
      failed++;
      console.error(`[ts] ${key}\n${error.message}`);
    }
  }
  writeChanged(CACHE, JSON.stringify(next, null, 2) + '\n');
  console.log(`[ts] compiled ${compiled}, changed ${changed}, cached ${skipped}, failed ${failed}`);
  return failed ? 1 : 0;
}
if (require.main === module) {
  try { process.exitCode = compile(); } catch (error) { console.error(error); process.exitCode = 1; }
}
module.exports = { compile, writeChanged };
