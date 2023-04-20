# 异步 template 组件

在 browser 环境中更优雅地编写 Vue 组件, 就像写 .vue 单文件组件

# 安装

```bash
# 下载依赖
pnpm i
# 打包 UMD 模块
pnpm run build
```

## 定义组件

```html
<template>
  <div @click="test">{{title}}</div>
</template>
<script>
  defineComponent((Vue, template) => {
    return {
      name: "DemoComponent",
      ...Vue.compile(template),
      props: {
        title: {
          type: String,
          default: "我是Demo组件",
        },
      },
      created() {
        console.log("我是Demo组件的created");
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
<style></style>
```

## 使用

在没有 requirejs 的环境,会暴露全局 vueBrowserUtils

```js
// <script src="vue-browser-utils.js"></script>
const { loadAsyncComponent } = vueBrowserUtils;

new Vue({
  components: {
    AComponent: loadAsyncComponent("../components/demo.html", "AComponent"),
  },
  render(h) {
    return h("div", [
      [
        h("a-component", {
          props: {
            title: "我是A组件",
          },
        }),
      ],
    ]);
  },
}).$mount("#app");
```

在 requirejs 环境, 则使用 require 引入改模块

```js
require(["vue-browser-utils.js"], function (u) {
  const { loadAsyncComponent } = u;

  new Vue({
    el: "#app",
    components: {
      AComponent: loadAsyncComponent("../components/demo.html", "AComponent"),
    },
  });
});
```

# API

loadAsyncComponent

加载 异步 html 组件: 参数 1: 组件路径参数 2: 唯一 ID

getTemplateString

fetchTemplateString

extendTemplate

renderTemplate

defineAsyncTemplateComponent

compile

defineComponent

requireModuleList

requireModule


# 升级版 moduleM.js

自定义模块运行时, 用于在浏览器环境中加载 自定义模块 xx.m.js  xx.m.vue

m 模块 使用 esm 语法, 无需打包, 直接在浏览器中运行

兼容性: JavaScript 的 ECMAScript 2017（ES8）

外部使用 loadModule 加载模块