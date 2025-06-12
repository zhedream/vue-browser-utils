import { ref, defineComponent } from "vue";
import { log } from "@/examples/tool";

export default defineComponent({
  setup() {
    const count = ref(0);
    const btnProps = {
      id: 'btn',
      class: 'btn3',
    }
    return () => {
      return <div>
        <h1>{count.value}</h1>
        <button id="btn" {...btnProps} onClick={() => {
          count.value++;
          log(count.value);
        }}>Click me2</button>
      </div>
    };
  }
});