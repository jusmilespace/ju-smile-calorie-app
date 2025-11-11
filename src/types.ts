
export type FoodItem = { name?: string; type: string; servings: number; meal: string; kcal: number; protein: number; carb: number; fat: number }
export type ExerciseItem = { name: string; met: number; minutes: number; weight: number; kcal: number }
export type DayData = { foods: FoodItem[]; water: number; exercises: ExerciseItem[]; body?: { weight?: number } }
export type Settings = { kcalGoal: number; proteinGoal: number; waterGoal: number; weightTargetKg?: number; weightTargetDate?: string; weightStartKg?: number|null }
