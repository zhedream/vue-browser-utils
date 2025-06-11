# 异步 template 组件

在 browser 环境中更优雅地编写 Vue 组件, 就像写 .vue 单文件组件

## 安装

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

## API

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

## 升级版 moduleM.js

自定义模块运行时, 用于在浏览器环境中加载 自定义模块 xx.m.js xx.m.vue

m 模块 使用 esm 语法, 无需打包, 直接在浏览器中运行

兼容性: JavaScript 的 ECMAScript 2017（ES8）

外部使用 loadModule 加载模块

新增模块引入支持

引入 Amd 模块

支持 ES6 模块, AST 转换成 自定义模块语法

支持 .vue 文件

# 自定义模块插件

moduleM.js 支持使用 js (ES 语法)文件。支持 .vue 文件。支持 .ts/.tsx 文件的模块加载。

loadModule 函数为核心函数，支持加载 js 文件，vue 文件，ts 文件。

mountModuleVue 可以将 .vue ，挂载到指定的 dom 上。

runModuleMJs 可以运行 js 文件。

## 全局库的引入

```js
import { ref } from "vue";
```

moduleM.js `loadModule` 配置 `moduleMap，` 或者 定义全局变量 `GlobalModuleMMap`

```js
const moduleMap = {
  vue: () => {
    // 一些库需要手动处理 默认导出。
    Vue.default = Vue;
    return Vue;
  },
  "ant-design-vue": () => antd,
};
```

## 关于 .vue 文件

只能有一个 template、script 、style 标签.

script 需要默认导出 options api，不支持 setup.

script 支持 ts 语法，需要引入 `transformTs.min.js` 或 `transformTsx.min.js`

style 也支持 less, scss 需要引入库依赖。

## js/ts/tsx 模块的引入

**模块导入的缺陷**：需要以根路径为基准,保证路径唯一且一致，不支持相对路径。不支持循环引用。

```js
import { sum } from "/xx/sum.js"; // 不推荐，编辑器不友好
import { sum } from "xx/sum.js"; // 不推荐, 不利于重构
```

这俩种写法都能引入同一个文件，但实际在内存中不是同一个模块，由于路径不一致，缓存不能命中，会被实例化多次。

引入 ts/tsx 同理。

```js
import { sum } from "/xx/sum.ts"; // 不推荐，编辑器不友好
import { sum } from "xx/sum.ts"; // 不推荐, 不利于重构
```

对于 .ts 会优先判断是否存在同名 对应编译的 .js 文件，如果存在则加载 .js 文件，否则会实时编译加载 .ts 文件。

实时编译需要引入 `transformTs.min.js` 或 `transformTsx.min.js`

不推荐实时编译 ts 文件。主要是引入 transformTsx 体积大。建议提前编译好 ts 文件。

自动补全写法： 支持省略 .js/.ts/.tsx 后缀, 会自动查找加载对应的文件。

```js
import { sum } from "xx/sum"; // 推荐写法
```

会依次补全 `.js` `.ts` `.tsx` 后缀，查找对应的文件。

## 手动编译 ts 文件

安装 babel 编译 ts 文件

```bash
pnpm install --save-dev @babel/core @babel/cli @babel/preset-env babel-preset-typescript babel-plugin-transform-vue-jsx babel-plugin-syntax-jsx
```

编译 .tsx

```bash
npx babel server.ts --out-file server.js --presets babel-preset-typescript --plugins babel-plugin-transform-vue-jsx
```

编译 .ts

```bash
npx babel server.ts  --out-file server.js  --presets babel-preset-typescript
```

## webstorm File Watchers 自动编译 ts 文件

手动编译太繁琐，可以使用 webstorm File Watchers 自动修改后编译

设置->工具->File Watchers

添加一个新的 File Watchers 选择 babel 模板, 修改文件类型选择 TypeScript,

配置以下两项，保存即可完成配置，后续修改 .ts 文件后会自动编译成 .js 文件

    文件类型： TypeScript

    实参：$FileDir$/$FileName$  --out-file  $FileDir$//$FileNameWithoutExtension$.js  --presets babel-preset-typescript

# 编译环境（最新 babel7 版本）

vue2 的 jsx playground 在线编译环境

https://jsx-vue2-playground.netlify.app/

## babel7 standalone 代码编译 tsx

standalone 内置 typescript 预设

```bash
pnpm i @babel/standalone @vue/babel-preset-jsx -D
pnpm i @vue/babel-helper-vue-jsx-merge-props vue@2.7.16
```

## babel7 cli 编译 tsx

```bash
pnpm i @babel/cli @babel/preset-typescript -D
pnpm i @vue/babel-preset-jsx -D
pnpm i @vue/babel-helper-vue-jsx-merge-props vue@2.7.16
```

```js babel.config.js
// cli + 配置
// npx babel .\test.tsx  --out-file .\test.js
module.exports = {
  presets: [
    [
      '@vue/babel-preset-jsx',
      {
        vModel: false,
        compositionAPI: 'native',
      },
    ],
    '@babel/preset-typescript'
    // ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
  ],
  plugins: []
}
```
## babel7 core 自定义编译 import、export 语法

src/transformExportFrom.js
src/transformImportFrom.js

```bash
pnpm i @babel/parser @babel/traverse @babel/generator @babel/types -D
```
