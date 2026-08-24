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
      setError(err instanceof Error ? err.message : 'Erro ao atualizar histórico')
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
          <h1>Histórico</h1>
          <p className="page-subtitle">Resumo de ganhos e gastos — atualizado automaticamente</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={atualizar} disabled={syncing}>
            <RefreshCw size={18} className={syncing ? 'spin' : ''} />
            {syncing ? 'Atualizando...' : 'Atualizar'}
          </button>
          {tab === 'ganhos' && (
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={18} />
              Nova entrada
            </button>
          )}
        </div>
      </header>

      <div className="card toolbar">
        <div className="toolbar-filters">
          <div className="period-tabs">
            <button type="button" className={tab === 'ganhos' ? 'tab active' : 'tab'} onClick={() => setTab('ganhos')}>
              Ganhos
            </button>
            <button type="button" className={tab === 'gastos' ? 'tab active' : 'tab'} onClick={() => setTab('gastos')}>
              Gastos
            </button>
          </div>
          <div className="period-tabs">
            <button type="button" className={filtro === 'mensal' ? 'tab active' : 'tab'} onClick={() => setFiltro('mensal')}>
              Mensal
            </button>
            <button type="button" className={filtro === 'anual' ? 'tab active' : 'tab'} onClick={() => setFiltro('anual')}>
              Anual
            </button>
          </div>
          <div className="form-group">
            <label className="label">Ano</label>
            <select className="input" value={anoFilter} onChange={(e) => setAnoFilter(Number(e.target.value))}>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar-total">
          <span>Total do período</span>
          <strong className={tab === 'ganhos' ? 'text-success' : 'text-danger'}>
            {formatCurrency(tab === 'ganhos' ? totalPeriodoGanhos : totalPeriodoGastos)}
          </strong>
          <span className="toolbar-label">{filtro === 'mensal' ? `${anoFilter}` : `Ano ${anoFilter}`}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : tab === 'ganhos' ? (
        historicoFiltrado.length === 0 ? (
          <div className="card empty-state">
            <History size={32} />
            <p>Nenhum mês no histórico de ganhos.</p>
            <p className="stat-sub">Os meses são salvos automaticamente.</p>
          </div>
        ) : (
          <div className="historico-list">
            {historicoFiltrado.map((h) => (
              <div className="card stat-card" key={h.id}>
                <div className="historico-head">
                  <span className="stat-label">
                    {filtro === 'mensal' ? formatMonthBR(h.mes) : `${h.mes}`}
                  </span>
                  <div className="historico-head-actions">
                    <span className="stat-value text-success">{formatCurrency(h.total)}</span>
                    {filtro === 'mensal' && (
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => openEdit(h)} aria-label="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setConfirmDelete(h)}
                          aria-label="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="breakdown">
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
                    <span>{h.corridas} corridas</span>
                    <span>{Number(h.horas).toLocaleString('pt-BR')} h</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : historicoGastosFiltrado.length === 0 ? (
        <div className="card empty-state">
          <History size={32} />
          <p>Nenhum mês no histórico de gastos.</p>
          <p className="stat-sub">Os meses são salvos automaticamente.</p>
        </div>
      ) : (
        <div className="historico-list">
          {historicoGastosFiltrado.map((h) => (
            <div className="card stat-card" key={h.mes}>
              <div className="historico-head">
                <span className="stat-label">
                  {filtro === 'mensal' ? formatMonthBR(h.mes) : `${h.mes}`}
                </span>
                <span className="stat-value text-danger">{formatCurrency(h.total)}</span>
              </div>

              <div className="breakdown">
                <div className="breakdown-row">
                  <div className="breakdown-head">
                    <span><span className="badge">Gastos</span></span>
                    <strong>{formatCurrency(h.total_gastos)}</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${h.total > 0 ? Math.round((h.total_gastos / h.total) * 100) : 0}%`,
                        background: '#ef4444',
                      }}
                    />
                  </div>
                </div>
                <div className="breakdown-row">
                  <div className="breakdown-head">
                    <span><span className="badge">Manutenções</span></span>
                    <strong>{formatCurrency(h.total_manutencoes)}</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${h.total > 0 ? Math.round((h.total_manutencoes / h.total) * 100) : 0}%`,
                        background: '#f97316',
                      }}
                    />
                  </div>
                </div>
                <div className="breakdown-row">
                  <div className="breakdown-head">
                    <span><span className="badge">Despesas fixas</span></span>
                    <strong>{formatCurrency(h.total_fixas)}</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${h.total > 0 ? Math.round((h.total_fixas / h.total) * 100) : 0}%`,
                        background: '#8b5cf6',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar entrada' : 'Nova entrada'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="hist-mes">Mês</label>
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
              <label className="label" htmlFor="hist-corridas">Corridas</label>
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
              <label className="label" htmlFor="hist-horas">Horas</label>
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
            Total do mês: <strong>{formatCurrency(totalForm)}</strong>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title="Excluir entrada"
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir a entrada de{' '}
          {confirmDelete ? formatMonthBR(confirmDelete.mes) : ''} no valor de{' '}
          {confirmDelete ? formatCurrency(confirmDelete.total) : ''}?
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  )
}
