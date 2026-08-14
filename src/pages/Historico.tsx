import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { History, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaColor } from '../lib/constants'
import { fetchHistorico, syncHistorico } from '../lib/historico'
import { formatCurrency, formatMonthBR, currentMonthISO, sum } from '../lib/utils'
import type { HistoricoGanhos } from '../types'
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

export default function Historico() {
  const { user } = useAuth()
  const [historico, setHistorico] = useState<HistoricoGanhos[]>([])
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
    setHistorico(await fetchHistorico(user.id))
    setLoading(false)
  }, [user])

  async function atualizar() {
    if (!user) return
    setSyncing(true)
    setError('')
    try {
      await syncHistorico(user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar histórico')
    }
    await load()
    setSyncing(false)
  }

  useEffect(() => {
    atualizar()
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Histórico</h1>
          <p className="page-subtitle">Resumo dos ganhos por mês — salvo automaticamente quando o mês vira</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={atualizar} disabled={syncing}>
            <RefreshCw size={18} className={syncing ? 'spin' : ''} />
            {syncing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus size={18} />
            Nova entrada
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : historico.length === 0 ? (
        <div className="card empty-state">
          <History size={32} />
          <p>Nenhum mês no histórico ainda.</p>
          <p className="stat-sub">Os meses anteriores são salvos aqui automaticamente.</p>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />
            Adicionar mês
          </button>
        </div>
      ) : (
        <div className="historico-list">
          {historico.map((h) => (
            <div className="card stat-card" key={h.id}>
              <div className="historico-head">
                <span className="stat-label">{formatMonthBR(h.mes)}</span>
                <div className="historico-head-actions">
                  <span className="stat-value">{formatCurrency(h.total)}</span>
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
                </div>
              </div>

              <div className="breakdown">
                {PLATAFORMAS.map(({ value, label }) => {
                  const total = value === 'uber' ? h.total_uber : value === '99' ? h.total_99 : h.total_outra
                  const percent = h.total > 0 ? Math.round((total / h.total) * 100) : 0
                  return (
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
                  )
                })}
              </div>

              <div className="historico-meta">
                <span>{h.corridas} corridas</span>
                <span>{Number(h.horas).toLocaleString('pt-BR')} h</span>
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
            <label className="label" htmlFor="hist-mes">
              Mês
            </label>
            <MonthPicker value={form.mes} onChange={(mes) => setForm({ ...form, mes })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="hist-uber">
                Uber (R$)
              </label>
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
              <label className="label" htmlFor="hist-99">
                99 (R$)
              </label>
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
            <label className="label" htmlFor="hist-outra">
              Outra (R$)
            </label>
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
              <label className="label" htmlFor="hist-corridas">
                Corridas
              </label>
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
              <label className="label" htmlFor="hist-horas">
                Horas
              </label>
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
