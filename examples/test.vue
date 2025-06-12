<template>
  <div @click="test">
    {{ a }}
    <test-component></test-component>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import { sum } from "@/examples/sum";

import testComponent from '@/examples/test'
import testComponent2 from '@/examples/test.tsx'
// console.log('testComponent: ', testComponent);
import("@/examples/test").then(module=>{
  console.log('@/examples/test module: ', module);
})
console.log(testComponent2 === testComponent);

// console.log('ref: ', ref);

export default defineComponent({
  data() {
    return {
      a: 1,
    };
  },
  components: {
    testComponent,
  },
  methods: {
    test() {
      console.log("test");
      let aa = sum(1, 2);
      console.log("aa: ", aa);
    },
  },
});
</script>
