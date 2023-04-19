var loadAsyncComponent = ((Vue, less) => {

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


  const useDefineComponent = (Vue, template, resolve) => (callComponent) => {
    // 接收一个普通 vue 组件对象, 或 Promise 对象
    let component = callComponent(Vue, template);
    resolve(component);
    return component;
  };

  const comCache = {};
  const loadFnCache = {};

  function loadAsyncComponent(url, isCache = true) {
    let key = url.split("/").join("_");

    // 保证返回同一个函数, 保证同一个组件只加载一次
    if (isCache && loadFnCache[key]) {
      return loadFnCache[key];
    } else {
      loadFnCache[key] = () => {
        let comResolve, comReject;
        if (isCache && comCache[key]) {
          return comCache[key];
        } else {
          comCache[key] = new Promise((res, rej) => {
            comResolve = res;
            comReject = rej;
          });
        }
        // 加载组件
        fetch(url)
          .then((res) => res.text())
          .then(async (html) => {
            let div = document.createElement("div");
            div.innerHTML = html;
            const template = div.querySelector("template").innerHTML;

            // https://stackoverflow.com/questions/11513392/how-to-detect-when-innerhtml-is-complete
            // https://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
            const script = div.querySelector("script");
            const style = div.querySelector("style");
            if (style && style.lang === "less") {
              let r = await less.render(style.innerHTML);
              style.innerHTML = r.css;
            }
            const defineComponent = useDefineComponent(Vue, template, comResolve);
            let script_text = script.innerHTML.trim();
            // 处理 defineComponent
            script_text = transformDefineComponent(script_text);

            // 处理 import
            const ast = transformCodeToExposeModule.parse(script_text,{
              sourceType: "module",
            });
            transformCodeToExposeModule.transformImport(ast);
            script_text = transformCodeToExposeModule.generator(ast).code;

            const script_text_eval = `(async ()=>{ 
              try{
                ${script_text} 
              }catch(e){
                console.error('加载模块失败', url, e);
                comReject();
              }
            })() `;

            eval(script_text_eval);

            // 加载样式
            if (style) {
              style.id = "style_" + key;
              if (document.getElementById("style_" + key)) {
                document.getElementById("style_" + key).innerHTML = style.innerHTML;
              } else {
                document.head.appendChild(style);
              }
            }

            div.remove();
            div = null;
          })
          .catch((err) => {
            console.error(err);
          });

        return comCache[key];
      };
      return loadFnCache[key];
    }
  }

  return loadAsyncComponent;
})(Vue, less);




