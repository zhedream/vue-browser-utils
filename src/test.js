function hasAmdDefineCallExpression(codeString) {
  // 使用正则表达式来匹配 "define" 后面跟随任意数量的空白字符，然后是一个左括号 "("，
  // 再跟随任意数量的空白字符，然后是任意字符（非贪婪匹配），最后是一个右括号 ")"。
  // 使用\s*来匹配任意数量的空白字符，包括换行。
  // 使用[\s\S]*?来匹配任意字符，包括换行，使用非贪婪模式。
  const regex = /define\s*\(\s*[\s\S]*?\s*\)/;
  return regex.test(codeString);
}

let code = `
define
  (

  )
`;

let isDefineCall = hasAmdDefineCallExpression(code);
console.log('r: ', isDefineCall); // 应输出 true
