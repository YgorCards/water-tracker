export type WaterEntry = { id: string; amountMl: number; time: string }
export type DailyRecord = { date: string; totalMl: number; goalMl: number; entries: WaterEntry[] }
export type UserSettings = { goalMl: number; bottleMl: number; name: string }
