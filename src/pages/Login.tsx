import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, Eye, EyeOff, Globe2, Moon, ShieldCheck, Sun } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { useLanguage, type Language } from '../contexts/LanguageContext'

type AuthMode = 'login' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [mode, setMode] = useState<AuthMode>('login')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function changeLanguage(next: Language) {
    setLanguage(next)
    setError('')
    setInfo('')
  }

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
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
        setInfo(t('signupSent'))
        setMode('login')
      } else {
        const { data, error: signinError } = await supabase.auth.signInWithPassword({ email, password })
        if (signinError) throw signinError
        if (data.user) navigate('/ganhos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError(t('emailPlaceholder'))
      return
    }
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (resetError) throw resetError
      setInfo(t('resetSent'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-logo-row">
            <span className="brand-icon">
              <Car size={24} />
            </span>
            <div>
              <strong>{t('appName')}</strong>
              <span>Motorista app</span>
            </div>
          </div>
          <div>
            <h1>{t('loginTitle')}</h1>
            <p>{t('loginSubtitle')}</p>
          </div>
          <div className="auth-benefits">
            <span>
              <ShieldCheck size={18} />
              {t('protectedData')}
            </span>
            <span>
              <Car size={18} />
              {t('quickAccess')}
            </span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tools" aria-label="Preferências">
            <button type="button" className="btn btn-secondary auth-tool-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              {theme === 'light' ? t('dark') : t('light')}
            </button>
            <label className="auth-language">
              <Globe2 size={17} />
              <span>{t('language')}</span>
              <select className="select" value={language} onChange={(e) => changeLanguage(e.target.value as Language)}>
                <option value="pt">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </label>
          </div>

          {!isSupabaseConfigured ? (
            <div className="alert alert-info">
              <strong>{t('setupRequired')}</strong>
              <p>{t('setupText')}</p>
            </div>
          ) : (
            <>
              <div className="auth-brand">
                <h2>{mode === 'login' ? t('login') : t('signup')}</h2>
                <p>{t('loginSubtitle')}</p>
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
                  {t('login')}
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
                  {t('signup')}
                </button>
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {info && <div className="alert alert-info">{info}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">{t('email')}</label>
                  <input
                    id="email"
                    className="input input-large"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">{t('password')}</label>
                  <div className="password-field">
                    <input
                      id="password"
                      className="input input-large"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder')}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="icon-btn password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-large" disabled={loading}>
                  {loading ? t('wait') : mode === 'login' ? t('loginSubmit') : t('signupSubmit')}
                </button>
              </form>

              {mode === 'login' && (
                <button type="button" className="auth-link" onClick={handleResetPassword} disabled={loading}>
                  {t('forgotPassword')}
                </button>
              )}

              <Link className="auth-privacy-link" to="/privacidade">
                Politica de privacidade
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
