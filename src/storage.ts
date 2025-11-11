
import { DayData, Settings } from './types'

const SETTINGS_KEY = 'jusmile_settings_v2'
const COMBOS_KEY = 'jusmile_combos_v2'
export const dayKey = (iso: string)=> `jusmile_day_${iso}`

export const loadSettings = (): Settings => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || { kcalGoal:1600, proteinGoal:160, waterGoal:2000 } }
  catch { return { kcalGoal:1600, proteinGoal:160, waterGoal:2000 } }
}
export const saveSettings = (s: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))

export const loadDay = (iso: string): DayData => {
  try { return JSON.parse(localStorage.getItem(dayKey(iso)) || 'null') || { foods:[], water:0, exercises:[], body:{} } }
  catch { return { foods:[], water:0, exercises:[], body:{} } }
}
export const saveDay = (iso: string, d: DayData) => localStorage.setItem(dayKey(iso), JSON.stringify(d))

export const loadCombos = ():any[]=>{
  try { return JSON.parse(localStorage.getItem(COMBOS_KEY) || 'null') || [] }
  catch { return [] }
}
export const saveCombos = (arr:any[]) => localStorage.setItem(COMBOS_KEY, JSON.stringify(arr))
