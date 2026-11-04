// 本示例的 @/ 指向 examples/；项目配置不随运行时同步覆盖。
moduleM.configure({
  baseUrl: new URL("./", document.currentScript.src).href,
  modules: {
    vue: () => Object.assign(window.Vue, { default: window.Vue }),
    "ant-design-vue": () => window.antd,
  },
  jsxHelperUrl: new URL("../moduleM/mergeJsxProps.js", document.currentScript.src).href,
});
