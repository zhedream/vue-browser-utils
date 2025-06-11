import Vue, { h } from "vue";
import BComponent from "./count.vue";
import { requireModule } from "../vue-browser-utils.js";
console.log(requireModule);
import Demo2 from "../components/demo2/demo2.js";
// console.log('Demo2: ', Demo2);
// Promise.resolve().then(()=>{
//   window.report = report;
// })
var report = new Vue({
  el: "#app",
  components: {
    AComponent: loadAsyncComponent("../components/demo.html"),
    BComponent: BComponent,
    demoUser: () => {
      console.log(123123);
      return requireModule("../components/demo2/demo2.js");
      // return Promise.resolve(Demo2)
    },
    Demo2,
  },
  data() {
    return {};
  },
  mounted() {},
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
