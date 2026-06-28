import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useReadings } from '../hooks/useReadings'
import { useBloodPanels } from '../hooks/useBloodPanels'
import StatCard, { HeroStatCard } from '../components/StatCard'
import BPChart from '../components/BPChart'
import WeightChart from '../components/WeightChart'
import InsightCard from '../components/InsightCard'
import BiometrxAgeCard from '../components/BiometrxAgeCard'
import MetabolicResilienceCard from '../components/MetabolicResilienceCard'
import { getAverageBP, getLatestReading, getWeightChange, generateInsights } from '../utils/calculations'
import { calculateHealthScore } from '../utils/healthScore'
import { usePreferences } from '../hooks/usePreferences'
import { useHealthConnect } from '../hooks/useHealthConnect'
import { useWorkouts } from '../hooks/useWorkouts'
import { useWorkoutSync } from '../hooks/useWorkoutSync'
import { HeartPulse, Activity, Weight, Droplets, ChevronDown } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'

const UPF_LABELS = ['None', 'A little', 'Some', 'A lot']
const UPF_COLORS = ['#29ab00', '#FFC20A', '#f97316', '#DC2626']

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function pressureScore(r: {
  sugar_g?: number | null
  refined_starch_g?: number | null
  alcohol_units?: number | null
  ultra_processed_score?: number | null
  fibre_g?: number | null
}): number {
  return Math.max(0,
    (r.sugar_g != null ? Number(r.sugar_g) * 0.45 : 0) +
    (r.refined_starch_g != null ? Number(r.refined_starch_g) * 0.18 : 0) +
    (r.alcohol_units != null ? Number(r.alcohol_units) * 9 : 0) +
    (r.ultra_processed_score != null ? Number(r.ultra_processed_score) * 18 : 0) -
    (r.fibre_g != null ? Number(r.fibre_g) * 0.5 : 0)
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { readings, loading } = useReadings()
  const { panels, loading: panelsLoading } = useBloodPanels()
  const { prefs, formatWeight, weightUnit } = usePreferences()
  const { todaySteps, todayHeartRate, todayHRV, lastNightSleep, latestVO2Max, enabled: hcEnabled } = useHealthConnect()
  const { recentWorkouts, refresh: refreshWorkouts } = useWorkouts()
  const { sync: syncWorkouts } = useWorkoutSync()
  const hasSynced = useRef(false)
  const [prOpen, setPrOpen] = useState(false)
  const navigate = useNavigate()

  // Sync workouts from Health Connect on first mount when HC is enabled
  useEffect(() => {
    if (hcEnabled && !hasSynced.current) {
      hasSynced.current = true
      syncWorkouts().then(({ synced }) => {
        if (synced > 0) refreshWorkouts()
      })
    }
  }, [hcEnabled, syncWorkouts, refreshWorkouts])

  if (loading || panelsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const latest = getLatestReading(readings)
  const avg7 = getAverageBP(readings, 7)
  const avg30 = getAverageBP(readings, 30)
  const weightChange = getWeightChange(readings, 30)
  const latestMounjaroDose = readings.find(r => r.mounjaro_dose_mg !== null)?.mounjaro_dose_mg
  const latestStepsFromDb = readings.find(r => r.steps !== null)?.steps
  const latestSteps = hcEnabled && todaySteps !== null ? todaySteps : latestStepsFromDb

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Today's BP: average of the last 2 readings with BP taken today
  const todayBPReadings = readings.filter(r =>
    r.systolic !== null && r.diastolic !== null &&
    new Date(r.recorded_at) >= startOfToday
  )
  const last2BP = todayBPReadings.slice(0, 2)
  const todayBP = last2BP.length > 0 ? {
    systolic: Math.round(last2BP.reduce((sum, r) => sum + r.systolic!, 0) / last2BP.length),
    diastolic: Math.round(last2BP.reduce((sum, r) => sum + r.diastolic!, 0) / last2BP.length),
  } : null

  // Pulse: prefer today's DB entry, then wearable, then most recent DB
  const todayPulseFromDb = readings.find(r => r.pulse !== null && new Date(r.recorded_at) >= startOfToday)?.pulse ?? null
  const latestPulseFromDb = readings.find(r => r.pulse !== null)?.pulse ?? null
  const displayPulse = todayPulseFromDb ?? (hcEnabled && todayHeartRate !== null ? todayHeartRate : null) ?? latestPulseFromDb

  // Glucose: prefer today, fall back to most recent
  const todayGlucose = readings.find(r => r.glucose_mmol !== null && new Date(r.recorded_at) >= startOfToday)?.glucose_mmol ?? null
  const latestGlucose = readings.find(r => r.glucose_mmol !== null)?.glucose_mmol ?? null
  const displayGlucose = todayGlucose ?? latestGlucose

  // Waist: most recent
  const latestWaist = readings.find(r => r.waist_cm !== null)?.waist_cm ?? null

  const latestPanel = panels.length > 0 ? panels[0]! : null

  // Recovery & Fitness
  const displayHRV = hcEnabled && todayHRV !== null ? todayHRV : (readings.find(r => r.hrv_ms !== null)?.hrv_ms ?? null)
  const displayDeepMin = hcEnabled && lastNightSleep !== null ? lastNightSleep.deepMin : (readings.find(r => r.sleep_deep_min !== null)?.sleep_deep_min ?? null)
  const displayRemMin = hcEnabled && lastNightSleep !== null ? lastNightSleep.remMin : (readings.find(r => r.sleep_rem_min !== null)?.sleep_rem_min ?? null)
  const displayVO2Max = hcEnabled && latestVO2Max !== null ? latestVO2Max : (readings.find(r => r.vo2_max !== null)?.vo2_max ?? null)
  const hasRecoveryData = displayHRV !== null || displayDeepMin !== null || displayRemMin !== null || displayVO2Max !== null

  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Today's dietary pressure card
  const todayDietReading = readings.find(r => {
    if (new Date(r.recorded_at) < startOfToday) return false
    return r.sugar_g != null || r.refined_starch_g != null || r.alcohol_units != null ||
      r.ultra_processed_score != null || r.fibre_g != null
  }) ?? null

  const todayPressure = todayDietReading ? pressureScore(todayDietReading) : null
  const pressureColor = todayPressure === null ? '#6b7280'
    : todayPressure < 25 ? '#29ab00'
    : todayPressure < 50 ? '#FFC20A'
    : todayPressure < 75 ? '#f97316'
    : '#DC2626'
  const pressureLabel = todayPressure === null ? null
    : todayPressure < 25 ? 'Low'
    : todayPressure < 50 ? 'Moderate'
    : todayPressure < 75 ? 'High'
    : 'Very High'
  const pressurePct = todayPressure !== null ? Math.min(100, Math.round(todayPressure)) : 0

  // 7-day average daily steps (from DB readings)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentStepReadings = readings.filter(r => r.steps !== null && new Date(r.recorded_at) >= sevenDaysAgo)
  const avgDailySteps = recentStepReadings.length > 0
    ? Math.round(recentStepReadings.reduce((sum, r) => sum + r.steps!, 0) / recentStepReadings.length)
    : (hcEnabled && todaySteps !== null ? todaySteps : 0)

  // Avg deep/REM from last 7 days DB readings (fallback from HC)
  const avgDeepSleepMin7 = recentStepReadings.filter(r => r.sleep_deep_min !== null).length > 0
    ? Math.round(recentStepReadings.filter(r => r.sleep_deep_min !== null).reduce((sum, r) => sum + r.sleep_deep_min!, 0) / recentStepReadings.filter(r => r.sleep_deep_min !== null).length)
    : (hcEnabled && lastNightSleep !== null ? lastNightSleep.deepMin : null)
  const avgRemSleepMin7 = recentStepReadings.filter(r => r.sleep_rem_min !== null).length > 0
    ? Math.round(recentStepReadings.filter(r => r.sleep_rem_min !== null).reduce((sum, r) => sum + r.sleep_rem_min!, 0) / recentStepReadings.filter(r => r.sleep_rem_min !== null).length)
    : (hcEnabled && lastNightSleep !== null ? lastNightSleep.remMin : null)

  // Chronological age from user metadata
  const dob = user?.user_metadata?.date_of_birth
  const chronologicalAge = dob ? differenceInYears(new Date(), new Date(dob)) : null

  const healthScoreResult = calculateHealthScore(latest, latestPanel, chronologicalAge)

  const displayName = prefs.name || user?.email?.split('@')[0] || 'there'
  const insights = generateInsights(readings)
  const topInsights = insights.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Here's your metabolic health overview.</p>
        </div>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {format(new Date(), 'EEE, dd MMM yyyy')}
        </span>
      </div>

      {readings.length === 0 ? (
        <div className="card py-10 px-6">
          <h2 className="text-lg font-bold text-gray-100 text-center mb-3">Welcome to BioMetRx</h2>
          <p className="text-sm text-brand-green font-semibold text-center mb-4">Track the markers that matter.</p>
          <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>BioMetRx combines blood pressure, weight, blood tests, medication, and lifestyle data to help you understand your metabolic health over time.</p>
            <p>See trends, uncover correlations, calculate your BioMetRx Age, and monitor the factors linked to metabolic health, healthy ageing, and disease prevention.</p>
          </div>
          {prefs.name || prefs.date_of_birth ? (
            <button onClick={() => navigate('/add')} className="btn-primary w-full mt-6">
              Begin tracking your health
            </button>
          ) : (
            <button onClick={() => navigate('/profile')} className="btn-primary w-full mt-6">
              Start by completing your profile
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Hero row — BP, Pulse, Weight, Glucose */}
          <div className="grid grid-cols-4 gap-2">
            <HeroStatCard
              label="Blood Pressure"
              value={todayBP ? `${todayBP.systolic}/${todayBP.diastolic}` : null}
              icon={HeartPulse}
              accent={todayBP && todayBP.systolic > 140 ? 'warning' : 'green'}
            />
            <HeroStatCard
              label="Pulse"
              value={displayPulse}
              icon={Activity}
              accent="default"
            />
            <HeroStatCard
              label="Weight"
              value={latest?.weight_kg ? formatWeight(Number(latest.weight_kg)) : null}
              unit={weightUnit}
              icon={Weight}
              accent="default"
            />
            <HeroStatCard
              label="Glucose"
              value={displayGlucose != null ? Number(displayGlucose).toFixed(1) : null}
              unit="mmol/L"
              icon={Droplets}
              accent={displayGlucose != null && Number(displayGlucose) > 7 ? 'warning' : 'default'}
            />
          </div>

          {/* Second row — BP averages, pulse pressure, MAP */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="7-Day Avg"
              value={avg7 ? `${avg7.systolic}/${avg7.diastolic}` : null}
              accent={avg7 && avg7.systolic > 140 ? 'warning' : 'default'}
            />
            <StatCard
              label="30-Day Avg"
              value={avg30 ? `${avg30.systolic}/${avg30.diastolic}` : null}
              accent={avg30 && avg30.systolic > 140 ? 'warning' : 'default'}
            />
            <StatCard
              label="Pulse Pressure"
              value={latest?.pulse_pressure ?? null}
              accent={latest?.pulse_pressure && latest.pulse_pressure > 60 ? 'warning' : 'default'}
            />
            <StatCard
              label="Cardio Load"
              value={latest?.map ? Number(latest.map).toFixed(0) : null}
              accent={latest?.map && Number(latest.map) > 100 ? 'warning' : 'default'}
            />
          </div>

          {/* Third row — weight change, waist, mounjaro, steps */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="Weight Δ 30d"
              value={weightChange !== null ? `${weightChange > 0 ? '+' : ''}${formatWeight(weightChange)}` : null}
              unit={weightUnit}
              trend={weightChange !== null ? (weightChange < 0 ? 'down' : weightChange > 0 ? 'up' : 'flat') : null}
              accent={weightChange !== null && weightChange < 0 ? 'green' : 'default'}
            />
            <StatCard
              label="Waist"
              value={latestWaist != null ? Number(latestWaist).toFixed(1) : null}
              unit="cm"
              accent={latestWaist != null && Number(latestWaist) > 94 ? 'warning' : 'default'}
            />
            <StatCard
              label="Mounjaro"
              value={latestMounjaroDose != null ? Number(latestMounjaroDose).toFixed(1) : null}
              unit="mg"
              subtitle={latestMounjaroDose != null ? 'Last dose' : undefined}
            />
            <StatCard
              label="Steps"
              value={latestSteps !== null && latestSteps !== undefined ? latestSteps.toLocaleString() : null}
              subtitle={hcEnabled && todaySteps !== null ? 'Today · live' : 'Latest'}
            />
          </div>

          {/* Recovery & Fitness — HC-sourced or DB fallback */}
          {hasRecoveryData && (
            <div className="grid grid-cols-4 gap-2">
              <StatCard
                label="HRV"
                value={displayHRV !== null ? Math.round(Number(displayHRV)) : null}
                unit="ms"
                subtitle={hcEnabled && todayHRV !== null ? 'Today · live' : undefined}
                accent={displayHRV !== null && Number(displayHRV) < 30 ? 'warning' : 'default'}
              />
              <StatCard
                label="Deep Sleep"
                value={displayDeepMin !== null ? fmtMin(Number(displayDeepMin)) : null}
                subtitle={hcEnabled && lastNightSleep !== null ? 'Last night' : undefined}
              />
              <StatCard
                label="REM Sleep"
                value={displayRemMin !== null ? fmtMin(Number(displayRemMin)) : null}
                subtitle={hcEnabled && lastNightSleep !== null ? 'Last night' : undefined}
              />
              <StatCard
                label="VO₂ Max"
                value={displayVO2Max !== null ? Number(displayVO2Max).toFixed(1) : null}
                unit="ml/kg"
                subtitle={hcEnabled && latestVO2Max !== null ? 'Latest' : undefined}
              />
            </div>
          )}

          {/* BioMetRx Age */}
          <BiometrxAgeCard result={healthScoreResult} chronologicalAge={chronologicalAge} />

          {/* Metabolic Pressure & Resilience — collapsible section */}
          <div className="rounded-2xl border border-[#1e3029] overflow-hidden">
            <button
              type="button"
              onClick={() => setPrOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#0f1a15] hover:bg-[#1a2820] transition-colors"
            >
              <span className="text-sm font-semibold text-gray-300">Metabolic Pressure &amp; Resilience</span>
              <ChevronDown
                className="w-4 h-4 text-gray-500 transition-transform duration-200"
                style={{ transform: prOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {prOpen && (
              <div className="px-3 pb-3 pt-2 space-y-3 bg-[#0a100a]">
                {/* Today's Metabolic Pressure */}
                {todayDietReading && todayPressure !== null && (
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-200">Today's Metabolic Pressure</h3>
                        <p className="text-[10px] text-gray-500">Diet quality signal for today</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: pressureColor, backgroundColor: pressureColor + '22' }}>
                        {pressureLabel}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Low pressure</span>
                        <span>High pressure</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1e3029] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pressurePct}%`, backgroundColor: pressureColor }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-center">
                      {[
                        { label: 'Sugar', value: todayDietReading.sugar_g, unit: 'g', bad: true },
                        { label: 'Starch', value: todayDietReading.refined_starch_g, unit: 'g', bad: true },
                        { label: 'Alcohol', value: todayDietReading.alcohol_units, unit: 'u', bad: true },
                        { label: 'UPF', value: todayDietReading.ultra_processed_score !== null
                          ? UPF_LABELS[todayDietReading.ultra_processed_score!] ?? null
                          : null, unit: '', bad: true },
                        { label: 'Fibre ✓', value: todayDietReading.fibre_g, unit: 'g', bad: false },
                      ].map(({ label, value, unit, bad }) => value !== null ? (
                        <div key={label} className="bg-[#0f1d17] rounded-lg py-2 px-1">
                          <p className="text-xs font-bold" style={{ color: bad ? '#f59e0b' : '#29ab00' }}>
                            {typeof value === 'number' ? `${value}${unit}` : value}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* Metabolic Resilience */}
                <MetabolicResilienceCard
                  recentWorkouts={recentWorkouts}
                  avgDailySteps={avgDailySteps}
                  latestHRV={displayHRV !== null ? Number(displayHRV) : null}
                  avgDeepSleepMin={avgDeepSleepMin7}
                  avgRemSleepMin={avgRemSleepMin7}
                  latestVO2Max={displayVO2Max !== null ? Number(displayVO2Max) : null}
                  pressureScore={todayPressure}
                />
              </div>
            )}
          </div>

          {/* Charts */}
          <BPChart readings={readings} dataKey="bp" />
          <WeightChart readings={readings} />

          {/* Insights */}
          {topInsights.length > 0 && (
            <div
              onDoubleClick={() => navigate('/insights')}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">Insights</h3>
                <span className="text-[10px] text-gray-500">Double-tap for all</span>
              </div>
              <div className="space-y-2">
                {topInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
