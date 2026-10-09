import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Wallet } from 'lucide-react'
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
import { useLanguage } from '../contexts/LanguageContext'

export default function Semana() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const fixas = useDespesasFixas()
  const [weekDay, setWeekDay] = useState(todayISO())
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const weekRangeLabel = `${t('weekRange')} ${formatDateBR(fromISO)} ${t('to')} ${formatDateBR(toISO)}`

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('week')}</h1>
          <p className="page-subtitle">{weekRangeLabel}</p>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(-7)} aria-label={t('previousWeek')}>
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setWeekDay(todayISO())}
            disabled={isCurrentWeek}
          >
            {t('currentWeek')}
          </button>
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(7)} aria-label={t('nextWeek')}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loading">{t('loading')}</div>
      ) : (
        <>
          <section className="card semana-hero">
            <div>
              <span className="dashboard-eyebrow">{t('weekBalance')}</span>
              <strong className={saldo < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(saldo)}</strong>
            </div>
            <div className="semana-hero-grid">
              <span>
                <small>{t('earnings')}</small>
                <strong className="text-success">{formatCurrency(totalGanhos)}</strong>
              </span>
              <span>
                <small>{t('expenses')}</small>
                <strong className="text-danger">{formatCurrency(totalGastos)}</strong>
              </span>
            </div>
          </section>

          <section className="dashboard-quick-grid">
            <div className="card dashboard-mini-card">
              <CalendarDays size={18} />
              <div>
                <span>{t('workedDays')}</span>
                <strong>{diasTrabalhados}</strong>
                <small>{t('of7Days')}</small>
              </div>
            </div>
            <div className="card dashboard-mini-card">
              <Wallet size={18} />
              <div>
                <span>{t('dailyAverage')}</span>
                <strong>{formatCurrency(mediaDia)}</strong>
                <small>{t('daysWithEarnings')}</small>
              </div>
            </div>
            <div className="card dashboard-mini-card">
              <Clock size={18} />
              <div>
                <span>{t('hourlyEarning')}</span>
                <strong>{formatCurrency(ganhoPorHora)}</strong>
                <small>{totalHoras}{t('reportedHours')}</small>
              </div>
            </div>
          </section>

          <section className="semana-layout single">
            <div className="card chart-card semana-card">
              <h2 className="section-title">{t('earningsByPlatform')}</h2>
              <div className="breakdown compact">
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
          </section>
        </>
      )}
    </div>
  )
}
