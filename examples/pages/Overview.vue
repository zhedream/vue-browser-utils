<template>
  <section>
    <div class="page-heading"
      ><div
        ><div class="eyebrow">WORKSPACE OVERVIEW</div><h1>运行概览</h1
        ><p>从站点状态开始，掌握今日环境监测情况。</p></div
      ><span class="clock"><a-icon type="clock-circle"></a-icon> {{ time }}</span></div
    >
    <div class="metrics"
      ><metric-card
        label="监测站点"
        :value="rows.length"
        unit="个"
        note="已纳入当前工作空间"
      ></metric-card
      ><metric-card label="在线站点" :value="online" unit="个" note="设备连接正常"></metric-card
      ><metric-card
        label="平均 AQI"
        :value="average"
        unit=""
        note="示例数据 · 非实时监测"
      ></metric-card
      ><metric-card
        label="待维护"
        :value="rows.length - online"
        unit="个"
        note="建议关注设备运行状态"
      ></metric-card
    ></div>
    <div class="overview-grid"
      ><a-card title="空气质量概览" :bordered="false"
        ><div class="chart-legend"><span class="live-dot"></span> 各站点 AQI</div
        ><div v-for="row in rows" :key="row.id" class="bar-row"
          ><span>{{ row.name }}</span
          ><div class="bar-track"
            ><div
              :style="{
                width: (Math.min(row.aqi, 150) / 150) * 100 + '%',
                background: row.aqi > 50 ? '#edae57' : '#5379e7',
              }"
            ></div></div
          ><b>{{ row.aqi }}</b></div
        ></a-card
      ><a-card title="工作空间说明" :bordered="false"
        ><div class="info-badge"><a-icon type="experiment"></a-icon></div><h3>一个完整的小型起点</h3
        ><p>通过侧边菜单进入站点管理，搜索站点、新增记录或编辑状态。所有操作使用本地模拟数据。</p
        ><a-divider></a-divider
        ><p class="muted">页面切换会销毁旧组件；本页时钟在离开时停止，返回后重新启动。</p></a-card
      ></div
    >
  </section>
</template>
<script>
import MetricCard from "@/components/MetricCard.vue";
import { listStations } from "@/api/stations";
export default {
  components: { MetricCard },
  data() {
    return { rows: listStations(), time: new Date().toLocaleTimeString(), timer: null };
  },
  computed: {
    online() {
      return this.rows.filter((row) => row.status === "在线").length;
    },
    average() {
      return Math.round(this.rows.reduce((sum, row) => sum + row.aqi, 0) / (this.rows.length || 1));
    },
  },
  mounted() {
    this.timer = setInterval(() => {
      this.time = new Date().toLocaleTimeString();
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this.timer);
  },
};
</script>
