import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  HeartPulse,
  TestTubes,
  Weight,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Scale,
  TrendingUp,
  Flame,
  Shield,
  Fingerprint,
  Target,
  Pill,
  Droplet,
  RefreshCw,
  BellRing,
  X,
  Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const features = [
  {
    icon: Activity,
    title: 'BiometRx Age',
    body: 'A single weighted health score (0–100) built from your blood pressure, HbA1c, lipids, insulin, kidney, liver and hormone markers — converted into a real biological age and your max potential age.',
  },
  {
    icon: HeartPulse,
    title: 'Blood Pressure',
    body: 'Log with the guided three-reading flow that averages readings two and three, then track MAP, pulse pressure and your 7- and 30-day trends.',
  },
  {
    icon: TestTubes,
    title: 'Blood Panels',
    body: 'Record full lab panels — metabolic, lipids, liver, kidney, inflammation and hormones — and watch every marker move over time.',
  },
  {
    icon: Weight,
    title: 'Weight Drivers',
    body: 'Indexed charts tie weight to the things that move it: nutrition, alcohol, sleep, steps and medication, all on one baseline.',
  },
  {
    icon: BarChart3,
    title: 'Insights',
    body: 'Plain-language signals from your own data — improving trends, sleep affecting BP, elevated cardiovascular load — surfaced automatically.',
  },
  {
    icon: Sparkles,
    title: 'Log with AI',
    body: 'Connect BioMetRx to Claude and just say what you ate. Calories and macros are estimated and added to your day — hands-free, on the go.',
  },
]

const pattern = [
  {
    icon: Scale,
    title: 'Weight is only one signal',
    body: "Weight can change for many reasons. BioMetRx shows you what's driving it.",
  },
  {
    icon: HeartPulse,
    title: 'Blood pressure matters',
    body: "It's one of the strongest indicators of long-term health and risk.",
  },
  {
    icon: TrendingUp,
    title: 'Trends beat snapshots',
    body: 'Daily and 30-day trends reveal progress that single readings never will.',
  },
]

const pillars = [
  {
    icon: Flame,
    title: 'Fuel',
    body: 'Understand how your body is handling glucose, weight, and medication.',
  },
  {
    icon: HeartPulse,
    title: 'Pressure',
    body: 'Track blood pressure and cardiovascular load to reduce long-term risk.',
  },
  {
    icon: Shield,
    title: 'Resilience',
    body: 'Improve your BioMetRx Age and increase the years you can live well.',
  },
]

const dashboard = [
  {
    icon: HeartPulse,
    title: 'Blood Pressure Trends',
    body: '7-day and 30-day averages, pulse pressure, and cardiovascular load.',
  },
  {
    icon: Fingerprint,
    title: 'BioMetRx Age',
    body: 'A composite score that reflects your metabolic health age.',
  },
  {
    icon: Target,
    title: 'Max Potential Age',
    body: 'See how many years are recoverable with better habits.',
  },
  {
    icon: Pill,
    title: 'Medication Tracking',
    body: 'Track GLP-1s and other medications with dosage and last dose.',
  },
  {
    icon: Droplet,
    title: 'Glucose & Labs',
    body: 'Log glucose and lab markers to see the full metabolic picture.',
  },
  {
    icon: RefreshCw,
    title: 'Health Connect Ready',
    body: 'Syncs with Apple Health and Google Health Connect.',
  },
]

export default function Landing() {
  const year = new Date().getFullYear()
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#121919] text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#121919]/80 border-b border-[#1e3029]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/BioMetrxLogo.png" alt="BioMetRx" className="h-8" />
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How It Works</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(50% 60% at 70% 30%, rgba(41,171,0,0.16) 0%, rgba(11,18,16,0) 70%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-16 grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-green">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              Launching Soon
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
              See what <span className="text-brand-green">your</span> metabolism is trying to tell you.
            </h1>
            <p className="mt-5 text-lg text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
              BioMetRx brings your blood pressure, weight, glucose, medication, activity and lab
              markers into one personal health dashboard — so you can understand the trend behind
              the numbers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                type="button"
                onClick={() => setWaitlistOpen(true)}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                Be notified when it goes live
              </button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-white justify-center lg:justify-start">
              <ShieldCheck className="w-4 h-4 text-brand-green" />
              Understand the numbers beneath the scale.
            </p>
          </div>

          {/* Right: product shot */}
          <div className="relative">
            <img
              src="/heroImage.png"
              alt="BioMetRx dashboard on laptop and phone"
              className="w-full h-auto lg:scale-125 origin-center"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-12 scroll-mt-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card hover:border-brand-green/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-green" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — tracks the pattern */}
      <section id="how" className="max-w-6xl mx-auto px-5 py-14 scroll-mt-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
          Most health apps track fragments.{' '}
          <span className="text-brand-green">BioMetRx tracks the pattern.</span>
        </h2>
        <p className="mt-3 text-center text-gray-400 max-w-2xl mx-auto leading-relaxed">
          The scale, your watch, and your blood pressure monitor each tell part of the story.
          BioMetRx connects the dots so you can understand what's really changing.
        </p>
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {pattern.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card hover:border-brand-green/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-green" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for metabolic health */}
      <section className="border-y border-[#1e3029] bg-[#0e1514]">
        <div className="max-w-6xl mx-auto px-5 py-14 grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
              Built for <span className="text-brand-green">metabolic health,</span>
              <br />
              not vanity metrics.
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed max-w-md">
              BioMetRx is designed around metabolic resilience and deeper signals — not just
              calories, steps, or appearance. We focus on the markers that drive long-term outcomes.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {pillars.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-brand-green" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One dashboard */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 tracking-tight">
          One dashboard. The numbers that matter.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card hover:border-brand-green/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-green" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        <div className="card text-center border-brand-green/30 bg-gradient-to-b from-brand-green/10 to-[#131f1b] p-8">
          <h2 className="text-2xl font-bold mb-2">Be first through the door</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            BioMetRx is launching soon. Join the list and we'll let you know the moment it's live.
          </p>
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <BellRing className="w-4 h-4" />
            Notify me at launch
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e3029] mt-8">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/BioMetrxLogo.png" alt="BioMetRx" className="h-6 opacity-80" />
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <a href="/privacypolicy.html" className="hover:text-gray-300">Privacy</a>
            <Link to="/login" className="hover:text-gray-300">Sign in</Link>
          </div>
          <p className="text-xs text-gray-600">© {year} BioMetRx</p>
        </div>
      </footer>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </div>
  )
}

function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setFirstName('')
    setEmail('')
    setStatus('idle')
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('saving')

    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ first_name: firstName.trim(), email: email.trim().toLowerCase() })

    if (insertError) {
      // 23505 = unique violation → email already on the list, treat as success
      if (insertError.code === '23505') {
        setStatus('done')
        return
      }
      setStatus('idle')
      setError('Something went wrong. Please try again.')
      return
    }

    setStatus('done')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="card relative w-full max-w-md p-6 border-brand-green/30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-brand-green/15 border border-brand-green/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-brand-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1.5">You're on the list!</h3>
            <p className="text-sm text-gray-400 mb-6">
              Thanks{firstName ? `, ${firstName.trim()}` : ''} — we'll email you the moment
              BioMetRx goes live.
            </p>
            <button type="button" onClick={close} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-4">
              <BellRing className="w-5 h-5 text-brand-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1.5">Be notified when it goes live</h3>
            <p className="text-sm text-gray-400 mb-5">
              Drop your details and we'll let you know the moment BioMetRx launches. No spam.
            </p>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className="input-field"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="input-field"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={status === 'saving'}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {status === 'saving' ? 'Adding you…' : 'Notify me at launch'}
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-white">
              We'll only use your email to tell you about the BioMetRx launch.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
