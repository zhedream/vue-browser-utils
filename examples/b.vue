<template>
  <div @click="test">
    {{ a }}
  </div>
</template>

<script lang="js">
import { defineComponent } from "vue";
import { sum } from "./a.m.js";

// import { ref } from 'vue'
// console.log('ref: ', ref);



export default defineComponent({
  data() {
    return {
      a: 1,
    };
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
