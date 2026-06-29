import { useState } from 'react'

// OAuth consent page for the BioMetRx MCP connection.
// Reached when Claude (or any MCP client) starts the PKCE flow — the edge
// function's GET /oauth/authorize redirects here, forwarding the OAuth params.
// The user pastes their personal MCP key (bx_…); we POST it to the MCP server,
// which returns the redirect_url back to the client with an authorization code.
// The key never leaves the browser except to the MCP server over HTTPS.

const MCP_BASE = (import.meta.env.VITE_BIOMETRX_MCP_URL ?? '').replace(/\/$/, '')

export default function OAuthAuthorize() {
  const params = new URLSearchParams(window.location.search)
  const redirectUri = params.get('redirect_uri') ?? ''
  const state = params.get('state') ?? ''
  const codeChallenge = params.get('code_challenge') ?? ''
  const challengeMethod = params.get('code_challenge_method') ?? 'S256'
  const clientId = params.get('client_id') ?? ''

  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmed = key.trim()
    if (!trimmed.startsWith('bx_')) {
      setError('Keys start with bx_')
      return
    }
    if (!redirectUri || !codeChallenge) {
      setError('Missing OAuth parameters — start the connection again from Claude.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${MCP_BASE}/oauth/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcp_key: trimmed,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: challengeMethod,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error_description || json.error || 'Connection failed')
        setLoading(false)
        return
      }
      window.location.href = json.redirect_url
    } catch {
      setError('Network error — check your connection and try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 text-surface-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-700 bg-surface-900 p-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-brand-green flex items-center justify-center text-surface-950 font-bold text-sm">
            B
          </div>
          <span className="text-lg font-bold text-white tracking-tight">BioMetRx</span>
        </div>
        <p className="text-sm text-surface-200/60 mb-7 leading-relaxed">
          Connect this application to your BioMetRx health data. Paste your personal
          MCP key to authorise access.
        </p>

        {clientId && (
          <div className="text-xs text-surface-200/70 mb-5 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700">
            Connecting: <strong className="text-surface-100">{clientId}</strong>
          </div>
        )}

        <form onSubmit={connect}>
          <label className="block text-xs font-medium uppercase tracking-wide text-surface-200/50 mb-2">
            MCP Key
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="bx_••••••••••••••••••••••••"
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3.5 py-3 rounded-lg bg-surface-950 border border-surface-700 text-white font-mono text-sm tracking-wide outline-none focus:border-brand-green transition-colors"
          />
          {error && <p className="text-sm text-severe mt-2.5">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 py-3 rounded-lg bg-brand-green hover:bg-brand-green-dark disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <p className="text-xs text-surface-200/30 mt-6 text-center">
          Your key is sent only to the BioMetRx MCP server over HTTPS.
        </p>
      </div>
    </div>
  )
}
