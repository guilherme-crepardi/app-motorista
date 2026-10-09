import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { CalendarDays, Gauge, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CATEGORIAS } from '../lib/constants'
import {
  formatCurrency,
  startOfDay,
  startOfWeek,
  startOfMonth,
  lastNDays,
  toISODate,
  formatLongDate,
  clampPercent,
  sum,
} from '../lib/utils'
import type { Ganho, Gasto, Manutencao, Meta, TipoMeta } from '../types'
import { useDespesasFixas, totalFixoPorCategoria, totalFixo, fixoDiario } from '../lib/despesasFixas'
import { useLanguage } from '../contexts/LanguageContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const fixas = useDespesasFixas()
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const yearStartISO = `${new Date().getFullYear()}-01-01`

    Promise.all([
      supabase.from('ganhos').select('*').eq('user_id', user.id).gte('data', yearStartISO).order('data'),
      supabase.from('gastos').select('*').eq('user_id', user.id).gte('data', yearStartISO).order('data'),
      supabase.from('manutencoes').select('*').eq('user_id', user.id).gte('data', yearStartISO).order('data'),
      supabase.from('metas').select('*').eq('user_id', user.id),
    ]).then(([g, d, m, mt]) => {
      if (!g.error) setGanhos(g.data ?? [])
      if (!d.error) setGastos(d.data ?? [])
      if (!m.error) setManutencoes(m.data ?? [])
      if (!mt.error) setMetas(mt.data ?? [])
      setLoading(false)
    })
  }, [user])

  const today = startOfDay(new Date())
  const weekStart = startOfWeek(new Date())
  const monthStart = startOfMonth(new Date())
  const todayISOStr = toISODate(today)
  const monthISO = toISODate(monthStart).slice(0, 7)
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const fixoMesPorCategoria = totalFixoPorCategoria(fixas, `${monthISO}-01`, toISODate(lastDay))
  const fixoHoje = fixoDiario(fixas)

  const yearStart = `${new Date().getFullYear()}-01-01`

  const totals = useMemo(() => {
    const from = (iso: string) => (x: { data: string }) => x.data >= iso
    const ganhosHoje = ganhos.filter((g) => g.data === todayISOStr)
    const gastosHoje = gastos.filter((g) => g.data === todayISOStr)
    const yearEnd = `${new Date().getFullYear()}-12-31`
    return {
      ganhosHoje: sum(ganhosHoje.map((g) => Number(g.valor))),
      gastosHoje: sum(gastosHoje.map((g) => Number(g.valor))) + fixoHoje,
      ganhosSemana: sum(ganhos.filter(from(toISODate(weekStart))).map((g) => Number(g.valor))),
      ganhosMes: sum(ganhos.filter(from(toISODate(monthStart))).map((g) => Number(g.valor))),
      ganhosAno: sum(ganhos.filter(from(yearStart)).map((g) => Number(g.valor))),
      kmMes: sum(ganhos.filter(from(toISODate(monthStart))).map((g) => Number(g.km ?? 0))),
      gastosMes:
        sum(gastos.filter(from(toISODate(monthStart))).map((g) => Number(g.valor))) +
        Object.values(fixoMesPorCategoria).reduce((acc, v) => acc + (v ?? 0), 0),
      gastosAno:
        sum(gastos.filter(from(yearStart)).map((g) => Number(g.valor))) +
        sum(manutencoes.filter(from(yearStart)).map((g) => Number(g.valor))) +
        totalFixo(fixas, yearStart, yearEnd),
    }
  }, [ganhos, gastos, manutencoes, todayISOStr, weekStart, monthStart, fixoMesPorCategoria, fixoHoje, yearStart, fixas])

  const chartData = useMemo(
    () =>
      lastNDays(7).map((d) => {
        const iso = toISODate(d)
        return {
          name: iso.slice(5),
          Ganhos: sum(ganhos.filter((g) => g.data === iso).map((g) => Number(g.valor))),
          Gastos: sum(gastos.filter((g) => g.data === iso).map((g) => Number(g.valor))) + fixoDiario(fixas),
        }
      }),
    [ganhos, gastos, fixas],
  )

  const pieData = useMemo(
    () =>
      CATEGORIAS.map(({ value, label }) => ({
        name: label,
        value:
          sum(gastos.filter((g) => g.categoria === value).map((g) => Number(g.valor))) +
          (fixoMesPorCategoria[value] ?? 0),
      })).filter((d) => d.value > 0),
    [gastos, fixoMesPorCategoria],
  )

  const metaValue = (tipo: TipoMeta): number => metas.find((m) => m.tipo === tipo)?.valor ?? 0

  const metaProgress = (ganhosPeriodo: number, valor: number): number | null => {
    if (!valor || valor <= 0) return null
    return Math.round(clampPercent((ganhosPeriodo / valor) * 100))
  }

  const saldoHoje = totals.ganhosHoje - totals.gastosHoje
  const saldoMes = totals.ganhosMes - totals.gastosMes

  const metasCards = [
    { tipo: 'diaria' as TipoMeta, label: t('dailyGoal'), valor: totals.ganhosHoje },
    { tipo: 'semanal' as TipoMeta, label: t('weeklyGoal'), valor: totals.ganhosSemana },
    { tipo: 'mensal' as TipoMeta, label: t('monthlyGoal'), valor: totals.ganhosMes },
  ]

  if (loading) return <div className="page-loading">{t('loading')}</div>

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('home')}</h1>
          <p className="page-subtitle">{formatLongDate(today)}</p>
        </div>
      </header>

      <section className="dashboard-hero card">
        <div>
          <span className="dashboard-eyebrow">{t('todayResult')}</span>
          <strong className={saldoHoje < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(saldoHoje)}</strong>
        </div>
        <div className="dashboard-hero-grid">
          <span>
            <small>{t('received')}</small>
            <strong className="text-success">{formatCurrency(totals.ganhosHoje)}</strong>
          </span>
          <span>
            <small>{t('spent')}</small>
            <strong className="text-danger">{formatCurrency(totals.gastosHoje)}</strong>
          </span>
        </div>
      </section>

      <section className="dashboard-quick-grid">
        <div className="card dashboard-mini-card">
          <CalendarDays size={18} />
          <div>
            <span>{t('week')}</span>
            <strong>{formatCurrency(totals.ganhosSemana)}</strong>
            <small>{t('earningsReceived')}</small>
          </div>
        </div>
        <div className="card dashboard-mini-card">
          <Wallet size={18} />
          <div>
            <span>{t('month')}</span>
            <strong>{formatCurrency(totals.ganhosMes)}</strong>
            <small>{totals.kmMes} {t('kmDriven')}</small>
          </div>
        </div>
      </section>

      <section className="card dashboard-month-card">
        <div className="dashboard-month-head">
          <div>
            <span className="dashboard-eyebrow">{t('monthSummary')}</span>
            <strong className={saldoMes < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(saldoMes)}</strong>
          </div>
          <Gauge size={22} />
        </div>
        <div className="dashboard-month-list">
          <span>
            <small>{t('earnings')}</small>
            <strong>{formatCurrency(totals.ganhosMes)}</strong>
          </span>
          <span>
            <small>{t('expenses')}</small>
            <strong>{formatCurrency(totals.gastosMes)}</strong>
          </span>
          <span>
            <small>{t('year')}</small>
            <strong>{formatCurrency(totals.ganhosAno - totals.gastosAno)}</strong>
          </span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('goals')}</h2>
        <div className="metas-grid">
          {metasCards.map(({ tipo, label, valor }) => {
            const metaValor = metaValue(tipo)
            const progress = metaProgress(valor, metaValor)
            return (
              <div className="card meta-card" key={tipo}>
                <div className="meta-card-top">
                  <span>{label}</span>
                  <strong>{metaValor ? formatCurrency(metaValor) : t('noGoalSet')}</strong>
                </div>
                <div className="meta-card-value">
                  <span>{formatCurrency(valor)}</span>
                  <span>{t('earned')}</span>
                </div>
                {progress !== null ? (
                  <>
                    <div className="progress">
                      <div
                        className={`progress-bar${progress >= 100 ? ' complete' : ''}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="meta-card-sub">{progress}% {t('goalPercent')}</p>
                  </>
                ) : (
                  <p className="meta-card-sub">{t('setGoalInGoals')}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="charts-grid">
        <div className="card chart-card">
          <h2 className="section-title">{t('last7Days')}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Ganhos" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2 className="section-title">{t('monthExpensesByCategory')}</h2>
          {pieData.length === 0 ? (
            <p className="empty-state">{t('noExpensesThisMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry) => {
                    const categoria = CATEGORIAS.find((c) => c.label === entry.name)
                    return <Cell key={entry.name} fill={categoria?.color ?? '#64748b'} />
                  })}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend formatter={(name) => <span className="legend-label">{name}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="card saldo-card">
        <div className="saldo-card-label">
          <span>{t('monthResult')} ({t('earningsMinusExpenses')})</span>
        </div>
        <p className={`stat-value ${saldoMes < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(saldoMes)}</p>
      </section>
    </div>
  )
}
