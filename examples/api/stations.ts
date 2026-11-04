export interface Station {
  id: number;
  name: string;
  district: string;
  status: string;
  aqi: number;
}
const key = "modulem-example-stations-v1";
const initial: Station[] = [
  { id: 1001, name: "滨江生态观测站", district: "滨江区", status: "在线", aqi: 32 },
  { id: 1002, name: "西湖城市监测站", district: "西湖区", status: "在线", aqi: 46 },
  { id: 1003, name: "钱塘产业园站", district: "钱塘区", status: "维护中", aqi: 68 },
  { id: 1004, name: "拱墅中心站", district: "拱墅区", status: "在线", aqi: 41 },
];
export function listStations(): Station[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(stored)) return stored;
  } catch {
    /* 损坏缓存回退初始数据 */
  }
  return initial.map((row) => ({ ...row }));
}
export function saveStation(station: Station) {
  const rows = listStations();
  const index = rows.findIndex((row) => row.id === station.id);
  if (index < 0) rows.push({ ...station, id: Date.now() });
  else rows.splice(index, 1, { ...station });
  localStorage.setItem(key, JSON.stringify(rows));
}
