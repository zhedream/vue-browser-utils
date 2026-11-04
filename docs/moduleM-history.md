# moduleM 发展史：从一个 HTML 页面，到自己的模块运行时

> 整理日期：2026-11-04。根据作者回忆、原业务项目与 vue-browser-utils 的 Git 历史、早期笔记和协作记录整理。本版面向公开仓库读者。
>
> 本文记录探索过程；当前使用方法见 [README](../readme.md)，第一人称叙述见 [博客文章](moduleM-story.md)。历史代码是理解当时思路的材料，不是今天的新代码规范。

“这个项目像小孩一样，慢慢长大了。也是我技术、能力的见证，也是 AI 的历史路程。”

moduleM 的起点，是一个还要不断交付业务的老项目。页面已经很多，地图、表格、统计分析都在里面；最熟悉的开发方式，是写 HTML，再 `new Vue`。想拆一点重复代码、让模板好编辑一点、让另一个文件里的函数能被拿来使用，每次解决一点，后来这些尝试才逐渐长成了运行时。

早期 `demo 笔记` 的一句话很能代表最初的愿望：“比较优雅的在浏览器 写 Vue 组件。”那时还没有现在的目录、编译协议和缓存检查，先遇到的是模板字符串不好写、组件不知道怎样加载，以及一个页面越来越长。

原业务项目不是本仓库的一部分。文中业务文件名和“网格”提交号作为历史出处保留，公开仓库读者不需要访问原项目即可阅读；代表代码已摘录在正文中。“库”提交则可在本仓库历史中追溯。相关运行时已独立到本库，示例系统不依赖原业务后台。

## 怎样阅读这份历史

### 为什么选择一点一点改，而没有接着重写

维护者在这次历史整理中补充：项目中途曾由领导计划升级到 Vue 脚手架，但计划半途停下，参与维护的同事也离职了。这段背景来自亲历回忆，尚未对应到明确的 Git 提交或日期。

当时缺少方便的模块化开发方式，页面持续堆砌，开发越来越困难；团队里也没有形成继续改造的动力。另一方面，现有项目在运行，整体相对稳定。接手未完成的 Vue 3 改造，意味着一个人承担大量迁移和验证工作，尤其是 ArcGIS 地图部分，看起来就很难直接搬过去，项目也未必能留出足够时间。

因此，维护者没有选择接盘那套半成品，而是在原有系统上逐步改善开发方式：先拆模板，再拆组件和辅助函数，再加入模块语法、类型提示与编译。每一步都尽量让现有业务继续工作，也让下一次开发比上一次轻松一点。

用维护者自己的玩笑说，就是这套“屎山代码”又能继续愉快地堆砌了。玩笑背后是很实际的收益：不必先完成一次高风险的整体迁移，也能逐渐把新增代码和旧代码放进更清楚的边界里。

### 证据与记忆的关系

本文区分三类材料：**维护者回忆**用于说明当时为什么想改；**Git 与代码证据**用于确认某种写法何时已经出现；**整理者归纳**用于连接这些变化。提交日期表示可见记录，不等于想法第一次产生的日期。

两个仓库分别简称“网格”和“库”。网格项目是实际业务试验场，库负责抽取和整理；有时项目先做，有时库先实现，再同步回来。不能只看库仓库判断功能起点，也不能把所有尝试排成一条严格的替代链。

维护者回忆的大方向是：

```text
HTML + new Vue
  → Vue.component + 字符串模板
  → 模板移到 HTML，使用模板 ID
  → 理解 Vue.compile、Vue.extend、render 和组件对象
  → 页面局部组件、container、init()
  → 复用 loadAsyncComponent，尝试 RequireJS
  → 拆数据和 helper，自己获取、执行 JS 文本
  → return / 自定义回调 / exposeModule
  → .vue 的编辑体验、import/export 的书写方式
  → TS/TSX、预编译和 source map
  → 编辑器监听逐步变成 npm run dev 的项目能力
```

Git 给这条回忆补了几个重要细节：`.vue` 早于 AST 转换；`defineReturn` 晚于 `exposeModule`；2022 年的 `.m.js` 还不是今天的预编译产物。这些交错本身就是探索的一部分。

## 一、先把页面做出来，再想怎样少堆一点代码

维护者记得，最初能熟练使用的是 HTML 和 `new Vue`。页面切换通过 jQuery 动态加载 HTML，每个页面自己初始化；少量复用通过 `Vue.component`，模板经常写成 JS 字符串。

下面是这一阶段的概念示意，并非某次提交的原样摘录：

```js
Vue.component('some-component', {
  template: `<div>{{ message }}</div>`,
  data() { return { message: 'hello' }; },
});
new Vue({ el: '#app' });
```

代码可以跑，但页面成了默认的组织单位。表格、筛选项、接口、地图操作和状态都容易往同一个文件里放。Vue 并非不能组件化，而是项目还没有一条方便的组件编写和加载路径。

今天的 `LoadDiv` 仍保留着这套主壳机制：把 HTML 加载到指定容器。它没有随着 moduleM 出现而全部重写；新能力一直是在已有业务环境里生长。

网格可见 Git 历史从 2020-08-06 开始，存在 `init-r1386` 这样的导入记录。因此不能认定这是项目真正的出生日期。早期也有 ECharts 组件采用局部构建工具的尝试；“没有工程化工具”更准确地说，是**整个业务项目没有迁入统一的现代构建脚手架**。

## 二、模板能不能离开字符串，重新写回 HTML？

### 独立 HTML 组件与一个同名 JS 加载入口

2021-04-20，网格 `06ee36af` 新增坐标选点组件 `point-marker`；2021-05-19，`bb8c9c2c` 新增因子单选组件 `factor-single`。两者采用同一种约定：

```text
xxx.component.js    加载入口
xxx.component.html  模板、组件逻辑，以及可能存在的样式
```

`factor-single.component.js` 中的核心代码是同步 Ajax：

```js
$.ajax({
  url: 'development/components/FactorSingle/factor-single.component.html',
  async: false,
  type: 'get',
  success(template) {
    const box = $('<div style="display:none"></div>').html(template);
    $('body').append(box);
  },
});
```

它不是组件业务代码，而是让普通 `<script src="...">` 间接加载一个 HTML 组件文件。通过当时 jQuery 的内容插入与脚本处理行为，HTML 中的注册脚本执行，模板进入 DOM。不能把这个行为等同于原生 `innerHTML` 会自动执行脚本。

`pointMarker.component.html` 则把组件内容集中起来：

```html
<template id="pointMarker-component-template">
  <div class="pointMarker-component"><div ref="container"></div></div>
</template>
<script>
  Vue.component('point-marker', {
    template: '#pointMarker-component-template',
    props: ['coor'],
    // mounted、watch、methods、beforeDestroy……
  });
</script>
<style>/* 组件样式 */</style>
```

维护者记得，发现 `template: '#模板锚点ID'` 时，才意识到普通组件也能这样取得模板，并非只有根节点能关联 HTML。Git 能确认，这种写法在 2021 年 4 月就已经存在；无法仅凭提交确定那个认识发生的具体一天。

技术上，`el` 指定实例挂载位置，`template` 选择器指定模板来源。对当时的开发体验而言，更直接的收获是：**终于不用把一大段 HTML 放在 JS 字符串里面了。**

`point-marker` 最初的提交已包含坐标 props、`change` 事件、坐标 watch，以及地图创建和销毁。这时的组件化已开始封装交互和生命周期，不只是把模板复制到另一个文件。

## 三、围绕 Vue.compile、Vue.extend，理解“模板怎样变成实例”

这条路线与全局组件探索并行。网格在 2020 年末已有地图 Vue 弹窗尝试；`createModal1` 在 2021 年初持续演进。2021-06-04，`cb977558` 加入天气预警弹窗，保存了非常清晰的一套写法。

`weatherModal.js` 获取 `weathe-template.html`，然后：

```js
const res = Vue.compile(template);
const createModal = Vue.extend({
  render: res.render,
  staticRenderFns: res.staticRenderFns,
});

weatherModal = (id, e) => {
  return new createModal({
    data() { return { ListData: e.ListData }; },
    // methods、生命周期……
  }).$mount('#' + id);
};
```

这里不需要全局注册，也不依赖父页面通过组件标签创建它。地图代码调用工厂函数，传入数据和容器，拿到一个挂载好的 Vue 实例。

模板文件虽然有 `<template id="aF05f_template">`，该加载代码并没有通过 ID 查询它，而是直接编译 Ajax 返回的模板文本。它与选择器模板方案不是同一条执行路径。

这段代码把几个原本藏在 Vue 使用方式背后的概念展开了：

```text
模板文本 → Vue.compile → render 函数
组件选项 → Vue.extend → 组件构造器
构造器 + 数据 → 实例 → $mount → 页面上的内容
```

维护者回忆中“后来知道 Vue 最终是一个对象、支持异步、render 函数”，更准确地说，是逐渐认识到**组件可以用 options 对象描述，模板能变成 render，定义与实例可以分开处理，组件定义也可以异步取得**。Vue 本身当然不只是一份对象，但这份理解让后面的加载器成为可能。

## 四、联网状态：从全局注册，走到页面自己的组件集合

2021-09-15，`9804fab3` 加入联网状态页面。三个文件之间建立了明确关系：

```html
<!-- onlineStatus.html -->
<template id="onlineStatus-my-table2">...</template>
```

```js
// MyTable2.js
const MyTable2 = {
  template: '#onlineStatus-my-table2',
  // data、methods、computed……
};
// 各组件合并进 window.onlineStatusComponents
```

```js
// onlineStatus.js：示意其核心注册关系
new Vue({
  el: '#onlineStatus',
  components: onlineStatusComponents,
});
```

这里虽然仍通过 `window` 中转组件定义，却已经不是 `Vue.component()` 全局注册。一个页面拥有自己的 MyTip、StatusBlock、MyTable 等组件，业务逻辑开始被拆进对应 JS。

2021-09-18，`ddc8cd05` 又加入三个 container 和异步 `init()`：

```text
htmlList / cssList / scriptList
    → 请求 HTML，Promise.all 等待
    → 放进 html-container
    → 放进 css-container
    → 放进 script-container
    → 组件脚本在前，页面入口在后
```

`onlineStatus.html` 现在还保留着这段结构。该页的 HTML/CSS 列表为空，但加载机制已写出。这是从手工排 `<script>`，走向“用数据列出一个页面所需资源”的尝试。

全局组件方案让模板、脚本、样式在一个 HTML 文件内聚；联网状态方案让组件作用范围和页面装配更清楚。两者各解决了一部分问题，后来的异步组件加载器把它们连接起来。

## 五、重复的加载过程，能不能收进 loadAsyncComponent？

2022-05-06，网格 `274ceb43` 引入 vue-browser-utils；6 月 1 日 `40eec639` 更新实现，早期笔记特别记下样式支持。库仓库到 2022-06-24 才有首次提交 `953bf81`，因此当前库的首次提交不是工具的诞生时间。

加载器开始替使用方做固定的工作：获取 HTML，提取 template/script/style，执行组件脚本，接收组件定义，再交给 Vue。

2022-09-22，`2f30e22b` 加入的 `my-input.html` 是这一阶段的代表：

```html
<template>
  <i-input :value="value" @input="inputCange"></i-input>
</template>
<script>
  defineComponent((Vue, template) => {
    return {
      ...Vue.compile(template),
      // props……
      methods: {
        inputCange(e) { this.$emit('input', e); },
      },
    };
  });
</script>
```

这里的 `defineComponent` 是加载器注入的自定义回调入口，不是 Vue 官方同名 API。调用方通过 `components: { MyInput: loadAsyncComponent(url, name) }` 局部使用组件；`name` 是旧签名，今天第二参数已是缓存策略。

这一步让每个 HTML 不再需要全局唯一的模板 ID，也不必自行调用 `Vue.component()`。组件文件交出 options；加载器负责异步取得；Vue 负责创建实例。加载器早期注释已经明确提到接收“普通 vue 组件对象，或 Promise 对象”。

原先每个组件都要复制的 Ajax 加载入口，终于可以复用一个函数。下一步的问题也随之出现：组件拆出来了，里面的数据、树处理和辅助函数呢？

## 六、从组件复用，到“我想把 helper.js 拆出去”

维护者记得，后来想把数据和函数移到独立文件。项目已有 ArcGIS/Dojo 的 AMD 环境，因此 RequireJS 是很自然的中间态：先让 `require` 回调包进 Promise，写成可以 `await` 的 `requireModule`。

网格 2022-09-28 的 `9c9fa3a6`，提交正文直接写着：

```text
requireModule 为 requirejs 封装
自定义模块,支持顶层 await
loadScript 每次执行 script
loadModule 加载模块有缓存
定义vue组件和加载
loadAsyncComponent
```

这一刻“加载一段脚本”“取得一个模块”“得到组件定义”已经开始分开。与此同时，也在尝试更直接的路线：获取 JS 字符串，把它放进自己的函数环境执行。

### 那些真的写在文件顶层的 return

这不是模糊回忆。网格同一天的 `d7a49c12` 中，`development/page/DataAudit2/data.js` 原样包含：

```js
let dd = await loadModule("development/page/DataAudit2/data2.js");

return {
  name: aa(),
  methods: {},
  dd,
};

function aa() {
  return 123;
}
```

`data2.js` 直接返回 `{ title: "123", data: {} }`。后来的 `selectCode/tree.m.js`、`javascript/treeHelper.m.js` 也通过顶层 return 交出树工具函数，正好对应“把 helper 拆出去”的记忆。

作为普通浏览器脚本或 ESM 文件，顶层 `return` 不合法；作为函数体，它完全可以成立。2022-09-28 的加载器正是这样处理的：

```js
const script_text = await fetchText(moduleUrl);
const script_text_eval = `(async ()=>{ ${script_text} })() `;
const module = await eval(script_text_eval);
cache[moduleUrl] = module;
return module;
```

所以“先得到字符串，再作为函数执行”的记忆是准确的。当前最早查到的实现是 `eval` 加异步函数包装；明确的 `new AsyncFunction(...)` 写法出现在 2023 年 4 月。不能把回忆中的 `new Function` 直接当作最初版本原文。

闭包或函数包装提供了局部作用域，return 提供结果，Promise 提供等待，缓存提供复用。模块系统的几个基本问题，开始在这些很小的实验里被逐个碰到。

## 七、先换成 .vue，再逐步摆脱自定义书写习惯

维护者记得，HTML 虽能承载组件，仍希望编辑器有更好的高亮和提示，于是改用 `.vue`。这个动机来自本人回忆；Git 能确认文件形态出现得很早。

2022-09-29，网格 `0cbce635` 新增因子选择组件中的 `.vue` 文件，以及 `data.js`、`dataApi.js`、`tree.js`。初版 `CodeTab.vue` 仍这样写：

```js
const { treesForeach, maxDepth } = await loadModule(
  "development/components/selectCode/tree.js",
  false
);
defineComponent((Vue, template) => {
  return {
    ...Vue.compile(template),
    // components……
  };
});
```

2022-10-13，`f73911c7` 加入 `header-menu.m.vue`，从 `treeHelper.m.js` 获取工具。10 月 21 日，`196b218f` 将部分 `dataApi.js`、`tree.js` 改名为 `.m.js`。

这时 `.vue` 仍由自定义加载器处理，并不意味着项目已经采用 Vue CLI 或标准 SFC 构建链。项目更早的局部组件工程也已有 `.vue`，这里确认的是**自研浏览器加载路线至少在 2022 年 9 月已使用这种扩展名**。

同样重要的是：**当时 `.m.js` 是自定义模块源文件的命名，不是 2025 年开始的预编译包装产物。**扩展名没变，内部协议后来变了，这也是今天要兼容历史 `.m.js` 的原因。

## 八、moduleM 有了名字，也开始寻找更清楚的导出约定

2022-11-12，`13fefa96` 抽出 `execScriptAsync`，同时改进 Promise 占位缓存，考虑多个调用同时请求一个模块的问题。11 月 17 日，`73a8361b` 将 `requireModule.js` 改为 `moduleM.js`。

当时还并行试过 `importModule` 与 `defineExpose`。加载器向代码提供一个函数，可以接收对象、回调，或 `key/value`，收集导出后交给调用方；其中也尝试等待异步结果。这是自定义注入函数，不是 Vue 的同名编译宏，早期实现也不能视为已经完备的异步协议。

这些写法都在回答同一个问题：**独立文件里的代码怎样把结果明确地交出来？**return 很直接，但编辑器看到的是包装前的文件；普通回调调用在源文件中合法，还可以由加载器决定什么时候完成。

### 找回 defineReturn：记忆是对的，顺序需要补充

这次确实找到了维护者记得的 `defineReturn`，当前 [运行时源码](../src/moduleM/moduleM.js) 中也还保留着它：

```js
// 处理 return 宏
script_text = script_text.replace("defineReturn", "return ");
```

网格首次查到的提交是 **2024-05-23，`aadf885c`**；库中是 **2024-07-02，`3a0e277`**。下面是根据替换规则还原的示意，不是查到的业务调用原文：

```js
// 文件里写普通调用，避免顶层 return 的语法问题
defineReturn({ helper });
// 加载器处理后，作为函数体执行
return ({ helper });
```

它是简单的字符串替换约定，不是 Babel AST 宏。本轮在两库可见历史中找到了实现，但没有找到已提交的业务调用，不能据此断定从未使用过。

尤其需要保留这个时间差：**`exposeModule` 在 2023 年已出现，`defineReturn` 在 2024 年才提交。**个人记忆往往按照“我怎样理解了这些概念”组织，Git 则记录“某种代码何时保存”。这里更像是在已有协议旁边补充轻量写法和旧代码兼容，而不是严格的前后替代。

## 九、import/export：让代码按熟悉的语法写，让 AST 接上自己的运行时

2023-04-19，库 `5e12d29` 新增 Babel AST 转换器；同日晚间，网格 `a28f80bd` 同步接入 `loadModule & transformCodeToExposeModule`。次日继续统一 JS 与 Vue 加载。

转换器使用 parser、traverse、types、generator，把源代码解析成语法树，改写导入导出，再生成代码。下面是简化示意：

```js
// 编写时
import { getData } from '@/api/data';
export const result = await getData();

// 转换后的核心关系，省略真实临时变量与包装
const imported = await loadModule('@/api/data');
const getData = imported.getData;
const result = await getData();
exposeModule(() => ({ result }));
```

运行时再通过 `new AsyncFunction("exposeModule", script_text)` 注入导出回调。旧版代码注释明确保留了 `return {}` 代码片段兼容。

这一阶段把两件事连接起来：开发者写熟悉的 ES 模块语法，运行时仍使用自己建立的加载和导出协议。它支持 ES 模块风格的书写，但不能直接等同于完整的原生 ESM 语义实现。

2024-02-27，库 `a489271` 将导入、导出转换分别拆成文件，并写下逐类转换案例。2 月 28 日，`72e9ec2` 又处理 AMD 导入兼容。后者是新运行时继续兼容旧依赖，不是项目第一次使用 AMD。

也正是在这里，“有点像 Webpack”的感觉有了具体依据：已经在处理语法、识别资源类型、转换源代码、组织模块执行。但 moduleM 仍以浏览器按 URL 加载为主，没有因此变成完整的打包器，也没有让整个项目迁入 SPA 架构。

## 十、类型提示和异步能力，并不是一天补齐的

异步很早就存在于 Promise、async 包装和组件工厂里；TS 则是另一条逐步加入的线。它既涉及运行时能否执行，也涉及编辑器能否理解代码。

2024-04-26，网格 `25ce9bf5` 已加入 `tsconfig.json`、`types/vxeGrid.d.ts`、Babel CLI 与 TypeScript/JSX 相关依赖，以及 `vxeGrid.util.ts` 和对应 JS。先让真实业务用上类型和编译工具，不等于当时已经建立完整严格的类型系统。

库在 2024-07-02 的 `915693b` 明确记录“去除 ts 类型，转换 jsx 为 h”，并加入 SCSS 支持；7 月 5 日 `940a771` 增加 `loadModuleTsx`；7 月 22 日 `4f39bc2` 优化 Vue 加载与样式异步处理。

2024-10-17，网格 `dfbf01a4` 又补充 jsconfig、types 范围及全局声明。此时目标不只是“浏览器能运行”，也开始包含“编辑器知道有哪些模块和全局 API”。

必须区分：Babel 去除类型让 TS 可以执行，不等于完成 TypeScript 类型检查；`.vue` 获得编辑支持，也不等于当时已经支持今天所有 SFC 语法。

## 十一、从 VS Code 自动编译，走到 moduleM 专用预编译协议

2022 年 demo 笔记留下过一个愿望：“理想的终极方案写个 vscode 插件……就像写 less 一样自动编译成 css”。两年后，自动编译开始以更实际的方式进入项目。

2024-08-15，网格 `53a432a8` 添加 `filewatcher.commands`，保存 TS 时调用 Babel，输出同名 `.js`。这一阶段的主要目标是自动完成转换。

2025-06-11～12，库 `25936d0`、`ef6d3ae` 继续重构。后者明确写着“支持 tsx 预编译与 js.map”，加入 `injectExposeModule` 和插件。网格同日 `973b4dae` 接入，File Watcher 输出改为 `.m.js`，同时补齐 source map、`@/` 路径及加载协议。

```text
TS / TSX
  → Babel 处理类型与 JSX
  → import/export 转为加载与导出调用
  → 注入模块执行环境
  → .m.js + .m.js.map
  → moduleM 通过 script 加载
  → 执行完成，交回导出
```

预编译文件从 `document.currentScript` 取得与本次加载绑定的上下文，包含 `exposeModule`、完成和错误回传能力。于是 `.m.js` 不再只是特殊扩展名的源码，而成为加载器能够识别的产物。

浏览器运行时转换仍保留，用于未预编译源码和部分组件；两条路径需要遵循一致的模块约定。2025 年 7 月，网格还继续修复脚本加载兼容、缓存和部署根路径。功能能工作以后，生产环境的细节开始变得更重要。

## 十二、2026 年本轮：从个人编辑器习惯，变成项目可以自己维护的能力

本轮修改发生在 2026 年 11 月，依据当前对话和工作区记录整理，不把它虚构为已发布的新版本。

最初的问题很具体：每位开发者都要装 VS Code 插件；临时变量随机生成导致重复编译出现大量差异；内容没变也覆盖文件；每次启动都编译又浪费时间；项目与库中的运行时逻辑逐渐不同。

围绕这些问题，现在形成了几项相互配套的变化：

- `npm run dev` 自动编译监听，不再要求个人编辑器安装 File Watcher。
- 模块路径稳定哈希替代随机标识符；输出相同不写入，保留文件时间。
- 编译缓存同时检查源文件、配置、插件、版本和产物，避免只看时间戳造成错误复用。
- 统一运行时缓存语义、失败重试和异步错误回传，兼容历史 `.m.js` 与组件写法。
- 项目包映射和资源路径移入 `moduleM.configure`；模板与实际配置分开。
- 项目迁移旧工具调用，库清理独立旧入口；源码分为运行时与编译器，产物集中到 `moduleM/`。
- 库对外只保留 `dev / build / sync / test`，内部编译监听放入 `scripts/internal/`。
- examples 从零散试验页变成小型示例系统，配合自动测试和浏览器交互验证。

原先关心“还能支持什么写法”，现在也开始关心“别人接手是否清楚、重复运行是否稳定、改动是否有证据证明兼容”。这些关注点是在长期使用中长出来的。

## 十三、AI 是怎样进入这段历史的

维护者把它视为自己的成长记录，也视为 AI 协作方式的变化记录。这两条线需要联系起来，但不能把没有证据的早期代码归功于某个模型。

目前能确认的直接材料是：

| 时间 | 证据 | 能确认的协作方式 |
| --- | --- | --- |
| 2024-10-30 | 网格 `7ae70076`，标题“生成接口与 cursor promt” | 用现有接口文件作范例，让 AI 按项目格式生成另一个接口 |
| 2025-06-12 | 库 `ef6d3ae` 新增 `.cursor/rules/system-env.mdc` | 将 Windows / PowerShell 环境约束写入仓库 |
| 2026-08-05 | 网格 `6508fc15`，建立 CLAUDE/AGENTS/docs | 将架构、约定、生命周期和验证方法沉淀为持续协作知识 |
| 2026 年 11 月本轮 | 对话、工作区变更、测试与浏览器验证 | AI 参与跨仓库调查、迁移、缓存与兼容修复、工具整理和历史编写 |

2024 年那份提示词保存在 `接口笔记`，大意非常朴素：参考一个现有文件，为指定接口编写新的文件，再给出请求和响应信息。它代表的是从“我写一个例子”到“让工具按例子继续做”的协作。

之后，提示不再只存在于单次聊天里，环境规则、项目文档和检查脚本开始承担记忆。到这次整理，维护者不断指出 MyTable2、FactorSingle、天气弹窗、defineComponent、defineReturn 等线索，AI 再回到历史核对并修正最初过于粗略的叙述。

这也留下了一个值得记录的过程：AI 初次总结把若干阶段跳过去，维护者用自己的经历把它们重新找回来。工具能检索代码，但“为什么那个发现对我重要”，仍需要作者亲自补充。

现有材料不能确定首次使用 AI 的日期，也不能证明早期 AST 代码由哪种 AI 协助完成。这里保留未知，不从提交风格倒推作者经历。

## 十四、又一个“终极目标”：有一天，让 moduleM 完成使命

以下是维护者在 2026-11-04 提出的未来设想，不是已实现能力，也不是已承诺的迁移计划。

眼下已经能够通过 `npm run dev` 自动编译 TS，也能较顺手地编写 `.vue`。虽然与标准 Vue SFC、ES 模块仍不是完全兼容，但已经解决了不少真实开发中的不方便。

下一个想法，是将 Vue 组件也提前编译成 JS，把浏览器里解析组件、编译模板等工作移到开发或构建阶段。维护者也特别说明：目前并没有遇到明显的性能瓶颈。这个想法更多是沿着现有探索继续往前走——就像当年写下“做一个自动编译的插件”一样，又有了一个新的“终极目标”。

如果未来实施 Vue 预编译，需要覆盖模板、脚本和样式的完整处理；仅把文件扩展名改为 `.js`，或只转换其中的脚本，不能代表模板编译成本也已经移出浏览器。具体收益应通过实际页面测量，而不预先承诺性能提升幅度。

另一条更长的路线，是把原来 HTML 中直接 `new Vue` 的业务，逐页整理成组件和 ES 模块。维护者希望，当这类代码达到一定比例后，迁往 Vue 3 + Vite 能轻松一些，最终让 moduleM 的使命结束。

这个方向有意义，但准备程度不能只按 `.vue` 文件数量计算。更能降低后续迁移成本的变化包括：

- 数据、接口和辅助函数通过明确的模块导入导出连接，减少隐式全局变量。
- 页面入口与组件定义分离，减少脚本执行时立即创建实例的副作用。
- 地图创建、事件订阅和销毁集中在可追踪的组件或适配模块中。
- 新代码逐渐减少对专用宏、旧加载约定和非标准模块行为的依赖。
- 关键业务交互有可重复的验证方法，使迁移后能判断行为是否保持一致。

这些工作会减少以后需要同时处理的问题，但不代表换一个构建工具就自动完成 Vue 3 迁移。Vue 2 的组件与插件、UI 库、render 写法，以及 ArcGIS/AMD 的接入方式，仍需分别核对。组件化有助于把这些问题限制在更小的范围，而不能保证地图部分无需改造。

moduleM 因而有了一个清楚的长期方向：让旧项目今天仍然好维护，同时逐步积累未来可以迁移的代码。当通用工具链能够接过这些职责，项目不再需要它时，让它退出也是这段探索的一种完成。

## 时间线与版本锚点

以下日期均为对应仓库中的提交日期；不是每项能力在所有环境中的首次出现。

| 日期 | 仓库 / 提交 | 代表节点 |
| --- | --- | --- |
| 2020-08-06 | 网格 `1875bdb5`、`a99a41c1` | 当前可见历史起点，已有旧项目导入痕迹 |
| 2020-12-25 | 网格 `f1430417` | 地图 Vue 弹窗，后续持续探索实例创建 |
| 2021-04-20 | 网格 `06ee36af` | point-marker：HTML 组件、模板 ID、全局注册 |
| 2021-05-19 | 网格 `bb8c9c2c` | FactorSingle：同名 JS 同步加载 HTML 组件 |
| 2021-06-04 | 网格 `cb977558` | 天气弹窗：compile、extend、工厂函数、mount |
| 2021-09-15 / 18 | 网格 `9804fab3`、`ddc8cd05` | 联网状态局部组件，container 与 init |
| 2022-05-06 / 06-01 | 网格 `274ceb43`、`40eec639` | 引入、更新 vue-browser-utils |
| 2022-06-24 | 库 `953bf81` | 独立仓库首次提交，package 版本 0.0.1 |
| 2022-09-22 | 网格 `2f30e22b` | my-input 等 HTML + defineComponent 示例 |
| 2022-09-28 | 网格 `9c9fa3a6`、`d7a49c12` | RequireJS 包装、自定义异步模块、真实顶层 return 文件 |
| 2022-09-29 | 网格 `0cbce635` | 自研加载路线使用 .vue，拆数据、接口和树工具 |
| 2022-10-13 / 21 | 网格 `f73911c7`、`196b218f` | header-menu.m.vue、部分源码改名 .m.js |
| 2022-11-12 / 17 | 网格 `13fefa96`、`73a8361b` | execScriptAsync、Promise 缓存、moduleM 名称、defineExpose |
| 2023-04-19 / 20 | 库 `5e12d29`、`f40bd45`；网格 `a28f80bd`、`44435eec` | AST 转换、exposeModule、AsyncFunction，统一加载入口 |
| 2024-02-27 / 28 | 库 `a489271`、`72e9ec2` | 拆分 import/export 转换、兼容 AMD |
| 2024-04-26 | 网格 `25ce9bf5` | TS 配置、类型声明、Babel 工具链进入业务 |
| 2024-05-23 | 网格 `aadf885c` | defineReturn 字符串宏 |
| 2024-07-02 | 库 `3a0e277`、`915693b` | 缓存与返回兼容、TSX 转换，版本 0.1.0 |
| 2024-07-05 | 库 `940a771` | loadModuleTsx，版本 0.1.1 |
| 2024-07-22 | 库 `4f39bc2` | Vue 加载与异步样式优化，版本 0.1.2 |
| 2024-08-15 | 网格 `53a432a8` | File Watcher 自动生成 JS |
| 2024-10-17 / 30 | 网格 `dfbf01a4`、`7ae70076` | 编辑器类型配置、Cursor 接口生成提示词 |
| 2025-06-11 / 12 | 库 `25936d0`、`ef6d3ae`；网格 `973b4dae` | 专用 .m.js 预编译协议、source map、@/ |
| 2025-07-04 / 07 | 网格 `2c01dcbb`、`e2227379` | 脚本兼容、缓存与部署路径修正 |
| 2026-08-05 | 网格 `6508fc15` | 项目协作文档体系 |
| 2026 年 11 月 | 当前工作区与协作记录 | npm dev、稳定编译与缓存、配置抽离、库结构和旧实现整理 |

库中没有查到 Git tag；`package.json` 从 0.0.1 到 0.1.2 的变化集中在上表几个节点，2025 年的大改和本轮整理尚不能通过包版本号完整表达。因此读历史时应同时看提交、源码和项目实际使用方式。

## 继续补充这份历史的方法

维护者提示可搜索 `module` / `moduleM`，并记得有约 17 次历史。这是一条很有价值的索引，但命中数量随仓库、分支、搜索范围及是否搜索提交正文而变化。只搜名称还会漏掉“demo2”“因子选择组件”“新特性编译”等关键提交。

本轮结合了提交说明、路径追踪和内容搜索。公开仓库读者可以在本库执行前两条命令；最后两条是原业务仓库的调查记录，不要求读者能访问该仓库：

```sh
git log --all -i --extended-regexp --grep='moduleM|module ' --date=short --format='%h %ad %s'
git log --all --follow --date=short -- src/moduleM.js
git log --all -S 'defineReturn' -- '*.js' ':!*.min.js'
git show aadf885c -- javascript/moduleM.js
git show d7a49c12:development/page/DataAudit2/data.js
```

历史文件若已删除或改名，应使用 `git show 提交:当时路径` 阅读，不能只检索当前工作区。库的旧运行时路径是 `src/moduleM.js`，网格更早是 `javascript/moduleM.js`，再往前还出现过 `requireModule.js`，甚至一次提交中的文件名是 `requireModule,js`。

以后如果找到未提交的试验文件、旧聊天记录或更早仓库，可以继续补充首次使用 AI、`defineReturn` 实际调用，以及个人认识发生的时间。已经有证据的阶段不必为故事顺畅而改写；暂时没有证据的记忆，也不必因此丢掉。

moduleM 今天同时保留着旧组件回调、模块导出协议、浏览器转换和预编译路径。回看它们，会发现很多看似重复的设计都有一个当时要解决的问题。把这些问题和尝试留下来，才能看见它是怎样一步一步长成现在的样子的。
