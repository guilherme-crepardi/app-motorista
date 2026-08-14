import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, CalendarRange } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaColor } from '../lib/constants'
import { formatCurrency, formatMonthBR, lastDayOfMonthISO, toISODate, currentMonthISO, sum } from '../lib/utils'
import type { Ganho, Gasto } from '../types'
import { useDespesasFixas, totalFixo, fixoDiario } from '../lib/despesasFixas'

export default function Mes() {
  const { user } = useAuth()
  const fixas = useDespesasFixas()
  const [month, setMonth] = useState(currentMonthISO())
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fromISO = `${month}-01`
  const toISO = lastDayOfMonthISO(month)
  const isCurrentMonth = month === currentMonthISO()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [g, d] = await Promise.all([
      supabase.from('ganhos').select('*').eq('user_id', user.id).gte('data', fromISO).lte('data', toISO),
      supabase.from('gastos').select('*').eq('user_id', user.id).gte('data', fromISO).lte('data', toISO),
    ])
    if (g.error) setError(g.error.message)
    else setGanhos(g.data ?? [])
    if (d.error) setError(d.error.message)
    else setGastos(d.data ?? [])
    setLoading(false)
  }, [user, fromISO, toISO])

  useEffect(() => {
    load()
  }, [load])

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(toISODate(d).slice(0, 7))
  }

  const [year, mon] = useMemo(() => month.split('-').map(Number), [month])
  const daysInMonth = useMemo(() => new Date(year, mon, 0).getDate(), [year, mon])

  const totalGanhos = useMemo(() => sum(ganhos.map((g) => Number(g.valor))), [ganhos])
  const totalGastos = useMemo(
    () => sum(gastos.map((g) => Number(g.valor))) + totalFixo(fixas, fromISO, toISO),
    [gastos, fixas, fromISO, toISO],
  )
  const saldo = totalGanhos - totalGastos

  const porPlataforma = useMemo(
    () =>
      PLATAFORMAS.map(({ value, label }) => {
        const total = sum(ganhos.filter((g) => g.plataforma === value).map((g) => Number(g.valor)))
        return {
          value,
          label,
          total,
          percent: totalGanhos > 0 ? Math.round((total / totalGanhos) * 100) : 0,
        }
      }),
    [ganhos, totalGanhos],
  )

  const semanas = useMemo(() => {
    const buckets: { start: number; end: number; ganhos: number; gastos: number }[] = []
    for (let day = 1; day <= daysInMonth; day += 7) {
      const end = Math.min(day + 6, daysInMonth)
      let g = 0
      let despesa = 0
      for (let d = day; d <= end; d++) {
        const iso = `${month}-${String(d).padStart(2, '0')}`
        g += sum(ganhos.filter((x) => x.data === iso).map((x) => Number(x.valor)))
        despesa += sum(gastos.filter((x) => x.data === iso).map((x) => Number(x.valor))) + fixoDiario(fixas)
      }
      buckets.push({ start: day, end, ganhos: g, gastos: despesa })
    }
    return buckets
  }, [month, daysInMonth, ganhos, gastos, fixas])

  const mediaDia = totalGanhos / daysInMonth

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Mês</h1>
          <p className="page-subtitle">{formatMonthBR(month)}</p>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMonth(currentMonthISO())}
            disabled={isCurrentMonth}
          >
            Mês atual
          </button>
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : (
        <>
          <section className="stats-grid">
            <div className="card stat-card stat-positive">
              <div className="stat-icon">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="stat-label">Ganhos do mês</p>
                <p className="stat-value">{formatCurrency(totalGanhos)}</p>
              </div>
            </div>
            <div className="card stat-card stat-negative">
              <div className="stat-icon">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="stat-label">Gastos do mês</p>
                <p className="stat-value">{formatCurrency(totalGastos)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <Wallet size={20} />
              </div>
              <div>
                <p className="stat-label">Saldo do mês</p>
                <p className={`stat-value ${saldo < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(saldo)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <CalendarRange size={20} />
              </div>
              <div>
                <p className="stat-label">Média por dia</p>
                <p className="stat-value">{formatCurrency(mediaDia)}</p>
              </div>
            </div>
          </section>

          <section className="charts-grid">
            <div className="card chart-card">
              <h2 className="section-title">Ganhos por plataforma</h2>
              <div className="breakdown">
                {porPlataforma.map(({ value, label, total, percent }) => (
                  <div className="breakdown-row" key={value}>
                    <div className="breakdown-head">
                      <span>
                        <span className="badge">{label}</span>
                      </span>
                      <span>
                        <strong>{formatCurrency(total)}</strong>
                        <span className="breakdown-pct"> · {percent}%</span>
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${percent}%`, background: plataformaColor(value) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card chart-card">
              <h2 className="section-title">Semanas do mês</h2>
              <div className="breakdown">
                {semanas.map((s, i) => (
                  <div className="breakdown-row" key={`${s.start}-${s.end}`}>
                    <div className="breakdown-head">
                      <span>
                        Semana {i + 1} <span className="breakdown-pct">{s.start} a {s.end}</span>
                      </span>
                      <span>
                        <strong>{formatCurrency(s.ganhos)}</strong>
                        {s.gastos > 0 && <span className="breakdown-pct text-danger"> · -{formatCurrency(s.gastos)}</span>}
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${totalGanhos > 0 ? Math.min(100, Math.round((s.ganhos / totalGanhos) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
