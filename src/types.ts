// src/types.ts
export type FoodItem = {
  name?: string;            // 食物名稱（若以 Type 估算，可僅用 type）
  meal?: string;            // 餐別：早餐 / 午餐 / 晚餐 / 點心 / 宵夜
  type: string;             // 類別或標記（精準/自定義熱量/其他類/或 Type 名稱）
  servings: number;         // 幾份
  kcal: number;             // 總熱量
  protein: number;          // 總蛋白質 (g)
  carb: number;             // 總碳水 (g)
  fat: number;              // 總脂肪 (g)
};

export type ExerciseItem = {
  name: string;             // 運動名稱
  met: number;              // MET 值
  minutes: number;          // 時長（分鐘）
  weight: number;           // 體重（kg）
  kcal: number;             // 預估消耗（kcal）
};

export type DayData = {
  foods?: FoodItem[];
  exercises?: ExerciseItem[];
  water?: number;           // 當日飲水（ml）
  body?: { weight?: number };
};

export type Settings = {
  kcalGoal?: number;        // 每日熱量目標
  proteinGoal?: number;     // 每日蛋白質目標
  waterGoal?: number;       // 每日飲水目標
  activityGoal?: number;    // 每日運動時間目標（分鐘）
  weightTargetKg?: number;  // 體重目標（kg）
  weightTargetDate?: string;// 預計達成日期（YYYY-MM-DD）
  weightStartKg?: number | null; // 減重起始體重（kg）
  weightStartDate?: string; // 減重起始日期（YYYY-MM-DD）
};
