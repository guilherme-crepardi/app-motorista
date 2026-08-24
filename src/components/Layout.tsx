import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Wallet, Receipt, Target, LogOut, Car, Sun, Moon, CalendarDays, CalendarRange, Wrench, Repeat, Menu, X, History } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { useAuth } from '../contexts/AuthContext'
import { syncHistorico } from '../lib/historico'
import { syncHistoricoGastos } from '../lib/historicoGastos'
import { fetchTema, salvarTema } from '../lib/preferencias'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/semana', label: 'Semana', icon: CalendarDays },
  { to: '/mes', label: 'Mês', icon: CalendarRange },
  { to: '/ganhos', label: 'Ganhos', icon: Wallet },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/despesas-fixas', label: 'Despesas Fixas', icon: Repeat },
  { to: '/manutencoes', label: 'Manutenções', icon: Wrench },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/historico', label: 'Histórico', icon: History },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
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
        <button type="button" className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
          <Menu size={24} />
        </button>
        <div className="brand">
          <span className="brand-icon">
            <Car size={20} />
          </span>
          <div className="brand-text">
            <strong>Planejamento</strong>
            <span>Motorista</span>
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
              <strong>Planejamento</strong>
              <span>Motorista</span>
            </div>
          </div>
          <button type="button" className="menu-btn menu-btn-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>
        <nav className="nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn btn-ghost btn-logout" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'light' ? 'Escuro' : 'Claro'}</span>
          </button>
          <button type="button" className="btn btn-ghost btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
