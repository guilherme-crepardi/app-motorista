import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { History, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaColor } from '../lib/constants'
import { fetchHistorico, syncHistorico } from '../lib/historico'
import { fetchHistoricoGastos, syncHistoricoGastos } from '../lib/historicoGastos'
import { formatCurrency, formatMonthBR, currentMonthISO, sum } from '../lib/utils'
import type { HistoricoGanhos, HistoricoGastos } from '../types'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import { useLanguage } from '../contexts/LanguageContext'

interface FormState {
  mes: string
  total_uber: string
  total_99: string
  total_outra: string
  corridas: string
  horas: string
}

const emptyForm: FormState = {
  mes: currentMonthISO(),
  total_uber: '',
  total_99: '',
  total_outra: '',
  corridas: '',
  horas: '',
}

type Tab = 'ganhos' | 'gastos'
type Filtro = 'mensal' | 'anual'

export default function Historico() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('ganhos')
  const [filtro, setFiltro] = useState<Filtro>('mensal')
  const [anoFilter, setAnoFilter] = useState(new Date().getFullYear())
  const [historico, setHistorico] = useState<HistoricoGanhos[]>([])
  const [historicoGastos, setHistoricoGastos] = useState<HistoricoGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HistoricoGanhos | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<HistoricoGanhos | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [h, hg] = await Promise.all([fetchHistorico(user.id), fetchHistoricoGastos(user.id)])
    setHistorico(h)
    setHistoricoGastos(hg)
    setLoading(false)
  }, [user])

  async function atualizar() {
    if (!user) return
    setSyncing(true)
    setError('')
    try {
      await Promise.all([syncHistorico(user.id), syncHistoricoGastos(user.id)])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'))
    }
    await load()
    setSyncing(false)
  }

  useEffect(() => {
    if (user) atualizar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const totalForm = sum([Number(form.total_uber), Number(form.total_99), Number(form.total_outra)])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(h: HistoricoGanhos) {
    setEditing(h)
    setForm({
      mes: h.mes,
      total_uber: String(h.total_uber),
      total_99: String(h.total_99),
      total_outra: String(h.total_outra),
      corridas: String(h.corridas),
      horas: String(h.horas),
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    const payload = {
      user_id: user.id,
      mes: form.mes,
      total_uber: Number(form.total_uber) || 0,
      total_99: Number(form.total_99) || 0,
      total_outra: Number(form.total_outra) || 0,
      total: totalForm,
      corridas: Number(form.corridas) || 0,
      horas: Number(form.horas) || 0,
    }

    const { error: err } = editing
      ? await supabase.from('historico_ganhos').update(payload).eq('id', editing.id)
      : await supabase.from('historico_ganhos').upsert(payload, { onConflict: 'user_id,mes' })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const { error: err } = await supabase.from('historico_ganhos').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  const anosDisponiveis = useMemo(() => {
    const conjunto = new Set<number>()
    for (const h of historico) conjunto.add(Number(h.mes.slice(0, 4)))
    for (const h of historicoGastos) conjunto.add(Number(h.mes.slice(0, 4)))
    if (conjunto.size === 0) conjunto.add(new Date().getFullYear())
    return Array.from(conjunto).sort((a, b) => b - a)
  }, [historico, historicoGastos])

  const historicoFiltrado = useMemo(() => {
    const lista = historico.filter((h) => Number(h.mes.slice(0, 4)) === anoFilter)
    if (filtro === 'mensal') return lista
    const porAno = new Map<string, HistoricoGanhos>()
    for (const h of lista) {
      const key = h.mes.slice(0, 4)
      if (!porAno.has(key)) {
        porAno.set(key, { ...h, mes: key, total: 0, total_uber: 0, total_99: 0, total_outra: 0, corridas: 0, horas: 0 })
      }
      const acc = porAno.get(key)!
      acc.total += h.total
      acc.total_uber += h.total_uber
      acc.total_99 += h.total_99
      acc.total_outra += h.total_outra
      acc.corridas += h.corridas
      acc.horas += h.horas
    }
    return Array.from(porAno.values())
  }, [historico, anoFilter, filtro])

  const historicoGastosFiltrado = useMemo(() => {
    const lista = historicoGastos.filter((h) => Number(h.mes.slice(0, 4)) === anoFilter)
    if (filtro === 'mensal') return lista
    const porAno = new Map<string, HistoricoGastos>()
    for (const h of lista) {
      const key = h.mes.slice(0, 4)
      if (!porAno.has(key)) {
        porAno.set(key, { ...h, mes: key, total: 0, total_gastos: 0, total_manutencoes: 0, total_fixas: 0 })
      }
      const acc = porAno.get(key)!
      acc.total += h.total
      acc.total_gastos += h.total_gastos
      acc.total_manutencoes += h.total_manutencoes
      acc.total_fixas += h.total_fixas
    }
    return Array.from(porAno.values())
  }, [historicoGastos, anoFilter, filtro])

  const totalPeriodoGanhos = sum(historicoFiltrado.map((h) => h.total))
  const totalPeriodoGastos = sum(historicoGastosFiltrado.map((h) => h.total))

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('history')}</h1>
          <p className="page-subtitle">{t('historySubtitle')}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={atualizar} disabled={syncing}>
            <RefreshCw size={18} className={syncing ? 'spin' : ''} />
            {syncing ? t('refreshing') : t('refresh')}
          </button>
          {tab === 'ganhos' && (
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={18} />
              {t('newEntry')}
            </button>
          )}
        </div>
      </header>

      <div className="card toolbar">
        <div className="toolbar-filters">
          <div className="period-tabs">
            <button type="button" className={tab === 'ganhos' ? 'tab active' : 'tab'} onClick={() => setTab('ganhos')}>
              {t('earnings')}
            </button>
            <button type="button" className={tab === 'gastos' ? 'tab active' : 'tab'} onClick={() => setTab('gastos')}>
              {t('expenses')}
            </button>
          </div>
          <div className="period-tabs">
            <button type="button" className={filtro === 'mensal' ? 'tab active' : 'tab'} onClick={() => setFiltro('mensal')}>
              {t('monthly')}
            </button>
            <button type="button" className={filtro === 'anual' ? 'tab active' : 'tab'} onClick={() => setFiltro('anual')}>
              {t('annual')}
            </button>
          </div>
          <div className="form-group">
            <label className="label">{t('year')}</label>
            <select className="input" value={anoFilter} onChange={(e) => setAnoFilter(Number(e.target.value))}>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar-total">
          <span>{t('totalPeriod')}</span>
          <strong className={tab === 'ganhos' ? 'text-success' : 'text-danger'}>
            {formatCurrency(tab === 'ganhos' ? totalPeriodoGanhos : totalPeriodoGastos)}
          </strong>
          <span className="toolbar-label">{filtro === 'mensal' ? `${anoFilter}` : `Ano ${anoFilter}`}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">{t('loading')}</div>
      ) : tab === 'ganhos' ? (
        historicoFiltrado.length === 0 ? (
          <div className="card empty-state">
            <History size={32} />
            <p>{t('noEarningsHistory')}</p>
            <p className="stat-sub">{t('monthsSavedAutomatically')}</p>
          </div>
        ) : (
          <div className="historico-list">
            {historicoFiltrado.map((h) => {
              const key = h.id ?? h.mes
              const expanded = expandedId === key
              return (
                <div className="card historico-card compact" key={key}>
                  <div className="historico-card-main">
                    <div>
                      <span>{filtro === 'mensal' ? formatMonthBR(h.mes) : `${h.mes}`}</span>
                      <strong className="text-success">{formatCurrency(h.total)}</strong>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedId(expanded ? null : key)}>
                      {expanded ? t('hide') : t('details')}
                    </button>
                  </div>

                  {expanded && (
                    <div className="historico-card-details">
                      <div className="breakdown compact">
                        {PLATAFORMAS.map(({ value, label }) => {
                          const total = value === 'uber' ? h.total_uber : value === '99' ? h.total_99 : h.total_outra
                          const percent = h.total > 0 ? Math.round((total / h.total) * 100) : 0
                          return (
                            <div className="breakdown-row" key={value}>
                              <div className="breakdown-head">
                                <span><span className="badge">{label}</span></span>
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
                          )
                        })}
                      </div>

                      {filtro === 'mensal' && (
                        <div className="historico-meta">
                          <span>{h.corridas} {t('rides').toLowerCase()}</span>
                          <span>{Number(h.horas).toLocaleString('pt-BR')} h</span>
                        </div>
                      )}

                      {filtro === 'mensal' && (
                        <div className="historico-card-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>
                            <Pencil size={15} />
                            {t('edit')}
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm btn-soft-danger" onClick={() => setConfirmDelete(h)}>
                            <Trash2 size={15} />
                            {t('delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : historicoGastosFiltrado.length === 0 ? (
        <div className="card empty-state">
          <History size={32} />
          <p>{t('noExpensesHistory')}</p>
          <p className="stat-sub">{t('monthsSavedAutomatically')}</p>
        </div>
      ) : (
        <div className="historico-list">
          {historicoGastosFiltrado.map((h) => {
            const expanded = expandedId === h.mes
            return (
              <div className="card historico-card compact" key={h.mes}>
                <div className="historico-card-main">
                  <div>
                    <span>{filtro === 'mensal' ? formatMonthBR(h.mes) : `${h.mes}`}</span>
                    <strong className="text-danger">{formatCurrency(h.total)}</strong>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedId(expanded ? null : h.mes)}>
                    {expanded ? t('hide') : t('details')}
                  </button>
                </div>

                {expanded && (
                  <div className="historico-card-details">
                    <div className="breakdown compact">
                      {[
                        { label: t('expenses'), total: h.total_gastos, color: '#ef4444' },
                        { label: t('maintenance'), total: h.total_manutencoes, color: '#f97316' },
                        { label: t('fixedExpenses'), total: h.total_fixas, color: '#8b5cf6' },
                      ].map((item) => (
                        <div className="breakdown-row" key={item.label}>
                          <div className="breakdown-head">
                            <span><span className="badge">{item.label}</span></span>
                            <strong>{formatCurrency(item.total)}</strong>
                          </div>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${h.total > 0 ? Math.round((item.total / h.total) * 100) : 0}%`,
                                background: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? t('editEntry') : t('newEntry')}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="hist-mes">{t('month')}</label>
            <MonthPicker value={form.mes} onChange={(mes) => setForm({ ...form, mes })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="hist-uber">Uber (R$)</label>
              <input
                id="hist-uber"
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.total_uber}
                onChange={(e) => setForm({ ...form, total_uber: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="hist-99">99 (R$)</label>
              <input
                id="hist-99"
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.total_99}
                onChange={(e) => setForm({ ...form, total_99: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="hist-outra">Outra (R$)</label>
            <input
              id="hist-outra"
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.total_outra}
              onChange={(e) => setForm({ ...form, total_outra: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="hist-corridas">{t('rides')}</label>
              <input
                id="hist-corridas"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.corridas}
                onChange={(e) => setForm({ ...form, corridas: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="hist-horas">{t('hours')}</label>
              <input
                id="hist-horas"
                className="input"
                type="number"
                step="0.5"
                min="0"
                value={form.horas}
                onChange={(e) => setForm({ ...form, horas: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="alert alert-info">
            {t('totalMonth')}: <strong>{formatCurrency(totalForm)}</strong>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title={t('deleteEntry')}
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir a entrada de{' '}
          {confirmDelete ? formatMonthBR(confirmDelete.mes) : ''} no valor de{' '}
          {confirmDelete ? formatCurrency(confirmDelete.total) : ''}?
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            {t('delete')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
