(() => {
  if (!document.currentScript || !document.currentScript.resolve) {
    throw new Error("must load by moduleM loadModule");
  }
  const currentScript = document.currentScript;
  const exposeModule = currentScript.exposeModule;
  console.log("module loaded", currentScript.id, "load id", exposeModule.id);
  if (exposeModule.id !== currentScript.id) {
    throw currentScript.reject("exposeModule.id !== document.currentScript.id");
  }
  try {
    const key = "modulem-example-stations-v1";
    const initial = [{
      id: 1001,
      name: "滨江生态观测站",
      district: "滨江区",
      status: "在线",
      aqi: 32
    }, {
      id: 1002,
      name: "西湖城市监测站",
      district: "西湖区",
      status: "在线",
      aqi: 46
    }, {
      id: 1003,
      name: "钱塘产业园站",
      district: "钱塘区",
      status: "维护中",
      aqi: 68
    }, {
      id: 1004,
      name: "拱墅中心站",
      district: "拱墅区",
      status: "在线",
      aqi: 41
    }];
    function listStations() {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(stored)) return stored;
      } catch {
        /* 损坏缓存回退初始数据 */
      }
      return initial.map(row => ({
        ...row
      }));
    }
    function saveStation(station) {
      const rows = listStations();
      const index = rows.findIndex(row => row.id === station.id);
      if (index < 0) rows.push({
        ...station,
        id: Date.now()
      });else rows.splice(index, 1, {
        ...station
      });
      localStorage.setItem(key, JSON.stringify(rows));
    }
    exposeModule(() => ({
      listStations,
      saveStation
    }));
    currentScript.resolve(undefined);
  } catch (error) {
    currentScript.reject(error);
  }
})();
//# sourceMappingURL=stations.m.js.map