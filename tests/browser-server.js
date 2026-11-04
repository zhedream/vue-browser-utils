// Run from the library: node tests/browser-server.js <Grid_Web_Front path>
const http = require('http');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const project = path.resolve(process.argv[2] || '.');
const code = 'import { ref } from "vue"; export const value = ref<number>(7).value;';
const compile = source => babel.transformSync(source, { filename: 'fixture.tsx', configFile: path.join(root, 'babel.config.js'), babelrc: false }).code;
const fixtures = {
  '/grid/fixtures/runtime.ts': code,
  '/grid/fixtures/compiled.m.js': compile(code),
  '/grid/fixtures/parallel.m.js': compile('await new Promise(resolve => setTimeout(resolve, 10)); export const value = 8;'),
  '/grid/fixtures/error.m.js': compile('await Promise.resolve(); throw new Error("async failure"); export const value = 0;'),
  '/grid/fixtures/side.m.js': compile('window.side = (window.side || 0) + 1;'),
  '/grid/fixtures/sample.vue': '<template><div class="result">{{message}}</div></template><script lang="ts">import { ref } from "vue"; export default { setup() { return { message: ref<string>("SFC mounted") }; } };</script>',
  '/grid/fixtures/jsx.tsx': 'export default { render() { return <div class="jsx">JSX mounted</div>; } };',
};
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const key = url.pathname;
  let data, type = 'text/javascript; charset=utf-8';
  try {
    if (key === '/') { data = fs.readFileSync(path.join(__dirname, 'browser.html')); type = 'text/html; charset=utf-8'; }
    else if (key === '/vue.js') data = fs.readFileSync(require.resolve('vue/dist/vue.js'));
    else if (Object.hasOwn(fixtures, key)) data = fixtures[key];
    else if (key.startsWith('/grid/')) {
      const file = path.resolve(project, '.' + key.slice('/grid'.length));
      if (!file.startsWith(project + path.sep)) throw new Error('Invalid path');
      data = fs.readFileSync(file);
    } else throw new Error('Missing file');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end(); }
}).listen(Number(process.env.PORT) || 14026, '127.0.0.1', function () { console.log('Browser verification: http://127.0.0.1:' + this.address().port + '/'); });
