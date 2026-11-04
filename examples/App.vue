<template>
  <div class="workspace">
    <aside class="sidebar">
      <div class="brand"><span class="brand-icon">M</span> ModuleM <small>WORKSPACE</small></div>
      <div class="nav-caption">环境监测工作台</div>
      <a-menu theme="dark" mode="inline" :selected-keys="[page]" @click="navigate">
        <a-menu-item key="overview"><a-icon type="dashboard"></a-icon>运行概览</a-menu-item>
        <a-menu-item key="stations"><a-icon type="environment"></a-icon>站点管理</a-menu-item>
      </a-menu>
      <div class="sidebar-footer"
        ><span class="live-dot"></span> 本地演示环境<br /><small
          >Vue 2.7 · Ant Design Vue</small
        ></div
      >
    </aside>
    <main class="main">
      <header class="topbar"
        ><span
          >工作空间 <span class="separator">/</span>
          {{ page === "overview" ? "运行概览" : "站点管理" }}</span
        ><span
          ><a-tag color="blue">示例系统</a-tag
          ><a-avatar size="small" style="background: #3459bd">M</a-avatar></span
        ></header
      >
      <div class="content"><component :is="activePage" :key="page"></component></div>
      <footer>ModuleM 示例 · 数据保存在当前浏览器，刷新后保留</footer>
    </main>
  </div>
</template>
<script>
const pages = {
  overview: loadAsyncComponent("@/pages/Overview.vue"),
  stations: loadAsyncComponent("@/pages/Stations.vue"),
};
export default {
  data() {
    return { page: "overview" };
  },
  computed: {
    activePage() {
      return pages[this.page];
    },
  },
  methods: {
    navigate({ key }) {
      this.page = key;
    },
  },
};
</script>
