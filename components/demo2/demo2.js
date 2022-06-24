define([], function () {
  "use strict";
  // development/components/demo-component/demo.js
  const option = {
    name: "demo2-component",
    props: {
      text: {
        type: String,
        default: "default prop text",
      },
    },
    data() {
      return {
        title: "Demo2",
      };
    },
  };

  function loadOneModule(module) {
    return new Promise((res) => {
      require([module], (module) => res(module));
    });
  }

  return loadOneModule("../vue-browser-utils.js").then((u) => {
    console.log("u: ", u);
    return u.defineAsyncTemplateComponent(Vue, "../components/demo2/demo2.html", option);
  });
});

/* 
// 使用方法：
new Vue({
  components: {
    "report-table": () => {
      return loadOneModule(
        "javascript/vue-browser-utils/components/demo.js"
      )
    },
  },
})

function loadOneModule(module) {
  return new Promise((res) => {
    require([module], (module) => res(module));
  });
}
 */
