Vue.use(antd);
mountModuleVue("@/App.vue", "#app").catch((error) => {
  console.error(error);
  document.getElementById("app").textContent = "加载失败：" + error.message;
});
