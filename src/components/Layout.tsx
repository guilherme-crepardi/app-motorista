import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Wallet, Receipt, Target, LogOut, Car, Sun, Moon, CalendarDays, CalendarRange, Wrench, Repeat, Menu, X, History, Globe2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { useAuth } from '../contexts/AuthContext'
import { syncHistorico } from '../lib/historico'
import { syncHistoricoGastos } from '../lib/historicoGastos'
import { fetchTema, salvarTema } from '../lib/preferencias'
import { useLanguage, type Language } from '../contexts/LanguageContext'

const navItems = [
  { to: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/metas', labelKey: 'goals', icon: Target },
  { to: '/ganhos', labelKey: 'earnings', icon: Wallet },
  { to: '/gastos', labelKey: 'expenses', icon: Receipt },
  { to: '/despesas-fixas', labelKey: 'fixedExpenses', icon: Repeat },
  { to: '/semana', labelKey: 'week', icon: CalendarDays },
  { to: '/mes', labelKey: 'month', icon: CalendarRange },
  { to: '/manutencoes', labelKey: 'maintenance', icon: Wrench },
  { to: '/historico', labelKey: 'history', icon: History },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const userTouchedTheme = useRef(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (user) {
      syncHistorico(user.id)
      syncHistoricoGastos(user.id)
      fetchTema(user.id).then((tema) => {
        if (tema && !userTouchedTheme.current) setTheme(tema)
      })
    }
  }, [user])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function toggleTheme() {
    userTouchedTheme.current = true
    setTheme((t) => {
      const novo = t === 'light' ? 'dark' : 'light'
      if (user) salvarTema(user.id, novo)
      return novo
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button type="button" className="menu-btn" onClick={() => setMenuOpen(true)} aria-label={t('openMenu')}>
          <Menu size={24} />
        </button>
        <div className="brand">
          <span className="brand-icon">
            <Car size={20} />
          </span>
          <div className="brand-text">
            <strong>{t('appShort')}</strong>
            <span>{t('driver')}</span>
          </div>
        </div>
      </header>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-icon">
              <Car size={20} />
            </span>
            <div className="brand-text">
              <strong>{t('appShort')}</strong>
              <span>{t('driver')}</span>
            </div>
          </div>
          <button type="button" className="menu-btn menu-btn-close" onClick={() => setMenuOpen(false)} aria-label={t('closeMenu')}>
            <X size={22} />
          </button>
        </div>
        <nav className="nav">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <label className="sidebar-language">
            <Globe2 size={18} />
            <span>{t('language')}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option value="pt">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-logout" onClick={toggleTheme} aria-label={t('toggleTheme')}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'light' ? t('dark') : t('light')}</span>
          </button>
          <button type="button" className="btn btn-ghost btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>{t('logout')}</span>
          </button>
          <NavLink to="/privacidade" className="btn btn-ghost btn-logout">
            <ShieldCheck size={18} />
            <span>Privacidade</span>
          </NavLink>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
