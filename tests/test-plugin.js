const transformVueTsx = require('./src/transformVueTsx');

// 测试代码 - 简化版本避免重复声明
const testCode = `
import { ref,defineComponent } from 'vue';
import * as utils from './utils';

export const MyComponent = defineComponent({
  setup() {
    const count = ref(0);
    return () => <div>{count.value}</div>;
  }
});


export const bC = defineComponent(()=>{
  const count = ref<number>(0);
  const onClick = () => {
    count.value++;
  };
  return () => <div onClick={onClick}>{count.value}</div>;
});

export default function App() {
  return <div>
    <MyComponent />
    <bC />
  </div>;
}
`;

console.log('原始代码:');
console.log(testCode);
console.log('\n转换后的代码:');

try {
  const result = transformVueTsx(testCode);
  console.log(result);
} catch (error) {
  console.error('转换失败:', error.message);
} 