import { Link } from 'react-router-dom'
import {
  Activity,
  HeartPulse,
  TestTubes,
  Weight,
  BarChart3,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

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

const steps = [
  { n: '1', title: 'Create your account', body: 'Sign up free and set your profile — date of birth, units and preferences.' },
  { n: '2', title: 'Log your numbers', body: 'Add blood pressure, weight, bloods and lifestyle data in seconds, or sync steps from Health Connect.' },
  { n: '3', title: 'Watch your age drop', body: 'See your BiometRx Age, the factors holding it back, and how many years you could recover.' },
]

export default function Landing() {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#0b1210] text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0b1210]/80 border-b border-[#1e3029]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/BioMetrxLogo.png" alt="BioMetRx" className="h-8" />
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-300 hover:text-white font-medium px-3 py-2">
              Sign in
            </Link>
            <Link to="/login?signup=1" className="btn-primary !py-2 !px-4 text-sm">
              Start Free
            </Link>
          </div>
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
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
              See what <span className="text-brand-green">your</span> metabolism is trying to tell you.
            </h1>
            <p className="mt-5 text-lg text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
              BioMetRx brings your blood pressure, weight, glucose, medication, activity and lab
              markers into one personal health dashboard — so you can understand the trend behind
              the numbers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/login?signup=1" className="btn-primary inline-flex items-center justify-center gap-2">
                Start Tracking Your Health
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary inline-flex items-center justify-center !py-3 !px-6">
                See the Dashboard
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-gray-500 justify-center lg:justify-start">
              <ShieldCheck className="w-4 h-4 text-brand-green" />
              Understand the numbers beneath the scale.
            </p>
          </div>

          {/* Right: product shot */}
          <div className="relative">
            <img
              src="/heroImage.png"
              alt="BioMetRx dashboard on laptop and phone"
              className="w-full h-auto"
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

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto px-5 py-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
        <p className="text-center text-gray-500 mb-10">Three steps to a clearer picture of your health.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map(({ n, title, body }) => (
            <div key={n} className="card">
              <div className="w-8 h-8 rounded-full bg-brand-green text-white font-bold flex items-center justify-center mb-3">
                {n}
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
          <h2 className="text-2xl font-bold mb-2">Start lowering your BiometRx Age today</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Free to use. Set up your profile and log your first reading in under two minutes.
          </p>
          <Link to="/login?signup=1" className="btn-primary inline-flex items-center justify-center gap-2">
            Create your account
            <ChevronRight className="w-4 h-4" />
          </Link>
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
    </div>
  )
}
