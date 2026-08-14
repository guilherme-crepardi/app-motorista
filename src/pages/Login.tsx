import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-icon">
              <Car size={22} />
            </span>
            <h1>Planejamento Motorista</h1>
          </div>
          <div className="alert alert-info">
            <strong>Configuração necessária</strong>
            <p>
              Crie um projeto gratuito no{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer">
                supabase.com
              </a>
              , rode o arquivo <code>supabase/schema.sql</code> no SQL Editor e preencha o arquivo{' '}
              <code>.env</code> com as credenciais do projeto.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error: signupError } = await supabase.auth.signUp({ email, password })
        if (signupError) throw signupError
        setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.')
        setMode('login')
      } else {
        const { data, error: signinError } = await supabase.auth.signInWithPassword({ email, password })
        if (signinError) throw signinError
        if (data.user) navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">
            <Car size={24} />
          </span>
          <h1>Planejamento Motorista</h1>
          <p>Controle seus ganhos, gastos e metas</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('login')
              setError('')
              setInfo('')
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('signup')
              setError('')
              setInfo('')
            }}
          >
            Criar conta
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-info">{info}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
