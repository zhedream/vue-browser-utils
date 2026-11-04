const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');
const transform = require('../moduleM/transformCodeToExposeModule.min');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function precompile(source) {
  return babel.transformSync(source, { filename: 'input.tsx', configFile: path.join(root, 'babel.config.js'), babelrc: false }).code;
}
function environment() {
  const files = new Map();
  const reads = [];
  const scripts = [];
  const location = { href: 'https://example.test/app/deep/page.html?next=/other/' };
  const document = {
    location, baseURI: location.href, currentScript: { src: 'https://example.test/app/runtime/moduleM.js' },
    createElement(tag) { return { tagName: tag, dataset: {}, remove() {} }; },
    body: { appendChild(script) {
      scripts.push(script.src);
      setTimeout(() => {
        const parsed = new URL(script.src); parsed.searchParams.delete('_moduleM');
        if (!files.has(parsed.href)) { script.onerror(); return; }
        try {
          document.currentScript = script;
          vm.runInContext(files.get(parsed.href), context);
          script.onload?.();
        } catch (error) { script.reject ? script.reject(error) : script.onerror(error); }
        finally { document.currentScript = null; }
      }, 0);
    } },
  };
  const context = vm.createContext({ document, URL, console: { ...console, log() {}, error() {} }, setTimeout, clearTimeout, transformCodeToExposeModule: transform });
  context.window = context;
  context.fetch = async (url, options = {}) => {
    const parsed = new URL(url, location.href); parsed.searchParams.delete('_moduleM');
    reads.push([parsed.href, options.method || 'GET']);
    const code = files.get(parsed.href);
    return { ok: code !== undefined, status: code === undefined ? 404 : 200, text: async () => code };
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'moduleM/moduleM.js'), 'utf8'), context);
  document.currentScript = null;
  context.moduleM.configure({ baseUrl: '/app/', modules: { vue: () => ({ ref: value => ({ value }) }) } });
  return { context, files, reads, scripts, put(name, code) { files.set('https://example.test/app/' + name, code); } };
}
async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Module remained pending')), 2000); })]); }
  finally { clearTimeout(timer); }
}
test('compiled aliases, concurrent loads, cache bypass, TTL and clearCache', async () => {
  const { context: c, put, scripts } = environment();
  put('a.m.js', precompile('export const value = 1;'));
  const first = await bounded(c.loadModule('@/a.ts'));
  assert.equal(first.value, 1);
  assert.strictEqual(await c.loadModule('@/a.m.js'), first);
  assert.strictEqual(await c.loadModule('@/a'), first);
  assert.equal(scripts.length, 1);
  put('a.m.js', precompile('export const value = 2;'));
  assert.equal((await c.loadModule('@/a', false)).value, 2);
  const results = await Promise.all([c.loadModule('@/a'), c.loadModule('@/a')]);
  assert.strictEqual(results[0], results[1]);
  await c.loadModule('@/a', false);
  await c.loadModule('@/a', 5);
  put('a.m.js', precompile('export const value = 3;'));
  await delay(15);
  assert.equal((await c.loadModule('@/a', 5)).value, 3);
  c.moduleM.clearCache('@/a.ts');
  put('a.m.js', precompile('export const value = 4;'));
  assert.equal((await c.loadModule('@/a')).value, 4);
  put('b.m.js', precompile('await new Promise(resolve => setTimeout(resolve, 20)); export const value = 8;'));
  put('c.m.js', precompile('export const value = 9;'));
  const [b, d] = await bounded(Promise.all([c.loadModule('@/b'), c.loadModule('@/c')]));
  assert.equal(b.value, 8); assert.equal(d.value, 9);
});
test('runtime fallback, query strings, mappings and runtime/precompile agreement', async () => {
  const { context: c, put } = environment();
  const source = 'import { ref } from "vue"; export const value = ref<number>(7).value;';
  put('runtime.ts', source);
  put('compiled.m.js', precompile(source));
  assert.equal((await c.loadModule('@/runtime.ts')).value, (await c.loadModule('@/compiled.m.js')).value);
  put('legacy.js', 'export const value = 12;');
  assert.equal((await c.loadModule('@/legacy.ts')).value, 12);
  put('query.m.js?v=1', precompile('export const value = 13;'));
  assert.equal((await c.loadModule('@/query.ts?v=1')).value, 13);
  c.GlobalModuleMMap = { custom: () => ({ value: 3 }) };
  assert.equal((await c.loadModule('custom')).value, 3);
  c.moduleM.configure({ modules: { custom: () => ({ value: 4 }) } });
  assert.equal((await c.loadModule('custom')).value, 4);
  assert.equal(c.getModuleBaseUrl('@/a.ts'), 'https://example.test/app/a.ts');
  c.moduleM.configure({ baseUrl: '/sub' });
  assert.equal(c.getModuleBaseUrl('@/a.ts'), 'https://example.test/sub/a.ts');
});
test('failed async modules and network requests can be retried; side effects settle', async () => {
  const { context: c, put } = environment();
  put('fail.m.js', precompile('await Promise.resolve(); throw new Error("expected failure"); export const value = 1;'));
  await assert.rejects(bounded(c.loadModule('@/fail')), /expected failure/);
  put('fail.m.js', precompile('export const value = 5;'));
  assert.equal((await bounded(c.loadModule('@/fail'))).value, 5);
  await assert.rejects(bounded(c.loadModule('@/missing.ts')), /404/);
  put('missing.ts', 'export const value = 6;');
  assert.equal((await bounded(c.loadModule('@/missing.ts'))).value, 6);
  put('side.m.js', precompile('window.sideEffects = (window.sideEffects || 0) + 1;'));
  await bounded(c.loadModule('@/side'));
  assert.equal(c.sideEffects, 1);
  await c.runModuleMJs('@/side');
  assert.equal(c.sideEffects, 2);
  put('plain.js', 'window.plainLoads = (window.plainLoads || 0) + 1;');
  await c.loadScript('@/plain.js', false, true);
  await c.loadScript('@/plain.js', false, true);
  assert.equal(c.plainLoads, 1);
  await c.loadScript('@/plain.js', false, false);
  assert.equal(c.plainLoads, 2);
});
test('compiler bundle is deterministic, handles re-exports and avoids collisions', async () => {
  const code = 'import { ref } from "vue"; import { ref as other } from "vue"; export { ref as third } from "vue"; export const x = ref(2);';
  assert.equal(transform(code), transform(code));
  assert.equal(transform.transformVueTsx(code), transform.transformVueTsx(code));
  const { context: c, put } = environment();
  put('runtime.ts', code);
  put('compiled.m.js', precompile(code));
  const a = await c.loadModule('@/runtime.ts');
  const b = await c.loadModule('@/compiled.m.js');
  assert.equal(a.x.value, b.x.value);
  assert.equal(a.third(3).value, b.third(3).value);
});

test('configuration handles resource paths, Sass and old async component factories', async () => {
  const { context: c, put } = environment();
  let workerUrl, constructions = 0;
  c.Sass = class {
    constructor() { constructions++; }
    static setWorkerUrl(url) { workerUrl = url; }
    compile(input, callback) { callback({ status: 0, text: 'compiled:' + input }); }
  };
  c.moduleM.configure({ sass: { workerUrl: '@/javascript/sass.worker.js' } });
  assert.equal(await c.compileScssToCss('a{}'), 'compiled:a{}');
  assert.equal(workerUrl, 'https://example.test/app/javascript/sass.worker.js');
  await c.compileScssToCss('b{}');
  assert.equal(constructions, 1);
  put('component.m.js', precompile('export default { name: "Component" };'));
  const a = c.loadAsyncComponent('@/component');
  assert.strictEqual(c.loadAsyncComponent('@/component'), a);
  assert.equal((await a()).name, 'Component');
  assert.notStrictEqual(c.loadAsyncComponent('@/component', false), a);
  c.moduleM.clearCache();
  assert.notStrictEqual(c.loadAsyncComponent('@/component'), a);
});

test('historical .m.js ESM coexists with compiled wrappers', async () => {
  const { context: c, put } = environment();
  put('tree.m.js', 'export function tree() { return 42; }');
  put('consumer.m.js', 'import { tree } from "@/tree.m.js"; export const value = tree();');
  assert.equal((await bounded(c.loadModule('@/consumer.m.js'))).value, 42);
  assert.equal((await c.loadModule('@/tree')).tree(), 42);
  c.moduleM.clearCache();
  assert.equal((await c.loadModule('@/tree.ts')).tree(), 42);
  put('wrapped.m.js', precompile('import { tree } from "@/tree.m.js"; export const value = tree();'));
  assert.equal((await bounded(c.loadModule('@/wrapped.m.js'))).value, 42);
  put('bad.m.js', 'export const invalid = ;');
  await assert.rejects(bounded(c.loadModule('@/bad.m.js')));
  put('bad.m.js', 'export const value = 7;');
  assert.equal((await bounded(c.loadModule('@/bad.m.js'))).value, 7);
});

test('Vue defineComponent imports are not the historical free macro', async () => {
  const { context: c, put } = environment();
  const createElement = c.document.createElement;
  c.document.createElement = tag => tag !== 'div' ? createElement(tag) : {
    innerHTML: '', remove() {},
    querySelector(selector) {
      if (selector === 'script') {
        const match = this.innerHTML.match(/<script(?: lang="(.*?)")?>([\s\S]*?)<\/script>/);
        return { lang: match[1] || '', innerHTML: match[2] };
      }
      if (selector === 'template') return { innerHTML: '<div></div>' };
      return null;
    },
  };
  c.moduleM.configure({ modules: { vue: () => ({ defineComponent: value => value }) } });
  put('modern.vue', '<script>import { defineComponent } from "vue"; export default defineComponent({ name: "modern" });</script>');
  put('modern-ts.vue', '<script lang="ts">import { defineComponent } from "vue"; const name: string = "modern-ts"; export default defineComponent({ name });</script>');
  put('legacy.vue', '<script>defineComponent((Vue, template) => ({ name: "legacy" }));</script>');
  for (const name of ['modern', 'modern-ts', 'legacy']) {
    assert.equal((await bounded(c.loadModule('@/' + name + '.vue'))).default.name, name);
  }
});
