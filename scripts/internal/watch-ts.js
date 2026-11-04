const path = require('path');
const { fork } = require('child_process');
const chokidar = require('chokidar');
const ROOT = path.resolve(__dirname, '../..');

function watchTs() {
  let worker, timer, dirty = false, closed = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  function run() {
    if (closed || worker || !dirty) return;
    dirty = false;
    worker = fork(path.join(__dirname, 'compile-ts.js'), [], { cwd: ROOT, stdio: 'inherit' });
    worker.on('error', error => console.error('[ts]', error.message));
    worker.on('exit', () => {
      worker = null;
      if (dirty) run();
      else resolveReady();
    });
  }
  function schedule() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(run, 100);
  }
  // Watch outputs too: removing or editing one repairs it from the source.
  const watcher = chokidar.watch([
    'examples/**/*.ts', 'examples/**/*.tsx', 'examples/**/*.m.js', 'examples/**/*.m.js.map',
    'babel.config.js', 'src/compiler/**/*.js', 'package.json', 'package-lock.json', 'scripts/internal/compile-ts.js',
  ], {
    cwd: ROOT, ignoreInitial: true,
    ignored: /(^|[/\\])(node_modules|\.git|dist|vendor)([/\\]|$)|\.d\.ts$/,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });
  watcher.on('all', schedule);
  watcher.on('error', error => console.error('[ts watcher]', error.message));
  watcher.on('ready', schedule);
  return {
    ready,
    async close() {
      closed = true;
      clearTimeout(timer);
      if (worker) worker.kill();
      await watcher.close();
    },
  };
}
if (require.main === module) {
  const watcher = watchTs();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await watcher.close(); process.exit(); });
}
module.exports = { watchTs };
