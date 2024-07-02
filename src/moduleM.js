console.log("moduleM.js loaded");
console.log(document.currentScript?.src);

async function execScriptAsync(script_text) {
  const script_text_eval = `(async ()=>{ ${script_text} })() `;
  return await eval(script_text_eval);
}

function fetchText(url) {
  return fetch(url, { cache: "no-cache" }).then((res) => res.text());
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

  const define = (...args) => {
    // define(()=>{})
    // define([],()=>{})
    // define('',[],()=>{})
    let i = args.length - 1;
    let callModule = args[i];
    if (module !== undefined) {
      console.warn("重复加载模块", moduleUrl);
    }
    module = callModule();
  };
  define.amd = { loadModuleAmd: true };

  // 依赖注入
  let fn = new Function("define", script_text);
  fn(define);
  return module;
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
async function loadModuleJsText(script_text) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  let [moduleResolve, moduleReject, p] = resolveModule();

  if (hasAmdDefineCallExpression(script_text)) {
    const module = await loadModuleAmd(script_text, moduleUrl);
    if (typeof module === "object" || typeof module === "function") {
      if (!module.default) {
        module.default = module;
        console.warn("amd 模块没有 default 属性", moduleUrl);
      }
    }
    moduleResolve(module);
    return moduleCache[key];
  }

  const exposeModule = (callModule) => {
    // 接收一个普通 vue 组件对象, 或 Promise 对象
    const mod = callModule();
    moduleResolve(mod);
    return mod;
  };

  //  console.log(script_text);
  // 处理 ES 模块
  script_text = transformCodeToExposeModule(script_text);
  // console.log("script_text: \n", script_text)

  // 处理 return 宏
  script_text = script_text.replace("defineReturn", "return ");

  script_text = `
   try {
    ${script_text}
   } catch (e) {
    console.error("加载模块失败", e);
    moduleReject();
   }
  `;

  const fn = new AsyncFunction("exposeModule", script_text);
  const mod = await fn(exposeModule).catch((e) => {
    console.error("加载模块失败", e, script_text);
    moduleReject();
  });

  // 兼容 代码片段 return 写法. 如 `class A{} ; return {A}`
  moduleResolve(mod);

  return p;
}

var loadModuleJs = (() => {
  const moduleCache = {};

  async function loadModuleJs(moduleUrl, cache = true) {
    let key = moduleUrl.split("/").join("_");

    let [moduleResolve, moduleReject, moduleJs] = resolveModule();

    if (moduleCache[key]) {
      return moduleCache[key];
    } else {
      moduleCache[key] = moduleJs;
      if (typeof cache === "number") {
        setTimeout(() => (moduleCache[key] = null), cache);
      } else if (cache === false) {
        moduleCache[key] = undefined;
      }
    }

    let script_text = await fetchText(moduleUrl);

    loadModuleJsText(script_text).then(moduleResolve).catch(moduleReject);

    return moduleJs;
  }

  return loadModuleJs;
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

var loadModuleVue = (function (Vue, less) {
  const moduleCache = {};
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  /**
   *
   * @param moduleUrl
   * @param cache {boolean|number}
   * @return {Promise<*>}
   */
  async function loadModuleVue(moduleUrl, cache = true) {
    let key = moduleUrl.split("/").join("_");

    const [moduleResolve, moduleReject, moduleVue] = resolveModule();

    if (moduleCache[key]) {
      return moduleCache[key];
    } else {
      moduleCache[key] = moduleVue;
      if (typeof cache === "number") {
        setTimeout(() => (moduleCache[key] = null), cache);
      } else if (cache === false) {
        moduleCache[key] = undefined;
      }
    }

    let text = await fetchText(moduleUrl);
    let div = document.createElement("div");
    div.innerHTML = text;

    // =======================  处理 template =======================

    const template = div.querySelector("template")?.innerHTML;
    const defineComponent = useDefineComponent(Vue, template, moduleResolve);

    // =======================  处理 less 样式 =======================

    const style = div.querySelector("style");
    if (style && style.lang === "less") {
      let r = await less.render(style.innerHTML);
      style.innerHTML = r.css;
    }
    // 加载样式
    if (style) {
      style.id = "style_" + key;
      if (document.getElementById("style_" + key)) {
        document.getElementById("style_" + key).innerHTML = style.innerHTML;
      } else {
        document.head.appendChild(style);
      }
    }

    // =======================  处理 script =======================

    // https://stackoverflow.com/questions/11513392/how-to-detect-when-innerhtml-is-complete
    // https://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
    const script = div.querySelector("script");

    let script_text = script.innerHTML.trim();

    // 统一转换:  defineComponent
    // script_text = transformDefineComponent(script_text);
    // 代码转换:  import
    const ast = transformCodeToExposeModule.parse(script_text, {
      sourceType: "module",
    });
    transformCodeToExposeModule.transformImport(ast);
    script_text = transformCodeToExposeModule.generator(ast).code;

    function handleDefineComponent() {
      const fn = new AsyncFunction("defineComponent", script_text);
      fn(defineComponent).catch((e) => {
        console.error("加载模块失败", moduleUrl, e);
        moduleReject();
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

    if (script_text.indexOf("export") > -1 && script_text.indexOf("default") > -1) {
      handleExportDefault();
    } else if (script_text.indexOf("defineComponent") > -1) {
      handleDefineComponent();
    } else {
      console.error("异常 Vue 模块：", moduleUrl);
      moduleReject();
    }

    div.remove();
    div = null;

    return moduleVue;
  }

  return loadModuleVue;
})(Vue, less);

var loadAsyncComponent = (() => {
  const loadFnCache = {};

  /**
   *
   * @param url
   * @param cache {boolean|number}
   * @return {(function(): Promise<*>)}
   */
  function loadAsyncComponent(url, cache = true) {
    let key = url.split("/").join("_");
    let [moduleResolve, moduleReject, module] = resolveModule();
    // 保证返回同一个函数, 保证同一个组件只加载一次
    const loadFn = () => module;
    if (loadFnCache[key]) {
      return loadFnCache[key];
    } else {
      loadFnCache[key] = loadFn;
      if (typeof cache === "number") {
        setTimeout(() => (loadFnCache[key] = null), cache);
      } else if (cache === false) {
        loadFnCache[key] = undefined;
      }
    }
    loadModule(url, cache).then((mod) => moduleResolve(mod.default), moduleReject);
    return loadFn;
  }

  return loadAsyncComponent;
})();

// ==================  处理 模块 入口 ==================

async function fileExist(jsNoduleUrl) {
  return fetch(jsNoduleUrl, {
    method: "HEAD",
  })
    .then((response) => {
      if (response.ok) {
        // 文件存在，服务器返回了200-299的状态码
        console.log("文件存在");
        return true;
      } else if (response.status === 404) {
        // 文件不存在，服务器返回了404状态码
        console.log("文件不存在");
        return false;
      } else {
        // 其它错误，如服务器错误（500状态码等）
        console.log("发生了其它错误", response.status);
        return Promise.reject();
      }
    })
    .catch((error) => {
      // 网络问题或其他异常
      console.error("请求发生错误", error);
      return Promise.reject(error);
    });
}

// TODO: 加载自定义模块, 同时并行加载, 同时用到一个模块, 可能会重复请求记载, 存在锁问题, 使用 Promise 解决
const moduleCache = {};

var loadModule = (() => {
  const moduleMap = {
    vue: () => {
      Vue.default = Vue;
      return Vue;
    },
    "ant-design-vue": () => antd,
    lodash: () => _,
    dayjs: () => {
      dayjs.default = dayjs;
      return dayjs;
    },
    "v-region": () => window.vRegion,
    echarts: () => echarts,
    axios: () => {
      window.axios.default = window.axios;
      return window.axios;
    },
    "js-cookie": () => {
      Cookies.default = Cookies;
      return Cookies;
    },
  };

  /**
   *
   * @param url
   * @param cache {boolean|number}
   * @return {Promise<*>}
   */
  async function loadModule(url, cache = true) {
    const originModuleUrl = url;
    let moduleUrl = originModuleUrl;

    let [moduleResolve, moduleReject, module] = resolveModule();

    if (moduleCache[originModuleUrl]) {
      // 使用缓存
      return moduleCache[originModuleUrl];
    } else {
      // 添加到缓存
      moduleCache[originModuleUrl] = module;
      if (typeof cache === "number") {
        // 过期清空缓存
        setTimeout(() => (moduleCache[originModuleUrl] = null), cache);
      } else if (cache === false) {
        // 不缓存
        moduleCache[originModuleUrl] = undefined;
      }
    }

    // 全局引入模块
    if (moduleMap[originModuleUrl]) {
      if (moduleMap[originModuleUrl] instanceof Function) {
        moduleResolve(moduleMap[originModuleUrl]());
      } else {
        moduleResolve(moduleMap[originModuleUrl]);
      }
      return module;
    }

    const endTsxExp = /\.tsx?$/;
    const endsWithTsx = (str) => endTsxExp.test(str);

    // 匹配 ts 对应编译的 js 文件。
    // cli：babel a.js --out-file a.js --presets babel-preset-typescript --plugins babel-plugin-transform-vue-jsx
    // webstorm: babel $FileDir$/$FileName$ --out-file $FileDir$/$FileNameWithoutExtension$.js --presets babel-preset-typescript --plugins babel-plugin-transform-vue-jsx
    if (endsWithTsx(moduleUrl)) {
      let jsNoduleUrl = moduleUrl.replace(endTsxExp, ".js");
      let exist = await fileExist(jsNoduleUrl);
      if (exist) {
        moduleUrl = jsNoduleUrl;
      }
    }

    // .js
    if (moduleUrl.endsWith(".js")) {
      loadModuleJs(moduleUrl, cache).then(moduleResolve, moduleReject);
    }
    // .vue
    else if (moduleUrl.endsWith(".vue")) {
      loadModuleVue(moduleUrl, cache).then(moduleResolve, moduleReject);
    } else if (moduleUrl.endsWith(".ts")) {
      throw new Error("未实现 ts 模块加载, 需要编译生成对应 js 文件");
    } else {
      console.log("未知模块类型,按 .m.vue 加载", moduleUrl);
      loadModuleVue(moduleUrl, cache).then(moduleResolve, moduleReject);
    }

    return module;
  }

  return loadModule;
})();

/**
 * appendScript
 * @param {string} url
 * @param {boolean} isEsm 是否 esm 模块
 * @param {boolean} cache 是否缓存
 */
function loadScript(url, isEsm = false, cache = false) {
  let ID = url.split("/").join("_");
  url = cache ? url : url + "?v=" + new Date().getTime();
  let script;

  script = document.getElementById(ID);

  let load;

  if (script) {
    if (cache === false) {
      removeScript();
      load = addScript();
    } else {
      load = Promise.resolve(script);
    }
  } else {
    load = addScript();
  }

  function addScript(id = ID, src = url, module1 = isEsm) {
    script = document.createElement("script");
    script.type = "text/javascript";

    script.id = id;
    script.src = src;
    script.dataset.time = new Date().getTime() + "";
    if (module1) script.type = "module";

    document.body.appendChild(script);

    return new Promise((res, rej) => {
      script.onload = () => {
        res(script);
      };
      script.onerror = (e) => {
        rej(e);
      };
    });
  }

  function removeScript() {
    document.body.removeChild(script);
  }

  return load;
}

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
  let App = await loadModule(filePath, cache).then((e) => e.default);
  new Vue({
    render: (h) => h(App),
  }).$mount(eleOrSelector);
}

function myEvalSkipAmd(text) {
  let define2 = window.define;
  let require2 = window.require;
  window.define = undefined;
  window.require = undefined;
  eval(text);
  window.define = define2;
  window.require = require2;
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
