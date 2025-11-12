/* src/lib/dataSync.ts
 * - 預設從 /public/data/ 抓取四個 CSV + version.json
 * - 尊重使用者在 localStorage 設定的自訂來源（JU_SRC_*），不再截掉 /data/ 子路徑
 * - 支援以下輸入：
 *    1) 絕對網址：https://.../data/Food_DB.csv（原樣使用）
 *    2) 相對路徑：./data/Food_DB.csv（轉為帶 BASE_URL 的絕對路徑）
 *    3) 以 / 開頭：/ju-smile-calorie-app/data/Food_DB.csv（補上 BASE_URL）
 *    4) 只給檔名：Food_DB.csv（自動補成 BASE_URL + data/檔名）
 */

function base() {
  return (import.meta as any).env?.BASE_URL || "/";
}

/** 將使用者輸入的路徑轉為實際可抓的 URL（保留 /data/，不再只取檔名） */
function resolveSrc(lsKey: string, fallbackFile: string) {
  const b = base();
  const v = (localStorage.getItem(lsKey) || "").trim();

  // 沒填 → 用 /data/ 預設
  if (!v) return `${b}data/${fallbackFile}`;

  // 絕對網址（含 http/https）→ 原樣
  if (/^https?:\/\//i.test(v)) return v;

  // ./data/xxx.csv → 去掉 ./ 再補 BASE
  if (v.startsWith("./")) return `${b}${v.slice(2)}`;

  // /ju-smile-calorie-app/data/xxx.csv → 去掉最前面的 / 再補 BASE
  if (v.startsWith("/")) return `${b}${v.slice(1)}`;

  // 其餘（多半是只給檔名）→ 自動補到 /data/
  return `${b}data/${v}`;
}

/** 抓四個 CSV（可加版本參數繞快取） */
export async function loadCsvBundle(versionParam = "") {
  const q = versionParam ? `?v=${versionParam}` : "";

  const [foodDb, unitMap, typeTable, met] = await Promise.all([
    fetch(`${resolveSrc("JU_SRC_FOOD", "Food_DB.csv")}${q}`).then((r) => r.text()),
    fetch(`${resolveSrc("JU_SRC_UNIT", "Unit_Map.csv")}${q}`).then((r) => r.text()),
    fetch(`${resolveSrc("JU_SRC_TYPE", "Type_Table.csv")}${q}`).then((r) => r.text()),
    fetch(`${resolveSrc("JU_SRC_MET", "Exercise_Met.csv")}${q}`).then((r) => r.text()),
  ]);

  return { foodDb, unitMap, typeTable, met };
}

/** 首次開啟自動導入（僅跑一次） */
export async function initialImportIfNeeded() {
  const HAS_IMPORTED = localStorage.getItem("JU_IMPORTED_V1");
  if (HAS_IMPORTED) return false;

  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle();
  localStorage.setItem("JU_FOOD_DB_CSV", foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV", unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV", met);
  localStorage.setItem("JU_IMPORTED_V1", "1");
  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

/** 手動同步（設定頁按鈕用） */
export async function manualSyncCsv() {
  const ts = Date.now().toString(); // 強制繞過快取
  const { foodDb, unitMap, typeTable, met } = await loadCsvBundle(ts);

  localStorage.setItem("JU_FOOD_DB_CSV", foodDb);
  localStorage.setItem("JU_UNIT_MAP_CSV", unitMap);
  localStorage.setItem("JU_TYPE_TABLE_CSV", typeTable);
  localStorage.setItem("JU_MET_TABLE_CSV", met);
  localStorage.setItem("JU_LAST_SYNC_AT", new Date().toISOString());
  return true;
}

/** 讀取 /data/version.json（顯示版本資訊用） */
export async function readVersionInfo() {
  try {
    const b = base();
    // 直接讀 /data/version.json；no-store 以便拿到最新
    const txt = await fetch(`${b}data/version.json?v=${Date.now()}`, {
      cache: "no-store",
    }).then((r) => r.text());
    const v = JSON.parse(txt);
    return { appVersion: v.appVersion, dataVersion: v.dataVersion };
  } catch {
    return null;
  }
}

/** 一鍵清空（除錯／重置用） */
export async function clearAllLocalData() {
  localStorage.clear();
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
