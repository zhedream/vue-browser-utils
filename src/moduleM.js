console.log("moduleM.js loaded");
console.log(document.currentScript?.src);

async function execScriptAsync(script_text) {
  const script_text_eval = `(async ()=>{ ${script_text} })() `;
  return await eval(script_text_eval);
}

function fetchText(url) {
  return fetch(url).then((res) => res.text());
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

var loadModuleJs = (() => {

  const moduleCache = {};
  const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

  async function loadModuleJs(moduleUrl, isCache = true) {

    let key = moduleUrl.split("/").join("_");

    let [moduleResolve, moduleReject, p] = resolveModule();

    if (isCache && moduleCache[key]) {
      return moduleCache[key];
    } else {
      moduleCache[key] = p;
    }

    let script_text = await fetchText(moduleUrl);

    const useExposeModule = (moduleResolve) => {
      return (callModule) => {
        // 接收一个普通 vue 组件对象, 或 Promise 对象
        const mod = callModule();
        moduleResolve(mod);
        return mod;
      }
    };

    const exposeModule = useExposeModule(moduleResolve);

    // console.log(script_text);
    script_text = transformCodeToExposeModule(script_text);
    // console.log("script_text: \n", script_text)

    const fn = new AsyncFunction("exposeModule", script_text);
    const mod = await fn(exposeModule).catch((e) => {
      console.error("加载模块失败", moduleUrl, e);
      moduleReject();
    })

    // 兼容 代码片段 return 写法. 如 `class A{} ; return {A}`
    moduleResolve(mod);

    return moduleCache[key];
  }

  return loadModuleJs;

})();

// ==================  处理 vue 模块 ==================
function transformDefineComponent(str) {

  if (str.indexOf("defineComponent") > -1) {
    return str;
  }

  if (str.indexOf("export default") === -1) {
    return str;
  }


  // 匹配出 export default { ... } 中的内容
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
  const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

  async function loadModuleVue(moduleUrl, isCache = true) {

    let key = moduleUrl.split("/").join("_");

    let moduleResolve, moduleReject;
    if (isCache && moduleCache[key]) {
      return moduleCache[key];
    } else {
      moduleCache[key] = new Promise((resolve, reject) => {
        moduleResolve = resolve;
        moduleReject = reject;
      });
    }

    let text = await fetchText(moduleUrl);
    let div = document.createElement("div");
    div.innerHTML = text;

    // =======================  处理 template =======================

    const template = div.querySelector("template").innerHTML;
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

    // 代码转换:  defineComponent
    script_text = transformDefineComponent(script_text);
    // 代码转换:  import
    const ast = transformCodeToExposeModule.parse(script_text, {
      sourceType: "module",
    });
    transformCodeToExposeModule.transformImport(ast);
    script_text = transformCodeToExposeModule.generator(ast).code;

    // 执行代码, 加载代码
    //     const script_text_eval =
    //       `
    // (async ()=>{
    //   try{
    //     ${script_text}
    //   }catch(e){
    //     console.error('加载模块失败', url, e);
    //     comReject();
    //   }
    // })();`;
    //
    //     eval(script_text_eval);

    const fn = new AsyncFunction("defineComponent", script_text);
    fn(defineComponent).catch((e) => {
      console.error("加载模块失败", moduleUrl, e);
      moduleReject();
    });

    div.remove();
    div = null;

    return moduleCache[key];
  }

  return loadModuleVue;

})(Vue, less);

var loadAsyncComponent = (() => {

  const loadFnCache = {};

  function loadAsyncComponent(url, isCache = true) {
    let key = url.split("/").join("_");

    // 保证返回同一个函数, 保证同一个组件只加载一次
    if (isCache && loadFnCache[key]) {
      return loadFnCache[key];
    } else {
      loadFnCache[key] = () => loadModule(url, isCache).then(mod => mod.default);
      return loadFnCache[key];
    }
  }

  return loadAsyncComponent;
})();

// TODO: 加载自定义模块, 同时并行加载, 同时用到一个模块, 可能会重复请求记载, 存在锁问题, 使用 Promise 解决
var loadModule = (() => {
  const moduleCache = {};

  async function loadModule(moduleUrl, isCache = true) {
    let moduleResolve, moduleReject;
    if (isCache && moduleCache[moduleUrl]) {
      return moduleCache[moduleUrl];
    } else {
      moduleCache[moduleUrl] = new Promise((resolve, reject) => {
        moduleResolve = resolve;
        moduleReject = reject;
      });
    }

    // .js
    if (moduleUrl.endsWith(".js")) {
      loadModuleJs(moduleUrl, isCache).then((mod) => {
        moduleResolve(mod);
      });
    }
    // .vue
    else if (moduleUrl.endsWith(".vue")) {
      loadModuleVue(moduleUrl, isCache).then((mod) => {
        moduleResolve(mod);
      });
    } else {
      console.log("未知模块类型,按 .m.vue 加载", moduleUrl)
      loadModuleVue(moduleUrl, isCache).then((mod) => {
        moduleResolve(mod);
      });
    }

    return moduleCache[moduleUrl];
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

