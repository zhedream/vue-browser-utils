# vue-browser-utils / moduleM

面向 Vue 2.7 的浏览器模块运行时：静态 HTML 入口，按需加载 Vue SFC、JS、TS/TSX 与预编译模块，无需 Vite/Webpack。示例使用 ant-design-vue 1.7.8。

想了解这套工具为什么会出现，可以先读 [没有重写的这几年](docs/moduleM-story.md)。逐阶段的代表代码、提交时间和技术变化见 [moduleM 发展史](docs/moduleM-history.md)。

## 启动示例系统

```sh
npm install
npm run dev
```

打开 http://127.0.0.1:14030/examples/ 。可用 PORT 环境变量修改端口。
开发命令自动构建运行时、增量编译并监听 examples 下的 TS/TSX，再启动不缓存的静态服务。源码修改后刷新页面；不提供 HMR。修改运行时源码后重新运行 dev 或 build。

示例包含运行概览、站点管理、搜索/状态筛选、新增/编辑弹窗、共享统计卡片和本地模拟 API。数据保存到浏览器 localStorage，不调用业务后台。页面切换销毁旧组件，概览页用 beforeDestroy 清理时钟。

## 目录

| 目录 | 用途 |
| --- | --- |
| src/moduleM/ | 运行时、JSX helper、项目配置模板源码 |
| src/compiler/ | Babel 转换与预编译插件源码 |
| moduleM/ | 可直接复制部署的构建产物；请勿直接修改 |
| scripts/ | dev.js、build-runtime.js、sync-runtime.js 三个入口 |
| scripts/internal/ | TS 内容缓存编译与监听，由 dev 内部调用 |
| examples/ | 完整示例系统，入口 index.html / App.vue |
| tests/ | 运行时回归与编译器示例 |
| docs/ | [发展史](docs/moduleM-history.md)、[博客文章](docs/moduleM-story.md)、[导入导出示例](docs/导入导出示例.md)、[注入环境](docs/注入环境.md) |

## 接入业务项目

在库目录执行：

```sh
npm run build
npm run sync -- E:/www/air-grid/Grid_Web_Front/moduleM
```

sync 只复制已构建产物，不自动构建。复制 moduleM.js、编译 bundle、JSX helper、配置模板和 babel/ 插件；内容相同时不写入。目标目录由参数指定，不绑定 Grid 项目。

新项目复制 moduleM.config.example.js 为 moduleM.config.js，按项目配置包映射、站点根目录和 Sass 资源地址。类似 .env.example 与 .env，但这里是浏览器脚本，必须显式加载。同步可更新模板，始终不覆盖实际配置。

```html
<!-- 先引入 Vue 与项目使用的第三方脚本 -->
<script src="moduleM/transformCodeToExposeModule.min.js"></script>
<script src="moduleM/moduleM.js"></script>
<script src="moduleM/moduleM.config.js"></script>
<script>
  mountModuleVue('@/App.vue', '#app');
</script>
```

模块包名由 moduleM.configure({ modules }) 映射；@/ 基于 baseUrl。配置模板假设自身位于站点的 moduleM/，examples 的配置则将 @/ 指向 examples/。Sass 路径按部署设置，不再硬编码在运行时里。

## 编译与缓存

```sh
npm run dev   # 自动编译监听并启动示例
npm test      # 运行全部测试
```

TS 同目录生成 .m.js 和 .m.js.map。缓存位于 .cache/ts-compiler.json，校验源码、配置、插件、依赖版本及输出哈希；输出未变不覆盖，损坏的输出会重新生成。导入临时变量使用稳定模块路径哈希。业务项目可参考 scripts/internal/compile-ts.js 和 scripts/internal/watch-ts.js 调整监听目录，不需要编辑器插件。

loadModule 显式加载 TS 时优先同名 .m.js，其次 .js，最后运行时编译。历史含 ESM 的 .m.js 与预编译包装均兼容。loadAsyncComponent(url, cache) 的第二参数是缓存策略，不是组件名称。

运行时 cache=true 复用成功结果及并发请求；false 重新加载；数字指定有效毫秒数；失败可重试。moduleM.clearCache(url) 清除对应缓存，不自动替换已有实例。moduleM.configure 会清理缓存，应在业务加载前调用。

## 本版迁移

旧独立 UMD 入口、独立异步组件加载器和旧 components 示例已删除；统一使用 moduleM。旧 moduleM.legacy.js 已改为配置模板，不再自动提供项目包映射。根目录产物统一移到 moduleM/；外部脚本如引用旧路径需相应调整。package main 指向浏览器运行时，不是供 Node require 执行的服务端 API。

旧全局 loadModule、loadScript、loadAsyncComponent、mountModuleVue、runModuleMJs 以及旧 defineComponent(callback) 组件宏仍由运行时兼容。Vue 导入的 defineComponent 按正常 API 处理。
