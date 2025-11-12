// src/lib/dataSync.ts（覆蓋版）

/** 取得部署子路徑（GitHub Pages → /ju-smile-calorie-app/） */
function base() {
  return (import.meta as any).env?.BASE_URL || "/";
}

/** 首次啟動寫入預設來源（使用者也可在設定頁改） */
export function ensureDefaultSources() {
  const b = base();
  const def = {
    JU_SRC_FOOD: `${b}data/Food_DB.csv`,
    JU_SRC_UNIT: `${b}data/Unit_Map.csv`,
    JU_SRC_TYPE: `${b}data/Type_Table.csv`,
    JU_SRC_MET:  `${b}data/Exercise_Met.csv`,
  };
  (Object.keys(def) as (keyof typeof def)[]).forEach(k => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, def[k]);
  });
}

/** 解析來源 URL：支援絕對/相對/根路徑 */
function resolveSrc(key: string) {
  const v = (localStorage.getItem(key) || "").trim();
  const b = base();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;     // 絕對網址
  if (v.startsWith("./")) return `${b}${v.slice(2)}`; // 相對 ./ 開頭
  if (v.startsWith("/"))  return `${b}${v.slice(1)}`; // 站內根路徑
  return `${b}${v}`; // 純檔名或相對片段
}

/** 一次抓四份 CSV；versionParam 用來繞過快取 */
export async function loadCsvBundle(versionParam = "") {
  const q = versionParam ? `?v=${versionParam}` : "";
  const [foodDb, unitMap, typeTable, met] = await Promise.all([
    fetch(`${resolveSrc("JU_SRC_FOOD")}${q}`).then(r => r.text()),
    fetch(`${resolveSrc("JU_SRC_UNIT")}${q}`).then(r => r.text()),
    fetch(`${resolveSrc("JU_SRC_TYPE")}${q}`).then(r => r.text()),
    fetch(`${resolveSrc("JU_SRC_MET")}${q}`).then(r => r.text()),
  ]);
  return { foodDb, unitMap, typeTable, met };
}

/** 讀取線上版本資訊（用 dataVersion 觸發重匯） */
export async function readVersionInfo() {
  try {
    const txt = await fetch(`${base()}data/version.json?v=${Date.now()}`, { cache: "no-store" }).then(r => r.text());
    const v = JSON.parse(txt);
    return { appVersion: v.appVersion as string, dataVersion: v.dataVersion as string };
  } catch {
    return null;
  }
}

/** 首次啟動自動匯入；若 dataVersion 變更也會自動重匯 */
export async function initialImportIfNeeded() {
  ensureDefaultSources();

  const storedVer = localStorage.getItem("JU_DATA_VERSION");
  const remote = await readVersionInfo(); // 可能為 null
  const needsImport =
    !localStorage.getItem("JU_IMPORTED_V1") ||
    (remote?.dataVersion && remote.dataVersion !== storedVer);

  if (!needsImport) return false;

  const ts = Date.now().toString(); // 強制繞過快取
  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle(ts);

  localStorage.setItem("JU_FOOD_DB_CSV",    foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV",   unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV",  met);

  localStorage.setItem("JU_IMPORTED_V1", "1");
  if (remote?.dataVersion) localStorage.setItem("JU_DATA_VERSION", remote.dataVersion);
  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

/** 設定頁「同步資料」可呼叫這個 */
export async function manualSyncCsv() {
  ensureDefaultSources();
  const ts = Date.now().toString();
  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle(ts);

  localStorage.setItem("JU_FOOD_DB_CSV",    foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV",   unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV",  met);

  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

/** 除錯/重置：清所有站內資料與快取 */
export async function clearAllLocalData() {
  localStorage.clear();
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
}
