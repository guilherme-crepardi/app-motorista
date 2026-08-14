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
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react'
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
import type { Ganho, Gasto, Meta, TipoMeta } from '../types'
import { useDespesasFixas, totalFixoPorCategoria, fixoDiario } from '../lib/despesasFixas'

export default function Dashboard() {
  const { user } = useAuth()
  const fixas = useDespesasFixas()
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const from = new Date()
    from.setDate(from.getDate() - 29)
    const fromISO = toISODate(startOfDay(from))

    Promise.all([
      supabase.from('ganhos').select('*').eq('user_id', user.id).gte('data', fromISO).order('data'),
      supabase.from('gastos').select('*').eq('user_id', user.id).gte('data', fromISO).order('data'),
      supabase.from('metas').select('*').eq('user_id', user.id),
    ]).then(([g, d, m]) => {
      if (!g.error) setGanhos(g.data ?? [])
      if (!d.error) setGastos(d.data ?? [])
      if (!m.error) setMetas(m.data ?? [])
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

  const totals = useMemo(() => {
    const from = (iso: string) => (x: { data: string }) => x.data >= iso
    const ganhosHoje = ganhos.filter((g) => g.data === todayISOStr)
    const gastosHoje = gastos.filter((g) => g.data === todayISOStr)
    return {
      ganhosHoje: sum(ganhosHoje.map((g) => Number(g.valor))),
      gastosHoje: sum(gastosHoje.map((g) => Number(g.valor))) + fixoHoje,
      ganhosSemana: sum(ganhos.filter(from(toISODate(weekStart))).map((g) => Number(g.valor))),
      ganhosMes: sum(ganhos.filter(from(toISODate(monthStart))).map((g) => Number(g.valor))),
      kmMes: sum(ganhos.filter(from(toISODate(monthStart))).map((g) => Number(g.km ?? 0))),
      gastosMes:
        sum(gastos.filter(from(toISODate(monthStart))).map((g) => Number(g.valor))) +
        Object.values(fixoMesPorCategoria).reduce((acc, v) => acc + (v ?? 0), 0),
    }
  }, [ganhos, gastos, todayISOStr, weekStart, monthStart, fixoMesPorCategoria, fixoHoje])

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
    { tipo: 'diaria' as TipoMeta, label: 'Meta diária', valor: totals.ganhosHoje },
    { tipo: 'semanal' as TipoMeta, label: 'Meta semanal', valor: totals.ganhosSemana },
    { tipo: 'mensal' as TipoMeta, label: 'Meta mensal', valor: totals.ganhosMes },
  ]

  if (loading) return <div className="page-loading">Carregando...</div>

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">{formatLongDate(today)}</p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="card stat-card stat-positive">
          <div className="stat-icon">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="stat-label">Ganhos hoje</p>
            <p className="stat-value">{formatCurrency(totals.ganhosHoje)}</p>
          </div>
        </div>
        <div className="card stat-card stat-negative">
          <div className="stat-icon">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="stat-label">Gastos hoje</p>
            <p className="stat-value">{formatCurrency(totals.gastosHoje)}</p>
            {fixoHoje > 0 && <p className="stat-sub">inclui {formatCurrency(fixoHoje)} de despesas fixas</p>}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">
            <Wallet size={20} />
          </div>
          <div>
            <p className="stat-label">Saldo hoje</p>
            <p className={`stat-value ${saldoHoje < 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(saldoHoje)}
            </p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon">
            <Target size={20} />
          </div>
          <div>
            <p className="stat-label">Ganhos do mês</p>
            <p className="stat-value">{formatCurrency(totals.ganhosMes)}</p>
            <p className="stat-sub">
              Gastos: {formatCurrency(totals.gastosMes)} · Km: {totals.kmMes} km
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Metas</h2>
        <div className="metas-grid">
          {metasCards.map(({ tipo, label, valor }) => {
            const metaValor = metaValue(tipo)
            const progress = metaProgress(valor, metaValor)
            return (
              <div className="card meta-card" key={tipo}>
                <div className="meta-card-top">
                  <span>{label}</span>
                  <strong>{metaValor ? formatCurrency(metaValor) : 'Sem meta definida'}</strong>
                </div>
                <div className="meta-card-value">
                  <span>{formatCurrency(valor)}</span>
                  <span>atingidos</span>
                </div>
                {progress !== null ? (
                  <>
                    <div className="progress">
                      <div
                        className={`progress-bar${progress >= 100 ? ' complete' : ''}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="meta-card-sub">{progress}% da meta</p>
                  </>
                ) : (
                  <p className="meta-card-sub">Defina uma meta na aba Metas</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="charts-grid">
        <div className="card chart-card">
          <h2 className="section-title">Últimos 7 dias</h2>
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
          <h2 className="section-title">Gastos do mês por categoria</h2>
          {pieData.length === 0 ? (
            <p className="empty-state">Nenhum gasto registrado este mês.</p>
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
          <span>Resultado do mês (ganhos - gastos)</span>
        </div>
        <p className={`stat-value ${saldoMes < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(saldoMes)}</p>
      </section>
    </div>
  )
}
