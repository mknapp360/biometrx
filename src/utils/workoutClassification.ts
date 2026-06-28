export type BioMetRxCategory =
  | 'strength'
  | 'cardio'
  | 'walking'
  | 'cycling'
  | 'running'
  | 'mixed'
  | 'mobility'
  | 'unknown'

export const CATEGORY_LABELS: Record<BioMetRxCategory, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  walking: 'Walking',
  cycling: 'Cycling',
  running: 'Running',
  mixed: 'Mixed / Circuit',
  mobility: 'Mobility',
  unknown: 'Workout',
}

export const CATEGORY_COLORS: Record<BioMetRxCategory, string> = {
  strength: '#f97316',
  cardio: '#3b82f6',
  walking: '#2dd4bf',
  cycling: '#f59e0b',
  running: '#29ab00',
  mixed: '#8b5cf6',
  mobility: '#ec4899',
  unknown: '#6b7280',
}

const HC_MAP: Record<string, BioMetRxCategory> = {
  // Strength
  strengthTraining: 'strength',
  traditionalStrengthTraining: 'strength',
  functionalStrengthTraining: 'strength',
  weightlifting: 'strength',
  coreTraining: 'strength',
  backExtension: 'strength',
  benchPress: 'strength',
  benchSitUp: 'strength',
  burpee: 'strength',
  calisthenics: 'strength',
  crunch: 'strength',
  deadlift: 'strength',
  dumbbellCurlLeftArm: 'strength',
  dumbbellCurlRightArm: 'strength',
  dumbbellFrontRaise: 'strength',
  dumbbellLateralRaise: 'strength',
  dumbbellTricepsExtensionLeftArm: 'strength',
  dumbbellTricepsExtensionRightArm: 'strength',
  dumbbellTricepsExtensionTwoArm: 'strength',
  latPullDown: 'strength',
  lunge: 'strength',
  barbellShoulderPress: 'strength',
  plank: 'strength',
  upperTwist: 'strength',
  forwardTwist: 'strength',

  // Running
  running: 'running',
  runningTreadmill: 'running',
  trackAndField: 'running',

  // Walking
  walking: 'walking',
  hiking: 'walking',
  stairs: 'walking',
  stairClimbing: 'walking',
  golf: 'walking',

  // Cycling
  cycling: 'cycling',
  distanceCycling: 'cycling',
  bikingStationary: 'cycling',
  handCycling: 'cycling',

  // Cardio / aerobic
  elliptical: 'cardio',
  rowing: 'cardio',
  rowingMachine: 'cardio',
  swimming: 'cardio',
  swimmingPool: 'cardio',
  swimmingOpenWater: 'cardio',
  jumpRope: 'cardio',
  jumpingJack: 'cardio',
  stairClimbingMachine: 'cardio',
  waterFitness: 'cardio',
  aerobics: 'cardio',
  cardioDance: 'cardio',
  dance: 'cardio',
  tennis: 'cardio',
  tableTennis: 'cardio',
  badminton: 'cardio',
  squash: 'cardio',
  soccer: 'cardio',
  basketball: 'cardio',
  hockey: 'cardio',
  volleyball: 'cardio',
  handball: 'cardio',
  rugby: 'cardio',
  cricket: 'cardio',
  baseball: 'cardio',
  skatingSports: 'cardio',
  skiing: 'cardio',
  snowboarding: 'cardio',
  surfing: 'cardio',
  paddleSports: 'cardio',

  // Mixed / circuit
  highIntensityIntervalTraining: 'mixed',
  crossTraining: 'mixed',
  bootCamp: 'mixed',
  boxing: 'mixed',
  kickboxing: 'mixed',
  martialArts: 'mixed',
  climbing: 'mixed',
  rockClimbing: 'mixed',
  gymnastics: 'mixed',
  stepTraining: 'mixed',
  mixedCardio: 'mixed',

  // Mobility
  yoga: 'mobility',
  stretching: 'mobility',
  pilates: 'mobility',
  mindAndBody: 'mobility',
  flexibility: 'mobility',
  taiChi: 'mobility',
  cooldown: 'mobility',
  guidedBreathing: 'mobility',
  mindfulness: 'mobility',

  other: 'unknown',
}

export function classifyWorkout(hcType: string): BioMetRxCategory {
  return HC_MAP[hcType] ?? 'unknown'
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function fmtDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`
  return `${Math.round(metres)} m`
}
