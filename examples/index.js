var report = new Vue({
  el: "#app",
  components: {
    AComponent: loadAsyncComponent("../components/demo.html"),
    BComponent: loadAsyncComponent("/examples/a.m.vue"),
    demo2: () => {
      return loadAsyncComponent("../components/demo2/demo2.js");
    },
  },
  data() {
    return {};
  },
  mounted() { },
  methods: {
    test() {
      hello("我是A组件2 .... ");
    },
  },
  // render(h) {
  //   // 需要 .$mount('#app');
  //   return h("div", [
  //     [
  //       h("a-component", {
  //         props: {
  //           title: "我是A组件2",
  //         },
  //         "on.native": {
  //           click() {
  //             hello("我是A组件2 .... ");
  //           },
  //         },
  //       }),
  //     ],
  //   ]);
  // },
});


function hello(title) {
  console.log(title);
}
