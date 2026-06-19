import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (isSignUp) {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSignUpSuccess(true)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0b1210]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/BioMetrxLogo.png" alt="BioMetRx" className="h-16 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mt-1">Your personal health dashboard</p>
        </div>

        {signUpSuccess ? (
          <div className="card text-center">
            <p className="text-brand-green font-semibold mb-2">Check your email</p>
            <p className="text-sm text-gray-500">
              We've sent you a confirmation link. Click it to activate your account, then log in.
            </p>
            <button
              onClick={() => { setIsSignUp(false); setSignUpSuccess(false) }}
              className="btn-primary mt-4 w-full"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="text-lg font-semibold text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <p className="text-sm text-center text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
                className="text-brand-green font-semibold hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
