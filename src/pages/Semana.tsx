import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaColor } from '../lib/constants'
import {
  addDays,
  formatCurrency,
  formatDateBR,
  isoToDate,
  startOfWeek,
  toISODate,
  todayISO,
  sum,
} from '../lib/utils'
import type { Ganho, Gasto } from '../types'
import { useDespesasFixas, totalFixo, fixoDiario } from '../lib/despesasFixas'

export default function Semana() {
  const { user } = useAuth()
  const fixas = useDespesasFixas()
  const [weekDay, setWeekDay] = useState(todayISO())
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingDia, setSavingDia] = useState<string | null>(null)

  const weekStart = useMemo(() => startOfWeek(isoToDate(weekDay)), [weekDay])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const fromISO = toISODate(weekStart)
  const toISO = toISODate(weekEnd)
  const isCurrentWeek = fromISO === toISODate(startOfWeek(new Date()))

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

  function shiftWeek(days: number) {
    const d = isoToDate(weekDay)
    d.setDate(d.getDate() + days)
    setWeekDay(toISODate(d))
  }

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

  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i)
        const iso = toISODate(d)
        const doDia = ganhos.filter((g) => g.data === iso)
        const ganhosDia = sum(doDia.map((g) => Number(g.valor)))
        const horas = doDia.reduce((acc, g) => Math.max(acc, Number(g.horas_trabalhadas ?? 0)), 0)
        return {
          iso,
          diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
          label: formatDateBR(iso),
          ganhos: ganhosDia,
          gastos: sum(gastos.filter((g) => g.data === iso).map((g) => Number(g.valor))) + fixoDiario(fixas),
          horas,
          ganhoPorHora: ganhosDia > 0 && horas > 0 ? ganhosDia / horas : 0,
          ehHoje: iso === todayISO(),
        }
      }),
    [weekStart, ganhos, gastos, fixas],
  )

  const diasTrabalhados = dias.filter((dia) => dia.ganhos > 0).length
  const mediaDia = diasTrabalhados > 0 ? totalGanhos / diasTrabalhados : 0
  const totalHoras = sum(dias.map((dia) => dia.horas))
  const ganhoPorHora = totalHoras > 0 ? totalGanhos / totalHoras : 0

  async function setDiaHoras(iso: string, horas: number) {
    if (!user) return
    const ids = ganhos.filter((g) => g.data === iso).map((g) => g.id)
    if (ids.length === 0) return
    setSavingDia(iso)
    const { error: err } = await supabase
      .from('ganhos')
      .update({ horas_trabalhadas: horas || null })
      .in('id', ids)
    if (err) setError(err.message)
    setSavingDia(null)
    load()
  }

  const weekRangeLabel = `Semana de ${formatDateBR(fromISO)} a ${formatDateBR(toISO)}`

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Semana</h1>
          <p className="page-subtitle">{weekRangeLabel}</p>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(-7)} aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setWeekDay(todayISO())}
            disabled={isCurrentWeek}
          >
            Semana atual
          </button>
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(7)} aria-label="Próxima semana">
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
                <p className="stat-label">Ganhos da semana</p>
                <p className="stat-value">{formatCurrency(totalGanhos)}</p>
              </div>
            </div>
            <div className="card stat-card stat-negative">
              <div className="stat-icon">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="stat-label">Gastos da semana</p>
                <p className="stat-value">{formatCurrency(totalGastos)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <Wallet size={20} />
              </div>
              <div>
                <p className="stat-label">Saldo da semana</p>
                <p className={`stat-value ${saldo < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(saldo)}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="stat-label">Ganho por hora</p>
                <p className="stat-value">{formatCurrency(ganhoPorHora)}</p>
                <p className="stat-sub">
                  Média por dia: {formatCurrency(mediaDia)} · Horas: {totalHoras}h
                </p>
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
              <h2 className="section-title">Dias da semana</h2>
              <div className="breakdown">
                {dias.map((dia) => (
                  <div className="breakdown-row" key={dia.iso}>
                    <div className="breakdown-head">
                      <span className={dia.ehHoje ? 'today-label' : ''}>
                        {dia.diaSemana} <span className="breakdown-pct">{dia.label}</span>
                        {dia.ehHoje && <span className="breakdown-pct"> · hoje</span>}
                      </span>
                      <span>
                        <strong>{formatCurrency(dia.ganhos)}</strong>
                        {dia.gastos > 0 && <span className="breakdown-pct text-danger"> · -{formatCurrency(dia.gastos)}</span>}
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${totalGanhos > 0 ? Math.min(100, Math.round((dia.ganhos / totalGanhos) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="breakdown-dia">
                      <div className="breakdown-dia-horas">
                        <span className="breakdown-pct">Horas:</span>
                        <select
                          className="input horas-select"
                          aria-label={`Horas trabalhadas ${dia.diaSemana}`}
                          value={dia.horas === 0 ? '' : String(dia.horas)}
                          disabled={savingDia === dia.iso || dia.ganhos === 0}
                          onChange={(e) => setDiaHoras(dia.iso, Number(e.target.value))}
                        >
                          <option value="">—</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="breakdown-pct">
                        {dia.ganhoPorHora > 0 ? `${formatCurrency(dia.ganhoPorHora)}/h` : '—'}
                      </span>
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
