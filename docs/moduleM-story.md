# 没有重写的这几年：我怎样把一个老 Vue 项目慢慢改成了能写模块的样子

我的一个老项目，这几年一直在慢慢长大。

它是个网格化监管系统，里面有地图、表格、统计分析，还有各种业务页面。项目很早，没有统一的 Vue 脚手架。最初的开发方式很直接：写 HTML，引入 Vue，`new Vue`，再通过 jQuery 的 `load` 把 HTML 加载进主页面。

能用，也上线了。业务继续加，代码也继续加。

后来我在这个项目里做出了一套叫 moduleM 的东西，能加载 `.vue`、`.js`、`.ts`，还能做一些编译转换。现在看它，好像是在写一个浏览器模块运行时；但我最开始真的没打算做这么大。

我只是越来越不想在一个页面里继续堆那么多代码了。

## 重写？项目中间还真计划过

领导曾经计划把项目升级到 Vue 脚手架，也做过一部分。后来计划没继续下去，维护的同事也离职了。

留下来的现状有点尴尬：原项目越来越不好开发，新方案又是个半成品。

我也不想接着把它升级到 Vue 3。尤其地图那一块还有 ArcGIS、Dojo，看着就不像能轻松搬过去的。项目不一定给时间，一个人要把那么多业务重新测一遍，想想就头大。

而且老项目挺稳定的。站在业务角度，它没有坏到必须重写，确实也没有那么大的升级动力。

但开发难受是真的。没有顺手的模块化方式，大家自然继续往页面里堆。也没人特别想承担一次大改造。

所以我就一点一点改。哪块写起来别扭，先想办法让它舒服一点。没想到这么改了几年，最后居然凑出了一套自己的东西。

## 最早的进步，是把 HTML 从字符串里拿出来

一开始，我熟悉的就是 HTML 加 `new Vue`。后来知道可以用 `Vue.component` 抽组件，模板大概这样写：

```js
Vue.component('my-component', {
  template: `<div>{{ message }}</div>`,
  data() {
    return { message: 'hello' };
  },
});
```

小组件还行，模板一长就不舒服。HTML 写在 JS 字符串里，编辑、高亮都不顺手。

后来发现，模板还可以这么写：

```html
<template id="my-component-template">
  <div>{{ message }}</div>
</template>
```

```js
Vue.component('my-component', {
  template: '#my-component-template',
  data() {
    return { message: 'hello' };
  },
});
```

现在看，这就是 Vue 本来的 API。但当时我意识到，原来不只是根节点 `app` 能关联页面里的内容，普通组件的模板也能用选择器找到。

这里 `el` 和 `template` 不是同一个意思：一个是挂载位置，一个是模板来源。可对当时的我来说，最大的收获就是：终于能把模板当 HTML 好好写了。

于是我做了一种约定：一个 `xxx.component.html`，旁边再配一个 `xxx.component.js`。

HTML 里面放模板、注册组件的脚本和样式。JS 则负责同步 Ajax 请求这个 HTML，再通过 jQuery 把它追加到一个隐藏容器中。

```js
$.ajax({
  url: 'components/my-component.component.html',
  async: false,
  success(html) {
    const box = $('<div style="display:none"></div>').html(html);
    $('body').append(box);
  },
});
```

是的，`async: false`，同步请求。这里是历史代码，可别照着当新项目规范用。

这依赖当时 jQuery 插入内容时对脚本的处理，不是原生 `innerHTML` 会自动执行脚本。当时它确实解决了我的问题：页面引入一个 JS，就能把一个 HTML 组件装进来。

这次翻 Git，地图选点组件在 2021 年 4 月就这样写了，因子选择组件是同年 5 月。选点组件里还封装了坐标 props、change 事件、地图创建和销毁。组件开始不只是“一段能复用的 HTML”，也可以管自己的交互和资源。

## 地图弹窗，让我多认识了几个 Vue API

同时，我还在折腾地图弹窗。

弹窗不太像普通页面里的组件。点地图上的一个东西，传一份数据进去，在指定位置创建内容，关掉以后再清理。

那时我围着 `Vue.compile`、`Vue.extend` 写了不少东西。天气弹窗里就有这样的核心逻辑：

```js
const compiled = Vue.compile(template);
const Modal = Vue.extend({
  render: compiled.render,
  staticRenderFns: compiled.staticRenderFns,
});

function createModal(id, data) {
  return new Modal({
    data() {
      return { detail: data };
    },
  }).$mount('#' + id);
}
```

外面先 Ajax 拿到模板，再把模板编译成 render，创建构造器，最后按需要创建实例、挂载。

这个时候，我对组件的理解开始变了。

组件可以先是一份 options 对象。模板可以编译成渲染函数。定义组件、创建实例、把实例放进 DOM，可以分开做，并不一定要全挤在一个 `new Vue` 里面。

这套写法不是后来才突然想出来的。Git 里 2020 年末已经有地图弹窗的探索，2021 年又在不同弹窗上继续用。很多理解，是写着写着才串起来的。

## container、template、init()，我还经历过这么一个时期

到联网状态页面，我又开始试局部组件。

模板仍放在页面 HTML 里，用 ID 标记；逻辑则拆到 `MyTable.js`、`MyTable1.js`、`MyTable2.js` 这些文件中。

```js
const MyTable2 = {
  template: '#onlineStatus-my-table2',
  // 自己的 data、methods、computed……
};
```

各个脚本把组件收集到一个对象里，最后交给页面：

```js
new Vue({
  el: '#onlineStatus',
  components: onlineStatusComponents,
});
```

当时还用了 `window` 暂存这个集合，但注册已经是页面局部的，不再什么都 `Vue.component`。

接着我给页面加了三个容器：HTML container、CSS container、script container，再写一个 `init()`。

`init()` 里面列出要加载的 HTML、CSS 和 JS。先拿 HTML，放进去，再插样式和脚本。组件脚本放前面，页面入口放最后。

这套东西在 2021 年 9 月的提交里就有了。

当时我还没有什么“模块依赖图”的概念，就是觉得资源顺序应该有人管一下，不要每次都靠手工往页面末尾添东西。

现在回头看，前面的 HTML 全局组件，把一个组件的内容放到了一起；这里的局部组件，又让我开始管组件的作用范围。这两种尝试后来才慢慢合到一起。

## 加载组件的代码怎么又复制了一遍？那就抽个函数吧

Ajax、取模板、执行脚本、注册组件……这几件事开始反复出现。

于是就有了 `loadAsyncComponent`。

我把组件写成一个 HTML 文件，大概是这样：

```html
<template>
  <input :value="value" @input="$emit('input', $event.target.value)">
</template>
<script>
  defineComponent((Vue, template) => {
    return {
      ...Vue.compile(template),
      props: ['value'],
    };
  });
</script>
```

这里的 `defineComponent` 是我自己给加载器约定的函数，和 Vue 官方那个同名 API 不是一回事。

加载器去获取 HTML，提取 template 和 script，执行脚本时提供这个函数。组件回调把 options 返回来，加载器再把结果交给 Vue 的异步组件机制。

使用时终于可以简化成：

```js
components: {
  MyInput: loadAsyncComponent('components/my-input.html'),
}
```

组件不用给自己起一个全局模板 ID，也不用自己到处注册。谁需要，谁加载。

vue-browser-utils 就是在这条路上独立出来的。我原来还以为可以从库的首次提交开始讲历史，结果这次发现：业务项目 2022 年 5 月已经引入了它，库仓库的首次提交却是 6 月。项目里先折腾出来，再整理到库里，这种情况后来也发生了很多次。

## 组件拆完了，我又想拆 helper.js

组件里面仍然有很多数据、树处理、接口和辅助函数。

我想把它们拆出去。一个文件负责一件事，需要的时候拿过来用。

项目里本来就有 ArcGIS、Dojo，也有 AMD。RequireJS 自然就成了中间态。我先把 `require` 包成 Promise，这样就可以 `await requireModule(...)`。

然后又想，能不能更直接一点？

把 JS 文件当字符串请求回来，放到函数里执行，得到它返回的东西，不就行了吗？

我还真的写过这样的文件：

```js
let dd = await loadModule('data2.js');

return {
  name: aa(),
  methods: {},
  dd,
};

function aa() {
  return 123;
}
```

这个例子保留了 2022 年历史文件的结构，只缩短了路径。

对，直接在 JS 文件顶层写 `return {}`。它不是合法的普通脚本，也不是标准 ES 模块，编辑器当然会觉得不对。

但我的加载器拿到的是字符串，会把它包装成函数体：

```js
const source = await fetchText(url);
const result = await eval(`(async () => { ${source} })()`);
```

放进函数以后，return 就成立了。

我记忆里还有 `new Function`。翻代码发现，最早保存下来的写法是 `eval` 加异步函数包装，后来才明确用了 `AsyncFunction` 构造器。记忆把这些相近的尝试揉到了一起，代码倒还留着。

实际拆出去的也不只是测试数据。树遍历、查找之类的 helper，确实用这种方式返回过。

当然，这种执行方式只能用于自己信任的代码，不能把不可信文本随便拿来执行。那时我是想办法让自己项目里的文件能组织起来，并没有实现一套安全沙箱。

## defineReturn 居然还在

这次整理历史时，我想起自己好像写过一个叫 `defineReturn` 的东西。

大意是：直接 return 会让编辑器报错，那我先写成一个正常函数调用，加载时再替换一下呢？

我一度以为代码找不到了。结果 AI 去翻 Git，还真找到了，而且当前运行时里居然还留着：

```js
script_text = script_text.replace('defineReturn', 'return ');
```

按这条规则，类似这样的写法：

```js
defineReturn({ helper });
```

会变成函数体里的：

```js
return ({ helper });
```

上面是按规则还原的示意，这次没找到已提交的业务调用。不过替换代码确实在。

更有意思的是时间。我的记忆顺序是：先 return，再 defineReturn，再 exposeModule。Git 却显示，`exposeModule` 在 2023 年就有了，`defineReturn` 到 2024 年才提交。

我显然不是想明白一套、删掉一套，再开始下一套。很多写法是在同时尝试，也会回头补兼容。老代码里那些看起来重复的东西，有些就是这么留下来的。

中间还有过 `defineExpose`：给文件注入一个函数，让它把对象或者回调结果交出来。它同样不是 Vue 的那个宏，也是我自己的约定。

到这里，我才越来越清楚自己在解决什么：一个文件里的代码，怎样有自己的作用域，怎样取得依赖，又怎样把结果交给别人。

## .vue 和 import/export，也不是一次换完的

HTML 组件能用了，我又惦记起高亮和提示。

既然已经有 template、script、style，那换成 `.vue` 呢？编辑器不是更懂这种文件吗？

于是自定义加载器也开始读 `.vue`。这条路线在业务项目 2022 年 9 月就已经出现了，当时文件里仍然是 `await loadModule(...)` 和 `defineComponent(callback)`。

所以，用了 `.vue` 扩展名，不代表我已经用上了标准 SFC 编译链。先改善编辑体验，再慢慢处理语法，是当时的实际过程。

后来，我希望代码能这样写：

```js
import { getData } from '@/api/data';
export const result = await getData();
```

可我的运行时认识的是 `loadModule` 和 `exposeModule`。

那就转换。

2023 年 4 月，我把 Babel AST 接了进来：parse 成语法树，处理导入和导出，再生成代码。转换后的核心关系大概是：

```js
const imported = await loadModule('@/api/data');
const getData = imported.getData;
const result = await getData();
exposeModule(() => ({ result }));
```

这里省略了真实的临时变量和执行包装。

写代码时用熟悉的 import/export，执行时接到自己的模块协议。moduleM 的名字在 2022 年 11 月已经出现，到了这里，它确实越来越像一个模块运行时了。

不过，支持一些 ES 模块写法，不代表完整实现了原生 ESM 的所有语义。这些边界到现在也需要承认。

## 再加一点类型，再加一点编译……怎么有点 Webpack 的感觉了

接着又想要 TS 类型提示，也想写 JSX、TSX。

这部分也是分着做的。业务项目在 2024 年 4 月已经加入 TS 配置、类型声明和 Babel 工具；库在同年 7 月继续整理 TSX 转换。让 Babel 去掉类型、把 JSX 变成 render 调用，浏览器就能执行。

类型提示、类型检查、去掉类型后执行，是不同的事。我这套能转换 TS，不代表已经替我把类型都检查好了。

到这个阶段，我确实觉得：这东西怎么有点 Webpack 的感觉了？

它开始识别不同资源、转换语法、加载依赖，能处理 `.vue`、`.ts`、`.js`。但它仍然主要按 URL 在浏览器里加载，不是把整个项目打成一个现代应用包。

这和项目的现实正好接上。主壳、旧 HTML、地图还在跑，新页面可以先用更舒服的方式写，不要求所有人同时换掉整套项目。

## 我在 2022 年写过一个“终极目标”

早期 demo 笔记最后有一条 TODO：想写个 VS Code 插件，让代码像 Less 编译 CSS 一样自动编译。

当年觉得这大概是终极方案了。

后来我没有自己完成一个编辑器插件，而是先用 File Watcher 调 Babel。2024 年保存 TS 自动生成 JS；2025 年又加入 moduleM 专用的执行环境，生成 `.m.js` 和 source map。

这里还有个容易忘掉的历史包袱：2022 年我也用过 `.m.js`，但当时它是手写模块源码的名字。到了 2025 年，同一个后缀又开始表示预编译产物。所以今天不能看见 `.m.js`，就认定它一定已经编译过。

预编译以后，浏览器拿到的是包装好的模块。加载器通过 `document.currentScript` 关联本次执行的上下文，让模块交回导出，或者报告错误。

浏览器里临时转换的路径还保留着，两边要能配合，不能各自变成一套不一样的规则。

## 最近，终于把自动编译从编辑器里搬了出来

File Watcher 能用，但换个人、换台电脑，就要装插件、配环境。

最近这一轮，我把它改成了 `npm run dev` 自动启动编译监听。库对外只留四个命令：

```sh
npm run dev
npm run build
npm run sync -- <目标目录>
npm test
```

看起来只是少装一个插件，实际顺着处理了不少小问题。

比如以前编译出来的临时变量名带随机值，同样的代码再编译一次，Git 就能多出一堆变化。现在改成稳定命名。编译结果没变就不覆盖文件，连修改时间也尽量不碰。

缓存也不能只是“这个文件上次编译过”。源码、配置、插件、依赖版本和输出内容，都要考虑。否则快是快了，改了代码却没生效，那更难受。

项目里的运行时和独立库，也慢慢产生过不同的修改。这次一起整理，把包映射和资源路径移到项目配置中，让库尽量不认识具体业务；再把旧入口、重复实现、源码和产物目录收拾了一遍。

现在能比较舒服地写 `.vue` 和 TS。还不是完美兼容标准 Vue 和 ES 模块，但对这个项目来说，已经是很大的变化。

这套“屎山代码”，又能继续愉快地堆砌了。哈哈。

至少现在再加东西时，我有地方把它拆出去了。

## AI 也在这个过程中换了位置

这次整理历史，我才重新看到一个 2024 年的提交，标题是“生成接口与 cursor promt”。里面的提示很简单：参考这个接口文件，再帮我写另一个接口。

这不能代表我第一次用 AI，只是 Git 里留下了明确记录。

后来仓库里开始有 Cursor 环境规则，再后来有 AGENTS、CLAUDE 和架构文档。原来每次都要重新解释的项目约定，慢慢可以放进仓库。

到这轮修改，AI 已经在帮我跨两个仓库找差异、改编译和缓存、迁移旧调用、跑测试、进浏览器检查，再一起整理这些历史。

但这次也有一个很真实的过程：AI 最初总结得太快，把我早年围着 Vue API 摸索的阶段一笔带过了。

我就继续给它指文件：看看 MyTable2，看看 FactorSingle，看看天气弹窗，再找找 defineReturn。

于是它回去查，我也跟着想起来：哦，原来我那时还这么写过。

有些细节 AI 能帮我找到，有些当时的感觉只有我记得。两边拼起来，这段历史才比较像我真的走过的路，而不是一份按年份排好的功能清单。

## 又有一个新的“终极目标”

现在我又在想，后面是不是可以把 `.vue` 也提前编译成 JS？

连模板都提前处理好，浏览器少做一点解析和编译，应该还能省些工作。当然，要真的把模板、脚本和样式的处理接好，不能只换个扩展名就算完成了。

其实目前也没遇到什么明显的性能瓶颈。

哈哈，又一个终极目标。

还有一件更实际的事：把那些 HTML 里直接 `new Vue` 的代码，随着业务修改慢慢整理成组件和 ES 模块。

我希望等这样的代码越来越多，将来真的要迁 Vue 3 + Vite 时，不会再面对一整块拆不开的东西。到时还有 Vue 2 API、UI 库、ArcGIS 和 AMD 的兼容问题，不是文件改成 `.vue` 就能自动搬过去。但接口、状态、地图创建和销毁如果已经分清楚，总能少一些同时要解决的问题。

最终，moduleM 也许就不需要了。

我倒没有一定要把它一直做下去的想法。它能让这个老项目继续稳定运行，让我还能愿意给它写新代码，再帮这些代码慢慢走到下一套工具链里，就已经挺好了。

到那一天，再看着现在这些 `loadModule`、`exposeModule`，大概又会想起来：原来当年为了少往一个 HTML 里堆点东西，我还折腾过这么一套。

---

项目：[vue-browser-utils](https://github.com/zhedream/vue-browser-utils)。本文代码有适当简化，历史写法不作为新项目的默认建议。具体时间、提交号和不同阶段的技术区别，整理在 [moduleM 发展史](moduleM-history.md)；当前用法见 [README](../readme.md)。
