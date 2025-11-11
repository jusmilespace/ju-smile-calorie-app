// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Home as HomeIcon, ScanLine, LineChart, User, Utensils } from "lucide-react";
import type { DayData, Settings, FoodItem, ExerciseItem } from "./types";
import { loadDay, saveDay, loadSettings, saveSettings } from "./storage";
import { fetchCsv } from "./csv";

/* ---------- Global Styles ---------- */
const COLORS = { mint: "#97d0ba", border: "#e9ecef", bg: "#f7faf9", ink: "#1f2937" } as const;
const GlobalStyles = () => (
  <style>{`
    :root{ --mint:${COLORS.mint}; --border:${COLORS.border}; }
    body{ margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:${COLORS.bg}; color:${COLORS.ink}; }
    .wrap{ max-width: 680px; margin: 0 auto; padding: 12px; }
    .card{ background:#fff; border:1px solid var(--border); border-radius:16px; padding:12px; margin:12px 0; }
    .row{ display:flex; align-items:center; }
    .btn{ padding:8px 12px; border:1px solid var(--border); background:#fff; border-radius:12px; cursor:pointer; }
    .btn-solid{ background:var(--mint); color:#fff; border-color:transparent; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border); background:#fff; font-size:14px; outline:none; }
    .input:focus{ box-shadow:0 0 0 3px rgba(151,208,186,.25); border-color:var(--mint); }
    .grid{ display:grid; gap:8px; }
    .grid-2{ grid-template-columns:1fr 1fr; }
    .tabbar{ position:fixed; left:0; right:0; bottom:0; z-index:20; border-top:1px solid var(--border); background:#ffffffeb; backdrop-filter:saturate(180%) blur(8px); }
    .tabbar > .inner{ max-width:680px; margin:0 auto; padding:8px; display:flex; gap:6px; justify-content:space-between; }
    .tab-pill{ display:flex; align-items:center; gap:6px; padding:10px 12px; border-radius:9999px; border:1px solid var(--border); background:#fff; color:#1f2937; min-width:44px; min-height:44px; transition:.12s ease; }
    .tab-pill.is-active{ background:var(--mint); border-color:transparent; color:#fff; }
    .toast{ position:fixed; left:0; right:0; bottom:88px; display:flex; justify-content:center; z-index:40; }
    .toast .msg{ background:#111a; color:#fff; padding:8px 12px; border-radius:999px; font-size:13px; }
  `}</style>
);

/* ---------- Helpers (UTC 儲存、在地顯示) ---------- */
const pad = (n:number)=> String(n).padStart(2,"0");
const addDays = (utcYmd: string, delta: number) => {
  const [y,m,d] = utcYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m||1)-1, d||1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0,10);
};
const localYMDFromUTC = (utcYmd: string) => {
  const dt = new Date(utcYmd+"T00:00:00Z");
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
};
const utcKeyForLocalToday = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const utcMidnight = new Date(Date.UTC(y, m, d));
  return utcMidnight.toISOString().slice(0, 10);
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round0 = (n: number) => Math.round(n);
const clamp = (n:number,min:number,max:number)=> Math.max(min, Math.min(max, n));

/* ---------- 日期抬頭（補上） ---------- */
function DateHeader({ dateUTC, setDateUTC }: { dateUTC: string; setDateUTC: (s: string) => void }) {
  const localStr = localYMDFromUTC(dateUTC);
  return (
    <header className="card" style={{ position:"sticky", top:0, zIndex:5, borderRadius:0, borderLeft:0, borderRight:0 }}>
      <div className="row" style={{ justifyContent:"space-between" }}>
        <div className="row" style={{ gap:8 }}>
          <button className="btn" onClick={()=>setDateUTC(addDays(dateUTC,-1))}>← 昨天</button>
          <button className="btn" onClick={()=>setDateUTC(utcKeyForLocalToday())}>今天</button>
          <button className="btn" onClick={()=>setDateUTC(addDays(dateUTC,1))}>明天 →</button>
        </div>
        <div style={{ fontWeight:700 }}>{localStr}</div>
      </div>
    </header>
  );
}

/* ---------- 預設 Type Table（可被 localStorage 覆蓋） ---------- */
const DEFAULT_TYPE_TABLE: Record<string, { kcal: number; protein: number; carb: number; fat: number }> = {
  "全穀雜糧類": { kcal: 70, protein: 2, carb: 15, fat: 0.5 },
  "豆魚蛋肉類": { kcal: 55, protein: 7, carb: 0, fat: 2 },
  "乳品類": { kcal: 100, protein: 6, carb: 10, fat: 3 },
  "蔬菜類": { kcal: 25, protein: 1, carb: 5, fat: 0 },
  "水果類": { kcal: 60, protein: 0.5, carb: 15, fat: 0 },
  "油脂類": { kcal: 45, protein: 0, carb: 0, fat: 5 },
  "堅果種子類": { kcal: 85, protein: 3, carb: 3, fat: 7 },

};

/* ---------- 可被 localStorage 覆蓋的資料 ---------- */
const PRECISE_DB: Record<string, Record<string, { kcal: number; protein: number; carb: number; fat: number }>> =
  JSON.parse(localStorage.getItem("JU_PRECISE_DB") || "null") || {
    吐司: { 片: { kcal: 70, protein: 2.3, carb: 13.1, fat: 0.9 } },
    雞蛋: { 顆: { kcal: 70, protein: 6.3, carb: 0.6, fat: 4.8 } },
    牛奶: { 杯: { kcal: 150, protein: 8, carb: 12, fat: 8 } },
  };

const UNIT_MAP: Record<string, Array<{ unit: string; perUnitServings: number; type: string }>> =
  JSON.parse(localStorage.getItem("JU_UNIT_MAP") || "null") || {
    白飯: [{ unit: "碗", perUnitServings: 4, type: "全穀" }, { unit: "g", perUnitServings: 0.04, type: "全穀" }],
    吐司: [{ unit: "片", perUnitServings: 1, type: "全穀" }],
  };

/* ---------- 運動 MET ---------- */
const EXERCISE_MET: Record<string, number> =
  JSON.parse(localStorage.getItem("JU_EXERCISE_MET") || "null") || {
    "坐著不動": 1.0, "健走（約4km/h）": 3.5, "重訓（全身）": 6.0, "慢跑（8km/h）": 7.0, "游泳（自由式中速）": 8.3, "登山健行": 9.0, "跳繩（快）": 12.0,
  };
const calcExerciseKcal = (met: any, weightKg: any, minutes: any) => {
  const m = parseFloat(met) || 0, w = parseFloat(weightKg) || 0, t = parseFloat(minutes) || 0;
  return Math.round(m * 3.5 * w / 200 * t);
};

/* ---------- 常用餐點 ---------- */
type MealCombo = { name: string; items: FoodItem[] };
const FAVORITES_KEY = "JU_MEAL_COMBOS";
const loadCombos = (): MealCombo[] => JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
const saveCombos = (arr: MealCombo[]) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));

/* ---------- AddPayload 放前面 ---------- */
type AddPayload =
  | { kind: "water"; water: number }
  | { kind: "weight"; weight: number }
  | ({ kind: "exercise" } & ExerciseItem)
  | ({ kind: "food" } & FoodItem);

/* ---------- 小元件 ---------- */
function Field({ label, children }: { label: string; children: any }) {
  return <label className="block text-sm"><div style={{ color: "#6b7280", marginBottom: 4 }}>{label}</div>{children}</label>;
}
function Card({ title, right, children }: { title: string; right?: any; children: any }) {
  return <div className="card"><div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}><div className="font-medium">{title}</div>{right}</div>{children}</div>;
}
function Numeric({ value, onChange, inputRef }: { value: any; onChange: (v: any) => void; inputRef?: any }) {
  return <input ref={inputRef} className="input" inputMode="decimal" value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />;
}
function Toast({ msg }: { msg: string }) { return msg ? <div className="toast"><div className="msg">{msg}</div></div> : null; }
function Ring({ label, value, goal, unit }: { label: string; value: number; goal: number; unit?: string }) {
  const pct = clamp(goal ? (value / goal) * 100 : 0, 0, 100);
  return (
    <div style={{ textAlign: "center", width: "25%" }}>
      <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
        <svg viewBox="0 0 36 36" style={{ width: 64, height: 64 }}>
          <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#eee" strokeWidth={4} />
          <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke={COLORS.mint} strokeWidth={4} strokeDasharray={`${Math.round(pct)},100`} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{Math.round(pct)}%</div>
      </div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{Math.round(value)}{unit || ""}/{Math.round(goal)}{unit || ""}</div>
    </div>
  );
}

/* ---------- Home Screen ---------- */
function HomeScreen({
  dayData,
  setOpenQuick,
  onAddWater,
  onNotify,
  onDelExercise,
  onDelFood,
  waterGoal,
  goals,
  onAddWeightDirect,
}: {
  dayData: DayData;
  setOpenQuick: (x: any) => void;
  onAddWater: (n: number) => void;
  onNotify: (m: string) => void;
  onDelExercise: (idx: number) => void;
  onDelFood: (idx: number) => void;
  waterGoal: number;
  goals: { kcalGoal: number; proteinGoal: number; activityGoal: number };
  onAddWeightDirect: () => void;
}) {
  const kcal = (dayData.foods || []).reduce((s, f) => s + (f.kcal || 0), 0);
  const protein = round0((dayData.foods || []).reduce((s, f) => s + (f.protein || 0), 0));
  const activity = (dayData.exercises || []).reduce((s, e) => s + (e.minutes || 0), 0);
  const exerciseKcal = (dayData.exercises || []).reduce((s, e) => s + (e.kcal || 0), 0);
  const netKcal = kcal - exerciseKcal;

  const [waterInput, setWaterInput] = useState("");

  const [selectedByMeal, setSelectedByMeal] = useState<Record<string, Record<number, boolean>>>({});
  const toggleSel = (meal: string, idx: number) => {
    setSelectedByMeal(prev => ({ ...prev, [meal]: { ...(prev[meal]||{}), [idx]: !((prev[meal]||{})[idx]) } }));
  };
  const saveAsCombo = (meal: string) => {
    const sel = selectedByMeal[meal] || {};
    const picked = (dayData.foods || []).filter((f, i) => f.meal === meal && sel[i]);
    if (!picked.length) return;
    const name = prompt("請輸入常用組合名稱") || "";
    if (!name.trim()) return;
    const items = picked.map(({ meal: _omit, ...rest }) => rest) as FoodItem[];
    const list = loadCombos();
    list.push({ name, items });
    saveCombos(list);
    onNotify("已儲存至常用組合");
    setSelectedByMeal(s => ({ ...s, [meal]: {} }));
  };

  const WaterCard = (
    <Card title="喝水" right={null}>
      <div className="row" style={{ gap: 8 }}>
        {[500, 1000, 2000].map(n => <button key={n} className="btn" onClick={() => { onAddWater(n); onNotify("已加入"); }}>+{n} ml</button>)}
        <div className="row" style={{ gap: 6, marginLeft: "auto" }}>
          <Numeric value={waterInput} onChange={setWaterInput} />
          <span style={{ fontSize: 12, color: "#666" }}>ml</span>
          <button className="btn btn-solid" onClick={() => { const v = parseInt(waterInput || "0", 10); if (v > 0) { onAddWater(v); setWaterInput(""); onNotify("已加入"); } }}>加入</button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="wrap" style={{ paddingBottom: 88 }}>
      <div className="row" style={{ gap: 8, justifyContent: "space-around" }}>
        <Ring label="熱量" value={kcal} goal={goals.kcalGoal} />
        <Ring label="蛋白質" value={protein} goal={goals.proteinGoal} unit="g" />
        <Ring label="飲水" value={dayData.water || 0} goal={waterGoal || 2000} unit="ml" />
        <Ring label="運動" value={activity} goal={goals.activityGoal || 30} unit="min" />
      </div>

      <div className="grid grid-2">
        <div className="card"><div style={{ fontSize: 12, color: "#666" }}>運動消耗</div><div style={{ fontSize: 18, fontWeight: 700 }}>{exerciseKcal} kcal</div></div>
        <div className="card"><div style={{ fontSize: 12, color: "#666" }}>淨熱量</div><div style={{ fontSize: 18, fontWeight: 700 }}>{netKcal} kcal</div></div>
      </div>

      {WaterCard}

      <Card key="早餐" title="早餐" right={<button className="btn" onClick={() => setOpenQuick({ t: "food", meal:"早餐" })}>+ 新增</button>}>
        {(dayData.foods || []).filter(f => f.meal === "早餐").length === 0 ? (
          <div style={{ fontSize: 12, color: "#777" }}>尚無記錄</div>
        ) : (
          <>
            <ul style={{ fontSize: 12, color: "#333", paddingLeft: 18 }}>
              {(dayData.foods || []).map((f, i) => f.meal === "早餐" && (
                <li key={i} className="row" style={{ justifyContent: "space-between", gap:8 }}>
                  <label className="row" style={{ gap:6 }}>
                    <input type="checkbox" checked={!!(selectedByMeal["早餐"]||{})[i]} onChange={()=>toggleSel("早餐", i)} />
                    <span>{f.name || f.type} × {round1(f.servings)} 份</span>
                  </label>
                  <span style={{ color: "#666" }}>
                    {f.kcal} kcal <button className="btn" onClick={() => onDelFood(i)} style={{ marginLeft: 8 }}>刪除</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="row" style={{ gap:8, marginTop:8, justifyContent:"flex-start" }}>
              <button className="btn" onClick={()=>saveAsCombo("早餐")}>存為常用組合</button>
            </div>
          </>
        )}
      </Card>

      {["午餐", "晚餐", "點心", "宵夜"].map(meal => (
        <Card key={meal} title={meal} right={<button className="btn" onClick={() => setOpenQuick({ t: "food", meal })}>+ 新增</button>}>
          {(dayData.foods || []).filter(f => f.meal === meal).length === 0 ? (
            <div style={{ fontSize: 12, color: "#777" }}>尚無記錄</div>
          ) : (
            <>
              <ul style={{ fontSize: 12, color: "#333", paddingLeft: 18 }}>
                {(dayData.foods || []).map((f, i) => f.meal === meal && (
                  <li key={i} className="row" style={{ justifyContent: "space-between", gap:8 }}>
                    <label className="row" style={{ gap:6 }}>
                      <input type="checkbox" checked={!!(selectedByMeal[meal]||{})[i]} onChange={()=>toggleSel(meal, i)} />
                      <span>{f.name || f.type} × {round1(f.servings)} 份</span>
                    </label>
                    <span style={{ color: "#666" }}>
                      {f.kcal} kcal <button className="btn" onClick={() => onDelFood(i)} style={{ marginLeft: 8 }}>刪除</button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="row" style={{ gap:8, marginTop:8, justifyContent:"flex-start" }}>
                <button className="btn" onClick={()=>saveAsCombo(meal)}>存為常用組合</button>
              </div>
            </>
          )}
        </Card>
      ))}

      <Card title="運動" right={<button className="btn" onClick={() => setOpenQuick({ t: "exercise" })}>+ 運動</button>}>
        {(dayData.exercises || []).length === 0 ? <div style={{ fontSize: 12, color: "#777" }}>尚無記錄</div> : (
          <ul style={{ fontSize: 12, color: "#333", paddingLeft: 18 }}>
            {(dayData.exercises || []).map((e, i) => (
              <li key={i} className="row" style={{ justifyContent: "space-between" }}>
                <span>{e.name} · {e.minutes} 分</span>
                <span style={{ color: "#666" }}>
                  {e.kcal} kcal <button className="btn" onClick={() => onDelExercise(i)} style={{ marginLeft: 8 }}>刪除</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="體重" right={<button className="btn" onClick={onAddWeightDirect}>+ 填入</button>}>
        <div style={{ fontSize: 12, color: "#666" }}>{dayData.body?.weight ? `今日體重：${dayData.body.weight} kg` : "今日尚未量測"}</div>
      </Card>
    </div>
  );
}

/* ---------- Quick 記錄頁（飲食/運動） ---------- */
function QuickPage({
  onAdd,
  onNotify,
  goHome,
  typeTable,
}: {
  onAdd: (p: AddPayload) => void;
  onNotify: (m: string) => void;
  goHome: () => void;
  typeTable: Record<string, { kcal: number; protein: number; carb: number; fat: number }>;
}) {
  const [formKey, setFormKey] = useState(0);

  /* 新增飲食 */
  const UNIT_WHITELIST = ["g", "ml", "個", "顆", "碗", "片", "湯匙", "茶匙", "張", "粒", "杯", "根", "把", "份"];
  const [meal, setMeal] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("g");
  const [fallbackType, setFallbackType] = useState("全穀");
  const [fallbackServ, setFallbackServ] = useState("1");
  const qtyRef = useRef<HTMLInputElement | null>(null);

  const hitPrecise = !!PRECISE_DB[name];
  const hitUnit = !!UNIT_MAP[name];
  const unitOptions = hitPrecise ? Object.keys(PRECISE_DB[name] || {}) : (hitUnit ? (UNIT_MAP[name] || []).map(r => r.unit) : UNIT_WHITELIST);
  useEffect(() => { if (!unitOptions.includes(unit)) setUnit(unitOptions[0] || "g"); }, [name, unitOptions]);

  // === 食物名稱：模糊選單 ===
  const [showFoodSug, setShowFoodSug] = useState(false);
  const [highlightFood, setHighlightFood] = useState(0);
  const normalizeFood = (s: string) =>
    (s || "").toLowerCase().replace(/（/g, "(").replace(/）/g, ")").replace(/\s+/g, "").replace(/[()]/g, "");
  const FOOD_NAME_POOL = useMemo(() => {
    const set = new Set<string>();
    Object.keys(PRECISE_DB).forEach(k => set.add(k));
    Object.keys(UNIT_MAP).forEach(k => set.add(k));
    return Array.from(set);
  }, []);
  const foodSugList = useMemo(() => {
    const q = normalizeFood(name);
    const pool = q ? FOOD_NAME_POOL.filter(n => normalizeFood(n).includes(q)) : FOOD_NAME_POOL;
    const scored = pool.map(n => {
      const nn = normalizeFood(n);
      const idx = nn.indexOf(q);
      const prefixBoost = nn.startsWith(q) ? -1000 : 0;
      const posScore = idx >= 0 ? idx : 9999;
      const lenScore = Math.abs(nn.length - q.length) * 0.01;
      return { n, score: prefixBoost + posScore + lenScore };
    }).sort((a, b) => a.score - b.score);
    return scored.slice(0, 30);
  }, [name]);
  function pickFoodSuggestion(i: number) {
    const it = foodSugList[i]; if (!it) return;
    setName(it.n);
    if (PRECISE_DB[it.n]) {
      const units = Object.keys(PRECISE_DB[it.n]); if (units.length) setUnit(units[0]);
    } else if (UNIT_MAP[it.n]?.length) {
      setUnit(UNIT_MAP[it.n][0].unit);
    }
    setShowFoodSug(false); setHighlightFood(0);
  }
  function onFoodNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showFoodSug && (e.key === "ArrowDown" || e.key === "ArrowUp")) setShowFoodSug(true);
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightFood(h => Math.min(h + 1, foodSugList.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlightFood(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { if (showFoodSug && foodSugList.length) { e.preventDefault(); pickFoodSuggestion(highlightFood); } }
    if (e.key === "Escape")    { setShowFoodSug(false); }
  }

  // ---- 計算 ----
  function calcByTypeServings(type: string, servings: number) {
    const t = typeTable[type]; if (!t || servings <= 0) return null;
    return { servings, type, kcal: Math.round(t.kcal * servings), protein: round1(t.protein * servings), carb: round1(t.carb * servings), fat: round1(t.fat * servings) };
  }
  function calcByUnitMap(foodName: string, qty: number, unit: string) {
    const rows = UNIT_MAP[foodName]; if (!rows) return null; const r = rows.find(x => x.unit === unit); if (!r) return null;
    return calcByTypeServings(r.type, qty * r.perUnitServings);
  }
  const preview = useMemo(() => {
    if (!name) return null;
    const q = parseFloat(qty) || 0; if (q <= 0) return null;
    if (hitPrecise) {
      const per = PRECISE_DB[name][unit]; if (!per) return null;
      return { name, meal, type: "精準", servings: q, kcal: Math.round(per.kcal * q), protein: Math.round(per.protein * q), carb: Math.round(per.carb * q), fat: Math.round(per.fat * q) } as FoodItem;
    }
    if (hitUnit) {
      const row = (UNIT_MAP[name] || []).find(x => x.unit === unit); if (!row) return null;
      const base = typeTable[row.type]; if (!base) return null;
      const s = q * row.perUnitServings;
      return { name, meal, type: row.type, servings: s, kcal: Math.round(base.kcal * s), protein: round1(base.protein * s), carb: round1(base.carb * s), fat: round1(base.fat * s) } as FoodItem;
    }
    const base = typeTable[fallbackType]; if (!base) return null;
    const s = parseFloat(fallbackServ) || 0; if (s <= 0) return null;
    return { name, meal, type: fallbackType, servings: s, kcal: Math.round(base.kcal * s), protein: round1(base.protein * s), carb: round1(base.carb * s), fat: round1(base.fat * s) } as FoodItem;
  }, [name, qty, unit, meal, fallbackType, fallbackServ, hitPrecise, hitUnit, typeTable]);

  function addFood() {
    if (preview && meal) {
      onAdd({ kind: "food", ...preview });
      setFormKey(k => k + 1);
      onNotify("已加入");
    }
  }

  /* ---- 運動（模糊選單） ---- */
  const [exName, setExName] = useState("");
  const [met, setMet] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [weight, setWeight] = useState(localStorage.getItem("JU_LAST_WEIGHT") || "70");
  useEffect(() => { if (EXERCISE_MET[exName] != null) setMet(String(EXERCISE_MET[exName])); }, [exName]);
  const exKcal = useMemo(() => calcExerciseKcal(met, weight, minutes), [met, weight, minutes]);

  const [showSug, setShowSug] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const normalize = (s: string) => (s || "").toLowerCase().replace(/（/g, "(").replace(/）/g, ")").replace(/\s+/g, "").replace(/[()]/g, "");
  const exSugList = useMemo(() => {
    const q = normalize(exName);
    const entries = Object.entries(EXERCISE_MET);
    const pool = q ? entries.filter(([n]) => normalize(n).includes(q)) : entries;
    const scored = pool.map(([n, v]) => {
      const nn = normalize(n);
      const idx = nn.indexOf(q);
      const prefixBoost = nn.startsWith(q) ? -1000 : 0;
      const posScore = idx >= 0 ? idx : 9999;
      const lenScore = Math.abs(nn.length - q.length) * 0.01;
      return { n, v, score: prefixBoost + posScore + lenScore };
    }).sort((a, b) => a.score - b.score);
    return scored.slice(0, 20);
  }, [exName]);
  function pickSuggestion(i: number) {
    const it = exSugList[i]; if (!it) return;
    setExName(it.n);
    setMet(String(it.v));
    setShowSug(false);
    setHighlight(0);
  }
  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSug && (e.key === "ArrowDown" || e.key === "ArrowUp")) setShowSug(true);
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, exSugList.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { if (showSug && exSugList.length) { e.preventDefault(); pickSuggestion(highlight); } }
    if (e.key === "Escape")    { setShowSug(false); }
  }

  const [metFilter, setMetFilter] = useState("");
  const metPairs = useMemo(() => {
    const q = metFilter.trim().toLowerCase();
    const entries = Object.entries(EXERCISE_MET);
    if (!q) return entries;
    return entries.filter(([n]) => n.toLowerCase().includes(q));
  }, [metFilter]);

  return (
    <div className="wrap" style={{ paddingBottom: 88 }}>
      {/* 新增飲食 */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}><div style={{ fontWeight: 600 }}>新增飲食</div></div>
        <div className="grid grid-2">
          <Field label="餐別">
            <select className="input" value={meal} onChange={e => setMeal((e.target as HTMLSelectElement).value)}>
              <option value="">- 請選擇 -</option>{["早餐", "午餐", "晚餐", "點心", "宵夜"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          {/* 食物名稱：模糊下拉 */}
          <Field label="食物名稱">
            <div style={{ position: "relative" }}>
              <input
                className="input"
                value={name}
                onChange={e => { setName((e.target as HTMLInputElement).value); setShowFoodSug(true); }}
                onFocus={() => setShowFoodSug(true)}
                onKeyDown={onFoodNameKeyDown}
                placeholder="輸入關鍵字（例：白飯、雞胸、優格）"
                autoComplete="off"
              />
              {showFoodSug && foodSugList.length > 0 && (
                <div
                  style={{
                    position: "absolute", left: 0, right: 0, top: "100%",
                    background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
                    marginTop: 6, maxHeight: 260, overflow: "auto", zIndex: 50, boxShadow: "0 8px 20px rgba(0,0,0,.06)"
                  }}
                  onMouseDown={e => e.preventDefault()}
                >
                  {foodSugList.map((it, i) => (
                    <div
                      key={it.n}
                      onMouseEnter={() => setHighlightFood(i)}
                      onClick={() => pickFoodSuggestion(i)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", cursor: "pointer",
                        background: i === highlightFood ? "rgba(151,208,186,.12)" : "#fff"
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{it.n}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {PRECISE_DB[it.n] ? "精準" : (UNIT_MAP[it.n] ? "單位換算" : "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="數量"><Numeric value={qty} onChange={setQty} /></Field>
          <Field label="單位">
            <select className="input" value={unit} onChange={e => setUnit((e.target as HTMLSelectElement).value)}>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        {/* 找不到精準/單位換算時，才顯示 Type × 份量估算 */}
        {!hitPrecise && !hitUnit && (
          <>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <Field label="類別 Type">
                <select className="input" value={fallbackType} onChange={e => setFallbackType((e.target as HTMLSelectElement).value)}>
                  {Object.keys(typeTable).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="份量 servings"><Numeric value={fallbackServ} onChange={setFallbackServ} /></Field>
            </div>
            <div className="card" style={{ marginTop: 8 }}>
              <div style={{ color: "#777" }}>
                未搜尋到符合的食物, 請選擇類別 Type 與份量, 以估算熱量。
              </div>
            </div>
          </>
        )}

        {/* 預覽 */}
        {(preview) && (
          <div className="card" style={{ marginTop: 8 }}>
            代換：{preview.name || preview.type} × {round1(preview.servings)} 份<br />
            Kcal {preview.kcal} · 蛋白質 {round0(preview.protein)}g · 碳水 {preview.carb}g · 脂肪 {preview.fat}g
          </div>
        )}

        <div className="row" style={{ gap:8, marginTop:8 }}>
          <div style={{ flex:1 }} />
          <button className="btn btn-solid" disabled={!preview || !meal} onClick={addFood}>加入單品</button>
        </div>
      </div>

      {/* 運動（模糊選單） */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}><div style={{ fontWeight: 600 }}>運動</div></div>
        <div className="grid grid-2">
          <Field label="運動名稱">
            <div style={{ position: "relative" }}>
              <input
                className="input"
                value={exName}
                onChange={e => { setExName((e.target as HTMLInputElement).value); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onKeyDown={onNameKeyDown}
                placeholder="輸入關鍵字（例：慢跑、重訓、游泳）"
                autoComplete="off"
              />
              {showSug && exSugList.length > 0 && (
                <div
                  style={{
                    position: "absolute", left: 0, right: 0, top: "100%",
                    background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
                    marginTop: 6, maxHeight: 240, overflow: "auto", zIndex: 50, boxShadow: "0 8px 20px rgba(0,0,0,.06)"
                  }}
                  onMouseDown={e => e.preventDefault()}
                >
                  {exSugList.map((it, i) => (
                    <div
                      key={it.n}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pickSuggestion(i)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", cursor: "pointer",
                        background: i === highlight ? "rgba(151,208,186,.12)" : "#fff"
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{it.n}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>MET {it.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="MET"><Numeric value={met} onChange={setMet} /></Field>
          <Field label="分鐘"><Numeric value={minutes} onChange={setMinutes} /></Field>
          <Field label="體重(kg)"><Numeric value={weight} onChange={setWeight} /></Field>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>計算公式：kcal = MET × 3.5 × 體重(kg) ÷ 200 × 時間(分鐘)</div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>預估消耗：{exKcal} kcal</div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-solid"
            disabled={!exName || !(parseFloat(met) > 0) || !(parseFloat(minutes) > 0) || !(parseFloat(weight) > 0)}
            onClick={() => {
              // 移除多餘的 type 屬性，符合 ExerciseItem
              onAdd({ kind: "exercise", name: exName, met: +met, minutes: +minutes, weight: +weight, kcal: exKcal });
              onNotify("已加入");
              goHome();
            }}
          >加入</button>
        </div>
      </div>

      {/* MET 參考表（前端參考） */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 600 }}>MET 參考表</div>
          <div style={{ width: 200 }}>
            <input className="input" placeholder="搜尋運動…" value={metFilter} onChange={e=>setMetFilter((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div style={{ maxHeight: 240, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background:"#f8fafb" }}>
                <th style={{ textAlign:"left", padding:"8px 10px", borderBottom:"1px solid var(--border)" }}>運動名稱</th>
                <th style={{ textAlign:"right", padding:"8px 10px", borderBottom:"1px solid var(--border)" }}>MET</th>
              </tr>
            </thead>
            <tbody>
              {metPairs.map(([n,v])=>(
                <tr key={n}>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f2f4" }}>{n}</td>
                  <td style={{ padding:"6px 10px", textAlign:"right", borderBottom:"1px solid #f0f2f4" }}>{v}</td>
                </tr>
              ))}
              {metPairs.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding:"10px", color:"#777", textAlign:"center" }}>找不到符合的運動</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:12, color:"#666", marginTop:6 }}>
          小提醒：不同強度/動作型態的 MET 可能不同，上表僅供估算參考。
        </div>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [srcPrecise, setSrcPrecise] = useState(localStorage.getItem("JU_SRC_PRECISE") || "");
  const [srcUnit, setSrcUnit] = useState(localStorage.getItem("JU_SRC_UNIT") || "");
  const [srcMet, setSrcMet] = useState(localStorage.getItem("JU_SRC_MET") || "");
  const [srcType, setSrcType] = useState(localStorage.getItem("JU_SRC_TYPE") || "");

  // Type Table 以 state 管理
  const [typeTable, setTypeTable] = useState<Record<string, { kcal: number; protein: number; carb: number; fat: number }>>(
    JSON.parse(localStorage.getItem("JU_TYPE_TABLE") || "null") || DEFAULT_TYPE_TABLE
  );

  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [dateUTC, setDateUTC] = useState(utcKeyForLocalToday());
  const [tab, setTab] = useState<'home' | 'quick' | 'scan' | 'reports' | 'me'>('home');
  const [data, setData] = useState<DayData>(loadDay(dateUTC));
  const [toast, setToast] = useState("");

  useEffect(() => setData(loadDay(dateUTC)), [dateUTC]);
  useEffect(() => saveDay(dateUTC, data), [dateUTC, data]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1200); };

  function saveSources() {
    localStorage.setItem("JU_SRC_PRECISE", srcPrecise || "");
    localStorage.setItem("JU_SRC_UNIT", srcUnit || "");
    localStorage.setItem("JU_SRC_MET", srcMet || "");
    localStorage.setItem("JU_SRC_TYPE", srcType || "");
    setToast("來源已儲存");
  }

  async function syncPrecise() {
    if (!srcPrecise) return;
    const rows = await fetchCsv(srcPrecise);
    const db: any = {};
    for (const r of rows) {
      const f = r.food, u = r.unit;
      if (!f || !u) continue;
      if (!db[f]) db[f] = {};
      db[f][u] = { kcal: +r.kcal || 0, protein: +r.protein || 0, carb: +r.carb || 0, fat: +r.fat || 0 };
    }
    localStorage.setItem("JU_PRECISE_DB", JSON.stringify(db));
    setToast("精準資料已同步");
  }
  async function syncUnit() {
    if (!srcUnit) return;
    const rows = await fetchCsv(srcUnit);
    const map: any = {};
    for (const r of rows) {
      const f = r.food, u = r.unit;
      if (!f || !u) continue;
      if (!map[f]) map[f] = [];
      map[f].push({ unit: u, perUnitServings: +r.perUnitServings || 0, type: r.type || "其他" });
    }
    localStorage.setItem("JU_UNIT_MAP", JSON.stringify(map));
    setToast("單位換算已同步");
  }
  async function syncMet() {
    if (!srcMet) return;
    const rows = await fetchCsv(srcMet);
    const met: any = {};
    for (const r of rows) {
      const n = (r.name ?? r.活動 ?? r.activity ?? r.Activity ?? "").toString().trim();
      const v = Number(r.met ?? r.MET ?? r.Met ?? r.met_value ?? r.value ?? NaN);
      if (n && !Number.isNaN(v)) met[n] = v;
    }
    localStorage.setItem("JU_EXERCISE_MET", JSON.stringify(met));
    setToast("MET 已同步");
  }
  async function syncType() {
    if (!srcType) return;
    const rows = await fetchCsv(srcType);
    const table: any = {};
    for (const r of rows) {
      const t = r.type || r.Type;
      if (!t) continue;
      table[t] = {
        kcal: +r.kcal || +r.Kcal || 0,
        protein: +r.protein || +r.Protein || 0,
        carb: +r.carb || +r.Carb || 0,
        fat: +r.fat || +r.Fat || 0,
      };
    }
    localStorage.setItem("JU_TYPE_TABLE", JSON.stringify(table));
    setTypeTable(table); // 即時更新
    setToast("Type Table 已同步");
  }

  function onAdd(payload: AddPayload) {
    switch (payload.kind) {
      case "water":
        setData(d => ({ ...d, water: (d.water || 0) + (+payload.water || 0) }));
        break;
      case "weight":
        localStorage.setItem("JU_LAST_WEIGHT", String(payload.weight));
        setData(d => ({ ...d, body: { ...(d.body || {}), weight: payload.weight } }));
        break;
      case "exercise":
        setData(d => ({ ...d, exercises: [ ...(d.exercises || []), payload as ExerciseItem ] }));
        break;
      case "food":
        setData(d => ({ ...d, foods: [ ...(d.foods || []), payload as FoodItem ] }));
        break;
      default:
        break;
    }
  }

  const onDelFood = (idx:number)=> setData(d=> ({...d, foods:(d.foods||[]).filter((_,i)=>i!==idx)}));
  const onDelExercise = (idx:number)=> setData(d=> ({...d, exercises:(d.exercises||[]).filter((_,i)=>i!==idx)}));

  const onAddWeightDirect = () => {
    const v = prompt("請輸入體重 (kg)");
    const n = v ? parseFloat(v) : 0;
    if (n > 0) {
      onAdd({ kind: "weight", weight: n });
      notify("已填入");
    }
  };

  useEffect(() => {
    try { if (!typeTable["全穀雜糧類"]) console.warn("TypeTable: '全穀雜糧類' 不在表內"); } catch {}
  }, [typeTable]);

  return (
    <div>
      <GlobalStyles />
      <DateHeader dateUTC={dateUTC} setDateUTC={setDateUTC} />

      {tab === "home" && <HomeScreen
        dayData={data}
        setOpenQuick={() => setTab("quick")}
        onAddWater={(n) => onAdd({ kind: "water", water: n })}
        onNotify={notify}
        onDelExercise={onDelExercise}
        onDelFood={onDelFood}
        waterGoal={settings.waterGoal || 2000}
        goals={{ kcalGoal: settings.kcalGoal || 1600, proteinGoal: settings.proteinGoal || 160, activityGoal: ((settings as any).activityGoal || 30) }}
        onAddWeightDirect={onAddWeightDirect}
      />}

      {tab === "quick" && <QuickPage onAdd={onAdd} onNotify={notify} goHome={() => setTab("home")} typeTable={typeTable} />}

      {tab === "scan" && <div className="wrap" style={{ paddingBottom: 88 }}><div className="card">掃描功能下版提供</div></div>}
      {tab === "reports" && <div className="wrap" style={{ paddingBottom: 88 }}><div className="card">報表下版提供</div></div>}

      {tab === "me" && (
        <div className="wrap" style={{ paddingBottom: 88 }}>
          <Card title="目標設定" right={null}>
            <div className="grid grid-2">
              <Field label="每日熱量目標 (Kcal)"><Numeric value={String(settings.kcalGoal || "")} onChange={(v) => setSettings(s => ({ ...s, kcalGoal: parseInt(v || "0", 10) }))} /></Field>
              <Field label="每日蛋白質目標 (g)"><Numeric value={String(settings.proteinGoal || "")} onChange={(v) => setSettings(s => ({ ...s, proteinGoal: parseInt(v || "0", 10) }))} /></Field>
              <Field label="每日飲水目標 (ml)"><Numeric value={String(settings.waterGoal || "")} onChange={(v) => setSettings(s => ({ ...s, waterGoal: parseInt(v || "0", 10) }))} /></Field>
              <Field label="每日運動目標 (分鐘)"><Numeric value={String(((settings as any).activityGoal || ""))} onChange={(v) => setSettings(s => ({ ...s, activityGoal: parseInt(v || "0", 10) || 0 }) as any)} /></Field>
            </div>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <Field label="體重目標 (kg)"><Numeric value={String(settings.weightTargetKg || "")} onChange={(v) => setSettings(s => ({ ...s, weightTargetKg: parseFloat(v || "0") }))} /></Field>
              <Field label="達成日期 (YYYY-MM-DD)"><input className="input" value={settings.weightTargetDate || ""} onChange={(e) => setSettings(s => ({ ...s, weightTargetDate: (e.target as HTMLInputElement).value }))} /></Field>
              <Field label="減重起始體重 (kg)"><Numeric value={String(settings.weightStartKg ?? "")} onChange={(v) => setSettings(s => ({ ...s, weightStartKg: v === "" ? null : parseFloat(v) }))} /></Field>
            </div>
            <div style={{ textAlign: "right", marginTop: 8 }}><button className="btn btn-solid" onClick={() => { saveSettings(settings); setToast("已儲存"); }}>儲存</button></div>
          </Card>

          <Card title="資料來源（CSV / Google Sheets）" right={null}>
            <div className="grid">
              <Field label="精準資料 Food_DB.csv URL">
                <input className="input" value={srcPrecise} onChange={e => setSrcPrecise((e.target as HTMLInputElement).value)} placeholder="https://.../Food_DB.csv" />
              </Field>
              <Field label="單位換算 Unit_Map.csv URL">
                <input className="input" value={srcUnit} onChange={e => setSrcUnit((e.target as HTMLInputElement).value)} placeholder="https://.../Unit_Map.csv" />
              </Field>
              <Field label="運動 MET Exercise_Met.csv URL">
                <input className="input" value={srcMet} onChange={e => setSrcMet((e.target as HTMLInputElement).value)} placeholder="https://.../Exercise_Met.csv" />
              </Field>
              <Field label="Type Table Type_Table.csv URL">
                <input className="input" value={srcType} onChange={e => setSrcType((e.target as HTMLInputElement).value)} placeholder="https://.../Type_Table.csv" />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={saveSources}>儲存來源</button>
              <button className="btn" onClick={syncPrecise}>同步精準資料</button>
              <button className="btn" onClick={syncUnit}>同步單位換算</button>
              <button className="btn" onClick={syncMet}>同步運動MET</button>
              <button className="btn" onClick={syncType}>同步 Type_Table</button>
            </div>
          </Card>
        </div>
      )}

      <Toast msg={toast} />

      <nav className="tabbar" style={{ paddingBottom: "max(env(safe-area-inset-bottom),8px)" }}>
        <div className="inner">
          {[
            { id: "home", label: "今天", icon: <HomeIcon size={20} /> },
            { id: "quick", label: "記錄", icon: <Utensils size={20} /> },
            { id: "scan", label: "掃描", icon: <ScanLine size={20} /> },
            { id: "reports", label: "報表", icon: <LineChart size={20} /> },
            { id: "me", label: "我的", icon: <User size={20} /> },
          ].map(t => {
            const active = tab === (t.id as typeof tab);
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id as typeof tab)} className={`tab-pill ${active ? "is-active" : ""}`} aria-label={t.label}>
                <span className="icon">{t.icon}</span><span className="label">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
