const useDeFineComponent = (Vue, template, resolve) => (call) => {
  let component = call(Vue, template);
  resolve(component);
  return component;
};

function loadAsyncComponent(url, name) {
  return () => {
    let comResolve;
    let com = new Promise((res) => (comResolve = res));

    // 加载组件
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        let div = document.createElement("div");
        div.innerHTML = html;
        const template = div.querySelector("template").innerHTML;

        // https://stackoverflow.com/questions/11513392/how-to-detect-when-innerhtml-is-complete
        // https://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
        const script = div.querySelector("script");
        const style = div.querySelector("style");
        const defineComponent = useDeFineComponent(Vue, template, (component) =>
          comResolve(component)
        );
        const script_text = script.innerHTML.trim();
        const script_text_eval = `${script_text}`;
        eval(script_text_eval);

        // 加载样式
        if (style) {
          // TODO: 可以使用文件hash值,作为 id
          style.id = "style_" + name;
          if (document.getElementById("style_" + name)) {
            document.getElementById("style_" + name).innerHTML = style.innerHTML;
          } else {
            document.head.appendChild(style);
          }
        }

        div.remove();
        div = null;
      });

    return com;
  };
}

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
