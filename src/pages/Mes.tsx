import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight, Gauge, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaColor } from '../lib/constants'
import { formatCurrency, formatMonthBR, lastDayOfMonthISO, toISODate, currentMonthISO, sum } from '../lib/utils'
import type { Ganho, Gasto } from '../types'
import { useDespesasFixas, totalFixo } from '../lib/despesasFixas'
import { useLanguage } from '../contexts/LanguageContext'

export default function Mes() {
  const { user } = useAuth()
  const { t } = useLanguage()
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

  const mediaDia = totalGanhos / daysInMonth

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('month')}</h1>
          <p className="page-subtitle">{formatMonthBR(month)}</p>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftMonth(-1)} aria-label={t('previousMonth')}>
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMonth(currentMonthISO())}
            disabled={isCurrentMonth}
          >
            {t('currentMonth')}
          </button>
          <button type="button" className="icon-btn week-arrow" onClick={() => shiftMonth(1)} aria-label={t('nextMonth')}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loading">{t('loading')}</div>
      ) : (
        <>
          <section className="card mes-hero">
            <div>
              <span className="dashboard-eyebrow">{t('monthBalance')}</span>
              <strong className={saldo < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(saldo)}</strong>
            </div>
            <div className="mes-hero-grid">
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
              <CalendarRange size={18} />
              <div>
                <span>{t('dailyAverage')}</span>
                <strong>{formatCurrency(mediaDia)}</strong>
                <small>{daysInMonth} {t('daysInMonth')}</small>
              </div>
            </div>
            <div className="card dashboard-mini-card">
              <Wallet size={18} />
              <div>
                <span>{t('entries')}</span>
                <strong>{ganhos.length}</strong>
                <small>{t('registeredEarnings')}</small>
              </div>
            </div>
            <div className="card dashboard-mini-card">
              <Gauge size={18} />
              <div>
                <span>{t('result')}</span>
                <strong className={saldo < 0 ? 'text-danger' : 'text-success'}>{saldo < 0 ? t('negative') : t('positive')}</strong>
                <small>{formatCurrency(Math.abs(saldo))}</small>
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
