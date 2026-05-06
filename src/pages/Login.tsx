import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { api, setToken } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? api.login : api.register
      const { token } = await fn(email, password)
      setToken(token)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <FlaskConical size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>TDAH Science</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Veille scientifique personnelle
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--accent-danger)', padding: '8px 10px',
                background: '#33181820', borderRadius: 6 }}>{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>Pas encore de compte ?{' '}
                <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none',
                  color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>Créer un compte</button></>
            ) : (
              <>Déjà un compte ?{' '}
                <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none',
                  color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>Se connecter</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
