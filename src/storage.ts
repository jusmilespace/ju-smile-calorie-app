// src/storage.ts
import type { DayData, Settings } from "./types";

const SETTINGS_KEY = "JU_SETTINGS";
const DAY_PREFIX = "JU_DAY_";

// 載入設定（若無則給空物件，交由畫面顯示為空白或 0）
export function loadSettings(): Settings {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// 以 UTC 日期字串當主鍵，避免 DST 影響
export function loadDay(utcYmd: string): DayData {
  try {
    return JSON.parse(localStorage.getItem(DAY_PREFIX + utcYmd) || "{}");
  } catch {
    return {};
  }
}

export function saveDay(utcYmd: string, data: DayData) {
  try {
    localStorage.setItem(DAY_PREFIX + utcYmd, JSON.stringify(data));
  } catch {}
}
