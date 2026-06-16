export interface HealthReading {
  id: string
  user_id: string
  recorded_at: string
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  weight_kg: number | null
  mounjaro_dose_mg: number | null
  glucose_mmol: number | null
  sleep_hours: number | null
  steps: number | null
  calories: number | null
  notes: string | null
  map: number | null
  pulse_pressure: number | null
  created_at: string
  updated_at: string
}

export interface HealthReadingInsert {
  user_id: string
  recorded_at: string
  systolic?: number | null
  diastolic?: number | null
  pulse?: number | null
  weight_kg?: number | null
  mounjaro_dose_mg?: number | null
  glucose_mmol?: number | null
  sleep_hours?: number | null
  steps?: number | null
  calories?: number | null
  notes?: string | null
  map?: number | null
  pulse_pressure?: number | null
}

export interface HealthReadingUpdate {
  recorded_at?: string
  systolic?: number | null
  diastolic?: number | null
  pulse?: number | null
  weight_kg?: number | null
  mounjaro_dose_mg?: number | null
  glucose_mmol?: number | null
  sleep_hours?: number | null
  steps?: number | null
  calories?: number | null
  notes?: string | null
  map?: number | null
  pulse_pressure?: number | null
}

export interface Insight {
  type: 'positive' | 'warning' | 'info' | 'severe'
  title: string
  message: string
}

export interface AverageBP {
  systolic: number
  diastolic: number
}

export interface BloodPanel {
  id: string
  user_id: string
  test_date: string
  hba1c: number | null
  glucose: number | null
  total_cholesterol: number | null
  hdl: number | null
  ldl: number | null
  triglycerides: number | null
  alt: number | null
  ast: number | null
  creatinine: number | null
  egfr: number | null
  crp: number | null
  testosterone: number | null
  shbg: number | null
  estradiol: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BloodPanelInsert = Omit<BloodPanel, 'id' | 'created_at' | 'updated_at'>
export type BloodPanelUpdate = Partial<Omit<BloodPanelInsert, 'user_id'>>
