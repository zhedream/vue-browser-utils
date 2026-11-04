const runtimeCaches = [];
// Browser module runtime. Project dependencies are supplied through moduleM.configure().

async function execScriptAsync(script_text) {
  const script_text_eval = `(async ()=>{ ${script_text} })() `;
  return await eval(script_text_eval);
}

function fetchText(url) {
  return fetch(url, { cache: "no-cache" }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  });
}

// ===  scss ===
// 1. 引入：Sass。https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.11.1/sass.min.js
// 2. 必须下载本地: sass.worker.js 。https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.11.1/sass.worker.js
let sassInstance;

function getSass() {
  try {
    if (sassInstance) {
      return sassInstance;
    }
    if (moduleMSettings.sass.workerUrl) Sass.setWorkerUrl(getModuleBaseUrl(moduleMSettings.sass.workerUrl));
    sassInstance = new Sass();
    return sassInstance;
  } catch (e) {
    throw e;
  }
}

/**
 * 编译 scss 为 css
 * @param scss {string}
 * @return {Promise<string>}
 */
async function compileScssToCss(scss) {
  if (typeof Sass === "undefined") {
    if (!moduleMSettings.sass.scriptUrl) throw new Error("Configure sass.scriptUrl or provide window.Sass before compiling SCSS");
    await loadScript(getModuleBaseUrl(moduleMSettings.sass.scriptUrl), false, true);
  }
  return new Promise((resolve, reject) => {
    getSass().compile(scss, (result) => {
      if (result.status === 0) {
        resolve(result.text);
      } else {
        reject(result);
      }
    });
  });
}

// === less ===

/**
 * 编译 less 为 css
 * @param lessCss {string}
 * @return {Promise<string>}
 */
async function compileLessToCss(lessCss) {
  let less = await loadModule("less", true);
  try {
    return less.render(lessCss).then((r) => r.css);
  } catch (e) {
    console.error("less 加载失败", e);
  }
}

// ==================  处理 amd 模块 ==================
function hasAmdDefineCallExpression(codeString) {
  // 使用正则表达式来匹配 "define" 后面跟随任意数量的空白字符，然后是一个左括号 "("，
  // 再跟随任意数量的空白字符，然后是任意字符（非贪婪匹配），最后是一个右括号 ")"。
  // 使用\s*来匹配任意数量的空白字符，包括换行。
  // 使用[\s\S]*?来匹配任意字符，包括换行，使用非贪婪模式。
  const regex = /define\s*\(\s*[\s\S]*?\s*\)/;
  return regex.test(codeString);
}

function loadModuleAmd(script_text, moduleUrl) {
  let module;
  const moduleCtx = {};
  const define = (...args) => {
    console.log("define", args, moduleCtx);
    // define(()=>{})
    // define([],()=>{})
    // define('',[],()=>{})
    let i = args.length - 1;
    let callModule = args[i];
    if (module !== undefined) {
      console.warn("重复加载模块", moduleUrl);
    }
    module = callModule(moduleCtx);
  };
  define.amd = { loadModuleAmd: true };

  // 依赖注入
  let fn = new Function("define", script_text);
  fn(define);
  console.log("moduleCtx", moduleCtx);
  return module || moduleCtx;
}

// ==================  处理 js 模块 ==================
function resolveModule() {
  let moduleResolve, moduleReject;
  let p = new Promise((resolve, reject) => {
    moduleResolve = resolve;
    moduleReject = reject;
  });
  return [moduleResolve, moduleReject, p];
}

// ES、AMD 模块
async function loadModuleJsText(script_text, moduleUrl) {
  const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

  let [moduleResolve, moduleReject, p] = resolveModule();

  if (hasAmdDefineCallExpression(script_text)) {
    const module = loadModuleAmd(script_text, moduleUrl);
    if (typeof module === "object" || typeof module === "function") {
      if (!module.default) {
        module.default = module;
        console.warn("amd 模块没有 default 属性", moduleUrl);
      }
    }
    moduleResolve(module);
    return p;
  }

  const exposeModule = (callModule) => {
    // 接收一个普通 vue 组件对象, 或 Promise 对象
    const mod = callModule();
    moduleResolve(mod);
    return mod;
  };

  //  console.log(script_text);
  // 处理 ES 模块
  if (script_text.indexOf('import') > -1 || script_text.indexOf('export') > -1) {
    script_text = transformCodeToExposeModule(script_text);
  }
  // console.log("script_text: \n", script_text)

  // 处理 return 宏
  script_text = script_text.replace("defineReturn", "return ");

  // script_text = `
  //  try {
  //   ${script_text}
  //  } catch (e) {
  //   console.error("加载模块失败", e);
  //   moduleReject(e);
  //  }
  // `;

  const fn = new AsyncFunction("exposeModule", script_text);
  const mod = await fn(exposeModule).catch((e) => {
    console.error("加载模块失败", e, script_text);
    moduleReject(e);
  });

  // 兼容 代码片段 return 写法. 如 `class A{} ; return {A}`
  moduleResolve(mod);

  return p;
}

var loadModuleJs = (() => {
  const cacheStore = createModuleCache();
  return function loadModuleJs(moduleUrl, cache = true) {
    moduleUrl = getModuleBaseUrl(moduleUrl);
    return cachedModule(cacheStore, getModuleCacheId(moduleUrl), cache, async () => {
      let text = await fetchText(moduleUrl);
      return loadModuleJsText(text, moduleUrl);
    });
  };
})();

// ==================  实时编译 处理 tsx 模块 ==================

var loadModuleTsx = (() => {
  const cacheStore = createModuleCache();
  return function loadModuleTsx(moduleUrl, cache = true) {
    moduleUrl = getModuleBaseUrl(moduleUrl);
    return cachedModule(cacheStore, getModuleCacheId(moduleUrl), cache, async () => {
      let text = await fetchText(moduleUrl);
      const transform = transformCodeToExposeModule.transformVueTsx;
      if (!transform) throw new Error('TS/TSX compiler is not loaded');
      text = transform(text);
      return loadModuleJsText(text, moduleUrl);
    });
  };
})();

// ==================  处理 vue 模块 ==================
function transformDefineComponent(str) {
  if (str.indexOf("defineComponent") > -1) {
    return str;
  }

  if (str.indexOf("export default") > -1) {
    // 匹配出 export default { ... } 中的内容,  刚好少一个 }
    let reg = /(?<=export default\s{)(.*)(?=})/s;
    let result = str.match(reg);
    // 替换掉 str 中 export default { } 的内容
    let define = `
defineComponent((Vue, template) => {
  return {
    ...Vue.compile(template),
    ${result[0]}
  };
});
`;
    return str.replace(/export default {[\s\S]*}/, define);
  }

  return str;
}

function useDefineComponent(Vue, template, resolve) {
  return (callComponent) => {
    // 接收一个普通 vue 组件对象, 或 Promise 对象
    let component = callComponent(Vue, template);
    resolve({ default: component });
    return component;
  };
}

var loadModuleVue = (function () {
  const moduleCache = createModuleCache();
  const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

  /**
   *
   * @param moduleUrl
   * @param cache {boolean|number}
   * @return {Promise<*>}
   */
  async function loadModuleVue(moduleUrl, cache = true) {
    moduleUrl = getModuleBaseUrl(moduleUrl);
    let key = moduleUrl.split("/").join("_");

    const [moduleResolve, moduleReject, moduleVue] = resolveModule();

    return cachedModule(moduleCache, getModuleCacheId(moduleUrl), cache, async () => {

      let text = await fetchText(moduleUrl);
      let div = document.createElement("div");
      div.innerHTML = text;

      // =======================  处理 template =======================
      const Vue = await loadModule("vue");
      const template = div.querySelector("template")?.innerHTML;
      const defineComponent = useDefineComponent(Vue, template, moduleResolve);

      const style = div.querySelector("style");

      if (style && style.lang === "scss") {
        style.innerHTML = await compileScssToCss(style.innerHTML);
      }

      // 加载样式
      if (style) {
        function applyStyle() {
          style.id = "style_" + key;
          if (document.getElementById(style.id)) {
            document.getElementById(style.id).innerHTML = style.innerHTML;
          } else {
            document.head.appendChild(style);
          }
        }

        // =======================  处理 less 样式 =======================
        if (style && style.lang === "less") {
          style.innerHTML = await compileLessToCss(style.innerHTML);
          applyStyle();
        }
        // =======================  处理 scss 样式 =======================
        else if (style && style.lang === "scss") {
          applyStyle();
        }
        // == 普通 css
        else {
          applyStyle();
        }
      }

      // =======================  处理 script =======================

      // https://stackoverflow.com/questions/11513392/how-to-detect-when-innerhtml-is-complete
      // https://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
      const script = div.querySelector("script");

      // console.log("script", script);

      let script_text = script.innerHTML.trim();

      // 统一转换:  defineComponent
      // script_text = transformDefineComponent(script_text);
      // 代码转换:  import

      const transformCode = transformCodeToExposeModule.transformVueTsx || transformCodeToExposeModule.transformTs;
      if (script.lang === "ts") {
        if (transformCode) script_text = transformCode(script_text);
        else console.warn("transformTs|transformVueTsx is undefined");
      } else if (script.lang === "tsx" && transformCodeToExposeModule.transformVueTsx) {
        if (transformCodeToExposeModule.transformVueTsx) script_text = transformCodeToExposeModule.transformVueTsx(script_text);
        else console.warn("transformVueTsx is undefined");
      }

      const ast = transformCodeToExposeModule.parse(script_text, {
        sourceType: "module",
      });
      let legacyDefineComponent = false;
      transformCodeToExposeModule.traverse(ast, {
        CallExpression(path) {
          if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'defineComponent' && !path.scope.hasBinding('defineComponent')) {
            legacyDefineComponent = true;
          }
        },
      });
      transformCodeToExposeModule.transformImport(ast);
      script_text = transformCodeToExposeModule.generator(ast).code;

      function handleDefineComponent() {
        const fn = new AsyncFunction("defineComponent", script_text);
        fn(defineComponent).catch((e) => {
          console.error("加载模块失败", moduleUrl, e);
          moduleReject(e);
        });
      }

      async function handleExportDefault() {
        let mod = await loadModuleJsText(script_text);
        const options = mod.default;
        if (template) {
          // Object.assign(options, Vue.compile(template));
          options.template = template;
        }
        moduleResolve({
          default: options,
        });
      }

      if (legacyDefineComponent) {
        handleDefineComponent();
      } else {
        handleExportDefault().catch(moduleReject);
      }

      div.remove();
      div = null;

      return moduleVue;
    });
  }

  return loadModuleVue;
})();

var loadAsyncComponent = (() => {
  const factories = new Map();
  function loadAsyncComponent(url, cache = true) {
    const key = getModuleCacheId(url);
    const old = factories.get(key);
    if (cache !== false && old && old.expires > Date.now()) return old.factory;
    const factory = () => loadModule(url, cache).then(mod => mod.default);
    if (cache !== false) factories.set(key, { factory, expires: typeof cache === 'number' ? Date.now() + cache : Infinity });
    else factories.delete(key);
    return factory;
  }
  loadAsyncComponent.clear = () => factories.clear();
  return loadAsyncComponent;
})();

// ==================  处理 模块 入口 ==================

// All cache layers share one invalidation policy. Failures never poison the cache.
function createModuleCache() {
  const cache = new Map();
  runtimeCaches.push(cache);
  return cache;
}
function cachedModule(cache, key, policy, load) {
  if (policy === false || (typeof policy === 'number' && policy <= 0)) {
    cache.delete(key);
    return Promise.resolve().then(load);
  }
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const entry = { expires: Infinity };
  entry.promise = Promise.resolve().then(load).then(value => {
    entry.expires = typeof policy === 'number' ? Date.now() + policy : Infinity;
    return value;
  }, error => {
    if (cache.get(key) === entry) cache.delete(key);
    throw error;
  });
  cache.set(key, entry);
  return entry.promise;
}
const moduleMScriptUrl = document.currentScript && document.currentScript.src;
const moduleMSettings = {
  baseUrl: new URL('.', document.baseURI || document.location.href).href,
  modules: Object.create(null),
  jsxHelperUrl: new URL('mergeJsxProps.js', moduleMScriptUrl || document.baseURI || document.location.href).href,
  sass: { scriptUrl: null, workerUrl: null },
};
var moduleM = {
  configure(options = {}) {
    if (options.baseUrl !== undefined) {
      const base = new URL(options.baseUrl, document.baseURI || document.location.href);
      base.search = ''; base.hash = '';
      if (!base.pathname.endsWith('/')) base.pathname += '/';
      moduleMSettings.baseUrl = base.href;
    }
    if (options.modules) Object.assign(moduleMSettings.modules, options.modules);
    if (options.jsxHelperUrl !== undefined) moduleMSettings.jsxHelperUrl = options.jsxHelperUrl;
    if (options.sass) {
      Object.assign(moduleMSettings.sass, options.sass);
      sassInstance = undefined;
    }
    moduleM.clearCache();
    return moduleM;
  },
  clearCache(url) {
    const key = url === undefined ? null : getModuleCacheId(url);
    for (const cache of runtimeCaches) {
      if (key === null) cache.clear(); else cache.delete(key);
    }
    loadAsyncComponent.clear();
  },
};
function getIndexBaseUrl() { return moduleMSettings.baseUrl; }
function getModuleBaseUrl(url, base = moduleMSettings.baseUrl) {
  if (url.startsWith('@/')) return new URL(url.slice(2), base).href;
  return new URL(url, base).href;
}
function getModuleCacheId(url, base = moduleMSettings.baseUrl) {
  if (getModuleRegistration(url).found) return url;
  const parsed = new URL(getModuleBaseUrl(url, base));
  parsed.pathname = parsed.pathname.replace(/\.(?:m\.js|js|tsx?)$/, '');
  parsed.hash = '';
  return parsed.href;
}
function getModuleRegistration(name) {
  if (Object.prototype.hasOwnProperty.call(moduleMSettings.modules, name)) return { found: true, value: moduleMSettings.modules[name] };
  const legacy = window.GlobalModuleMMap;
  if (legacy && Object.prototype.hasOwnProperty.call(legacy, name)) return { found: true, value: legacy[name] };
  if (name === '@vue/babel-helper-vue-jsx-merge-props') return { found: true, value: () => loadModule(moduleMSettings.jsxHelperUrl) };
  return { found: false };
}
async function fileExist(url) {
  const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`HTTP ${response.status}: ${url}`);
}
function withExtension(url, extension, replace = false) {
  const parsed = new URL(url);
  parsed.pathname = (replace ? parsed.pathname.replace(/\.tsx?$/, '') : parsed.pathname) + extension;
  return parsed.href;
}
const moduleCache = createModuleCache();
function loadModule(url, cache = true) {
  const registration = getModuleRegistration(url);
  const key = getModuleCacheId(url);
  return cachedModule(moduleCache, key, cache, async () => {
    if (registration.found) return typeof registration.value === 'function' ? registration.value() : registration.value;
    let moduleUrl = getModuleBaseUrl(url);
    let pathname = new URL(moduleUrl).pathname;
    if (/\.tsx?$/.test(pathname)) {
      for (const extension of ['.m.js', '.js']) {
        const candidate = withExtension(moduleUrl, extension, true);
        if (await fileExist(candidate)) {
          return extension === '.m.js' ? loadModuleScript(candidate, false) : loadModuleJs(candidate, false);
        }
      }
      return loadModuleTsx(moduleUrl, false);
    }
    if (pathname.endsWith('.m.js')) return loadModuleScript(moduleUrl, false);
    if (pathname.endsWith('.js')) return loadModuleJs(moduleUrl, false);
    if (/\.(vue|html)$/.test(pathname)) return loadModuleVue(moduleUrl, false);
    for (const extension of ['.m.js', '.js', '.ts', '.tsx']) {
      const candidate = withExtension(moduleUrl, extension);
      if (await fileExist(candidate)) {
        if (extension === '.m.js') return loadModuleScript(candidate, false);
        if (extension === '.js') return loadModuleJs(candidate, false);
        return loadModuleTsx(candidate, false);
      }
    }
    return loadModuleVue(moduleUrl, false);
  });
}
const moduleScriptCache = createModuleCache();
let moduleScriptSequence = 0;
function scriptRequestUrl(url, cache) {
  const parsed = new URL(getModuleBaseUrl(url));
  if (!cache) parsed.searchParams.set('_moduleM', `${Date.now()}-${++moduleScriptSequence}`);
  return parsed.href;
}
// Each script owns its export callback; parallel loads never share mutable context.
function loadModuleScript(url, cache = true, isEsm = false) {
  const key = getModuleCacheId(url);
  return cachedModule(moduleScriptCache, key, cache, async () => {
    // Older projects used .m.js for uncompiled ESM as well. The wrapper protocol,
    // not the filename, distinguishes a precompiled module from runtime source.
    const source = await fetchText(getModuleBaseUrl(url));
    if (!source.includes('must load by moduleM loadModule')) {
      return loadModuleJsText(source, url);
    }
    return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = `moduleM-${++moduleScriptSequence}`;
    script.type = isEsm ? 'module' : 'text/javascript';
    script.src = scriptRequestUrl(url, false);
    let settled = false;
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      script.remove();
      callback(value);
    }
    script.resolve = value => finish(resolve, value);
    script.reject = error => finish(reject, error);
    script.exposeModule = callback => {
      try {
        const value = callback();
        script.resolve(value);
        return value;
      } catch (error) { script.reject(error); }
    };
    script.exposeModule.id = script.id;
    script.onerror = () => script.reject(new Error(`Failed to load module script: ${url}`));
    document.body.appendChild(script);
    });
  });
}
const ordinaryScriptCache = createModuleCache();
// Legacy argument order remains (url, isEsm, cache).
function loadScript(url, isEsm = false, cache = false) {
  const key = getModuleCacheId(url);
  return cachedModule(ordinaryScriptCache, key, cache, () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = isEsm ? 'module' : 'text/javascript';
    script.src = scriptRequestUrl(url, cache);
    script.onload = () => { script.remove(); resolve(script); };
    script.onerror = () => { script.remove(); reject(new Error(`Failed to load script: ${url}`)); };
    document.body.appendChild(script);
  }));
}
Object.assign(moduleM, { loadModule, loadScript, loadModuleScript, loadModuleJs, loadModuleTsx, loadModuleVue, loadAsyncComponent, mountModuleVue, runModuleMJs, loadStyleLink });
if (window.ModuleMConfig) moduleM.configure(window.ModuleMConfig);

async function awaitLock(fn, timeOut = 1000) {
  let now = Date.now();
  while (true) {
    if (Date.now() - now > timeOut) throw new Error("awaitLock timeout");
    let flag = await fn();
    console.log(flag, 1111111);
    if (flag) break;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

// 运行 m.js 模块
async function runModuleMJs(filePath) {
  await loadModule(filePath, false);
}

// 将 vue 组件挂在在 eleOrSelector 上
async function mountModuleVue(filePath, eleOrSelector, cache = true) {
  const Vue = await loadModule("vue", true);
  let App = await loadModule(filePath, cache).then((e) => e.default);
  new Vue({
    render: (h) => h(App),
  }).$mount(eleOrSelector);
}

function myEvalSkipAmd(text) {
  let define2 = window.define;
  let require2 = window.require;
  try {
    window.define = undefined;
    window.require = undefined;
    eval(text);
  } finally {
    window.define = define2;
    window.require = require2;
  }
}

function loadStyleLink(url) {
  let ID = url.split("/").join("_");

  let link = document.getElementById(ID);
  if (link) {
    removeLink();
    addLink();
  } else {
    addLink();
  }

  function addLink() {
    link = document.createElement("link");
    link.id = ID;
    link.rel = "stylesheet";
    link.href = url;
    document.body.appendChild(link);
  }

  function removeLink() {
    document.body.removeChild(link);
  }
}
