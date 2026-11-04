// 复制为 moduleM.config.js，在 moduleM.js 之后、业务入口之前加载。
// 假设配置位于 <站点根>/moduleM/；按项目需要添加包映射和资源路径。
moduleM.configure({
  baseUrl: new URL("../", document.currentScript.src).href,
  modules: {
    vue: () => Object.assign(window.Vue, { default: window.Vue }),
    "ant-design-vue": () => window.antd,
  },
  jsxHelperUrl: new URL("mergeJsxProps.js", document.currentScript.src).href,
  // 使用 SCSS 时设置本项目的 Sass 资源地址：
  // sass: { scriptUrl: '@/vendor/sass.js', workerUrl: '@/vendor/sass.worker.js' },
});
