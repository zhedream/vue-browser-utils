var loadAsyncComponent = ((Vue, less) => {
  const useDeFineComponent = (Vue, template, resolve) => (call) => {
    // 接收一个普通 vue 组件对象, 或 Promise 对象
    let component = call(Vue, template);
    resolve(component);
    return component;
  };

  const comCache = {};
  const loadFnCahce = {};
  function loadAsyncComponent(url, isCache = true) {
    let key = url.split("/").join("_");

    // 保证返回同一个函数, 保证同一个组件只加载一次
    if (isCache && loadFnCahce[key]) {
      return loadFnCahce[key];
    } else {
      loadFnCahce[key] = () => {
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
            const defineComponent = useDeFineComponent(Vue, template, comResolve);
            const script_text = script.innerHTML.trim();
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
      return loadFnCahce[key];
    }
  }

  return loadAsyncComponent;
})(Vue, less);

module.exports = { loadAsyncComponent };

/* 

// 编写组件 AComponent.html

<template>
  <div @click="test">{{title}}</div>
</template>
<script>
  defineComponent((Vue, template) => {
    return {
      name: "AComponent",
      ...Vue.compile(template),
      props: {
        title: {
          type: String,
          default: "我是A组件1",
        },
      },
      created() {
        console.log("我是A组件的created1");
      },
      methods: {
        test() {
          hello2();
        },
      },
    };
  });

  function hello2() {
    console.log("fff");
  }
</script>

// 使用组件 page



new Vue({
  components: {
    
  },
  render(h) {
    return h("div", [
      [
        h("a-component", {}),
      ],
    ]);
  },
})

*/
