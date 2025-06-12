(async () => {
  if (!document.currentScript || !document.currentScript.resolve) {
    throw new Error("must load by moduleM loadModule");
  }
  const currentScript = document.currentScript;
  const exposeModule = currentScript.exposeModule;
  console.log("module loaded", currentScript.id, "load id", exposeModule.id);
  if (exposeModule.id !== currentScript.id) {
    throw currentScript.reject("exposeModule.id !== document.currentScript.id");
  }
  try {
    const __vuebabelhelpervuejsxmergepropsraevb54k = await loadModule("@vue/babel-helper-vue-jsx-merge-props");
    const _mergeJSXProps = __vuebabelhelpervuejsxmergepropsraevb54k.default;
    const __vuedy8t379l = await loadModule("vue");
    const {
      ref
    } = __vuedy8t379l;
    const {
      defineComponent
    } = __vuedy8t379l;
    const {
      h
    } = __vuedy8t379l;
    const __examplestoolsokaeslk = await loadModule("@/examples/tool");
    const {
      log
    } = __examplestoolsokaeslk;
    exposeModule(() => ({
      default: defineComponent({
        setup() {
          const count = ref(0);
          const btnProps = {
            id: 'btn',
            class: 'btn3'
          };
          return () => {
            return h("div", [h("h1", [count.value]), h("button", _mergeJSXProps([{
              "attrs": {
                "id": "btn"
              }
            }, btnProps, {
              "on": {
                "click": () => {
                  count.value++;
                  log(count.value);
                }
              }
            }]), ["Click me2"])]);
          };
        }
      })
    }));
  } catch (error) {
    document.currentScript.reject(error);
  }
})();

//# sourceMappingURL=test.m.js.map