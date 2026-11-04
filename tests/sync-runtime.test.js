const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('sync preserves project config and unchanged timestamps, and includes only current artifacts', t => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'modulem-sync-'));
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  const config = path.join(target, 'moduleM.config.js');
  fs.writeFileSync(config, '// project-owned configuration');
  const run = () => execFileSync(process.execPath, [path.join(__dirname, '../scripts/sync-runtime.js'), target]);
  run();
  const expected = ['moduleM.js', 'moduleM.config.example.js', 'mergeJsxProps.js', 'transformCodeToExposeModule.min.js'];
  const times = expected.map(name => fs.statSync(path.join(target, name)).mtimeMs);
  run();
  assert.deepEqual(expected.map(name => fs.statSync(path.join(target, name)).mtimeMs), times);
  assert.equal(fs.readFileSync(config, 'utf8'), '// project-owned configuration');
  assert.equal(fs.existsSync(path.join(target, 'moduleM.legacy.js')), false);
  assert.equal(fs.readdirSync(path.join(target, 'babel')).length, 6);
});
