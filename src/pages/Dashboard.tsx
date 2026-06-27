import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useReadings } from '../hooks/useReadings'
import { useBloodPanels } from '../hooks/useBloodPanels'
import StatCard, { HeroStatCard } from '../components/StatCard'
import BPChart from '../components/BPChart'
import WeightChart from '../components/WeightChart'
import InsightCard from '../components/InsightCard'
import BiometrxAgeCard from '../components/BiometrxAgeCard'
import { getAverageBP, getLatestReading, getWeightChange, generateInsights } from '../utils/calculations'
import { calculateHealthScore } from '../utils/healthScore'
import { usePreferences } from '../hooks/usePreferences'
import { useHealthConnect } from '../hooks/useHealthConnect'
import { HeartPulse, Activity, Weight, Gauge } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { readings, loading } = useReadings()
  const { panels, loading: panelsLoading } = useBloodPanels()
  const { prefs, formatWeight, weightUnit } = usePreferences()
  const { todaySteps, todayHeartRate, enabled: hcEnabled } = useHealthConnect()
  const navigate = useNavigate()

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

  // Pulse: prefer today's BP entry, then wearable heart rate, then most recent pulse in DB
  const todayPulseFromDb = readings.find(r => r.pulse !== null && new Date(r.recorded_at) >= startOfToday)?.pulse ?? null
  const latestPulseFromDb = readings.find(r => r.pulse !== null)?.pulse ?? null
  const displayPulse = todayPulseFromDb ?? (hcEnabled && todayHeartRate !== null ? todayHeartRate : null) ?? latestPulseFromDb
  const latestPanel = panels.length > 0 ? panels[0]! : null

  // Chronological age from user metadata (date_of_birth)
  const dob = user?.user_metadata?.date_of_birth
  const chronologicalAge = dob ? differenceInYears(new Date(), new Date(dob)) : null

  const healthScoreResult = calculateHealthScore(latest, latestPanel, chronologicalAge)

  const displayName = prefs.name
    || user?.email?.split('@')[0]
    || 'there'

  const insights = generateInsights(readings)
  // Show top 3 insights on dashboard
  const topInsights = insights.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Here's your health overview for today.</p>
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
            <button
              onClick={() => navigate('/add')}
              className="btn-primary w-full mt-6"
            >
              Begin tracking your health
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary w-full mt-6"
            >
              Start by completing your profile
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Hero row — 4 key metrics with icons */}
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
              label="Cardio Load"
              value={latest?.map ? Number(latest.map).toFixed(0) : null}
              icon={Gauge}
              accent={latest?.map && Number(latest.map) > 100 ? 'warning' : 'default'}
            />
          </div>

          {/* Second row — averages and key numbers */}
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
              label="Mounjaro Dose"
              value={latestMounjaroDose != null ? Number(latestMounjaroDose).toFixed(1) : null}
              unit="mg"
              subtitle={latestMounjaroDose != null ? 'Last recorded' : undefined}
            />
          </div>

          {/* Third row — weight change and steps */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Weight Change (30d)"
              value={weightChange !== null ? `${weightChange > 0 ? '+' : ''}${formatWeight(weightChange)}` : null}
              unit={weightUnit}
              trend={weightChange !== null ? (weightChange < 0 ? 'down' : weightChange > 0 ? 'up' : 'flat') : null}
              accent={weightChange !== null && weightChange < 0 ? 'green' : 'default'}
            />
            <StatCard
              label="Step Count"
              value={latestSteps !== null && latestSteps !== undefined ? latestSteps.toLocaleString() : null}
              unit="steps"
              subtitle={hcEnabled && todaySteps !== null ? 'Today · live' : 'Latest reading'}
            />
          </div>

          {/* BioMetRx Age */}
          <BiometrxAgeCard result={healthScoreResult} chronologicalAge={chronologicalAge} />

          {/* Charts */}
          <BPChart readings={readings} dataKey="bp" />
          <WeightChart readings={readings} />

          {/* Inline insights — double-tap to see all */}
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
