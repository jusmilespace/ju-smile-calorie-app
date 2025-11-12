// 以你的檔名抓取，支援 GitHub Pages 子路徑
function base() {
  return (import.meta as any).env?.BASE_URL || "/";
}

export async function loadCsvBundle(versionParam = "") {
  const q = versionParam ? `?v=${versionParam}` : "";
  const b = base();
  const [foodDb, unitMap, typeTable, met] = await Promise.all([
    fetch(`${b}data/Food_DB.csv${q}`).then(r => r.text()),
    fetch(`${b}data/Unit_Map.csv${q}`).then(r => r.text()),
    fetch(`${b}data/Type_Table.csv${q}`).then(r => r.text()),
    fetch(`${b}data/Exercise_Met.csv${q}`).then(r => r.text()),
  ]);
  return { foodDb, unitMap, typeTable, met };
}

export async function initialImportIfNeeded() {
  const HAS_IMPORTED = localStorage.getItem("JU_IMPORTED_V1");
  if (HAS_IMPORTED) return false;

  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle();
  localStorage.setItem("JU_FOOD_DB_CSV",    foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV",   unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV",  met);
  localStorage.setItem("JU_IMPORTED_V1", "1");
  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

export async function manualSyncCsv() {
  const ts = Date.now().toString(); // 強制繞過快取
  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle(ts);
  localStorage.setItem("JU_FOOD_DB_CSV",    foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV",   unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV",  met);
  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

export async function readVersionInfo() {
  try {
    const b = base();
    const txt = await fetch(`${b}data/version.json?v=${Date.now()}`, { cache: "no-store" }).then(r => r.text());
    const v = JSON.parse(txt);
    return { appVersion: v.appVersion, dataVersion: v.dataVersion };
  } catch {
    return null;
  }
}

export async function clearAllLocalData() {
  localStorage.clear();
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
}
