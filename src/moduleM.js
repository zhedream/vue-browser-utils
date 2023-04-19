console.log("moduleM.js loaded");
console.log(document.currentScript?.src);

async function execScriptAsync(script_text) {
  const script_text_eval = `(async ()=>{ ${script_text} })() `;
  return await eval(script_text_eval);
}

function fetchText(url) {
  return fetch(url).then((res) => res.text());
}


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

    const useExposeModule = (moduleResolve) => {
      return (callModule) => {
        // 接收一个普通 vue 组件对象, 或 Promise 对象
        const mod = callModule();
        moduleResolve(mod);
        return mod;
      }
    };

    const exposeModule = useExposeModule(moduleResolve);

    let script_text = await fetchText(moduleUrl);
    // console.log(script_text);
    script_text = transformCodeToExposeModule(script_text);
    // console.log("script_text: \n", script_text)

    const script_text_eval = `(async ()=>{ 
        try{
          ${script_text} 
        }catch(e){
          console.error('加载模块失败', moduleUrl,e)
          moduleReject()
        }
      })() `;

    // 不要 const mod = await eval(script_text_eval);
    const mod = await eval(script_text_eval);
    moduleResolve(mod);

    return moduleCache[moduleUrl];
  }

  return loadModule;
})();

var importModule = (() => {
  const moduleCache = {};

// 维护依赖关系
  function useDefineExpose(module, injectContext, callExpose) {
    async function defineExpose(...args) {
      // 接收一个普通 vue 组件对象, 或 Promise 对象
      const len = args.length;
      if (len === 1) {
        const arg = args[0];
        if (typeof arg === "function") {
          const res = await arg(injectContext); // Promise<{}>
          if (typeof res !== "object") {
            console.error("defineExpose function 返回值必须是 {} 或 Promise<{}>");
          }
          Object.assign(module, res);
        } else if (typeof arg instanceof Promise) {
          const res = await arg;
          if (typeof res !== "object") {
            throw new Error("defineExpose 接收 {} 或 Promise<{}>");
          }
          Object.assign(module, res); // Promise<{}>
        } else if (typeof arg === "object") {
          Object.assign(module, arg); // {}
        } else {
          throw new Error("defineExpose 参数错误")
        }
      } else if (len === 2) {
        const key = args[0];
        const value = args[1];
        module[key] = value;
      } else {
        throw new Error("defineExpose 参数错误")
      }
    }

    // return defineExpose;
    // 截至异步脚本 执行完毕, 劫持 调用次数
    return function (...args) {
      let res = defineExpose(...args);
      callExpose(res);
      return res;
    };
  }

  function fetchText(url) {
    const len = arguments.length;
    console.log("len: ", len);
    console.log("arguments: ", arguments);
    return fetch(url).then((res) => res.text());
  }

  async function importModule(moduleUrl, isCache = true, injectContext) {
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

    const module = {};
    const defineExposeList = [];
    const defineExpose = useDefineExpose(module, injectContext, (expose) => {
      defineExposeList.push(expose);
    });
    const script_text = await fetchText(moduleUrl);
    const script_text_eval = `(async function(){
              try{
                ${script_text} 
              }catch(e){
                console.error('加载模块失败', moduleUrl, e);
                moduleReject(e);
              }
            })() `;
    await eval(script_text_eval);
    await Promise.all(defineExposeList);
    moduleResolve(module);
    return module;
  }

  return importModule;
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

    return new Promise((res, rej) => {
      script.onload = () => {
        res(script);
      };
      script.onerror = (e) => {
        rej(e);
      };
    });
  }

  document.body.appendChild(script);

  function removeScript() {
    document.body.removeChild(script);
  }

  return load;
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

function requireModuleList(modules) {
  return new Promise((res) => {
    window.require(modules, function (...args) {
      res(args);
    });
  });
}

function requireModule(module) {
  return new Promise((res) => {
    window.require([module], function (module) {
      res(module);
    });
  });
}
