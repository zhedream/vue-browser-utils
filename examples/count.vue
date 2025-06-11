<template>
  <div @click="addCount">
    count: {{ a }}
  </div>
</template>

<script>

import { sum } from './sum.js';

// import { ref } from 'vue'
// console.log('ref: ', ref);

export default {
  data() {
    return {
      a: 1
    }
  },
  methods: {
    addCount() {
      console.log('test')
      let aa = sum(this.a, 2)
      this.a = aa
      console.log('aa: ', aa);
    }
  }
}

</script>