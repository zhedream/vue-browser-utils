<template>
  <section>
    <div class="page-heading"
      ><div
        ><div class="eyebrow">STATION MANAGEMENT</div><h1>站点管理</h1
        ><p>维护站点档案，查看各区域设备状态。</p></div
      ><a-button type="primary" icon="plus" @click="edit()">新增站点</a-button></div
    >
    <a-card :bordered="false"
      ><div class="filters"
        ><a-input-search
          v-model="keyword"
          placeholder="搜索站点名称或区域"
          style="width: 300px"
          allow-clear
        ></a-input-search
        ><a-select v-model="status" style="width: 150px"
          ><a-select-option value="">全部状态</a-select-option
          ><a-select-option value="在线">在线</a-select-option
          ><a-select-option value="维护中">维护中</a-select-option></a-select
        ><span class="result-count">共 {{ filtered.length }} 个站点</span></div
      >
      <a-table :columns="columns" :data-source="filtered" row-key="id" :pagination="{ pageSize: 5 }"
        ><template slot="status" slot-scope="text"
          ><a-tag :color="text === '在线' ? 'green' : 'orange'">{{ text }}</a-tag></template
        ><template slot="action" slot-scope="text, row"
          ><a-button type="link" @click="edit(row)">编辑</a-button></template
        ></a-table
      >
    </a-card>
    <a-modal
      :title="form.id ? '编辑站点' : '新增站点'"
      :visible="visible"
      ok-text="保存"
      cancel-text="取消"
      @ok="save"
      @cancel="visible = false"
    >
      <a-form layout="vertical"
        ><a-form-item label="站点名称" required
          ><a-input
            v-model="form.name"
            placeholder="请输入站点名称"
            :max-length="40"
          ></a-input></a-form-item
        ><a-form-item label="所属区域" required
          ><a-input v-model="form.district" placeholder="请输入区域"></a-input></a-form-item
        ><a-form-item label="运行状态"
          ><a-select v-model="form.status"
            ><a-select-option value="在线">在线</a-select-option
            ><a-select-option value="维护中">维护中</a-select-option></a-select
          ></a-form-item
        ><a-form-item label="AQI"
          ><a-input-number v-model="form.aqi" :min="0" :max="500"></a-input-number></a-form-item
      ></a-form>
    </a-modal>
  </section>
</template>
<script>
import { listStations, saveStation } from "@/api/stations";
export default {
  data() {
    return {
      rows: listStations(),
      keyword: "",
      status: "",
      visible: false,
      form: {},
      columns: [
        { title: "站点名称", dataIndex: "name" },
        { title: "所属区域", dataIndex: "district" },
        { title: "运行状态", dataIndex: "status", scopedSlots: { customRender: "status" } },
        { title: "AQI", dataIndex: "aqi" },
        { title: "操作", key: "action", scopedSlots: { customRender: "action" } },
      ],
    };
  },
  computed: {
    filtered() {
      return this.rows.filter(
        (row) =>
          (row.name + row.district).includes(this.keyword.trim()) &&
          (!this.status || row.status === this.status)
      );
    },
  },
  methods: {
    edit(row) {
      this.form = row ? { ...row } : { name: "", district: "", status: "在线", aqi: 35 };
      this.visible = true;
    },
    save() {
      if (!this.form.name.trim() || !this.form.district.trim())
        return this.$message.warning("请填写站点名称和所属区域");
      if (typeof this.form.aqi !== "number") return this.$message.warning("请填写 AQI");
      try {
        saveStation({
          ...this.form,
          name: this.form.name.trim(),
          district: this.form.district.trim(),
        });
        this.rows = listStations();
        this.visible = false;
        this.$message.success("站点已保存");
      } catch {
        this.$message.error("保存失败，请检查浏览器存储权限");
      }
    },
  },
};
</script>
