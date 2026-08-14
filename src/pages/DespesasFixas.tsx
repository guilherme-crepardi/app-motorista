import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Repeat } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CATEGORIAS, categoriaLabel, categoriaColor, PERIODICIDADES, periodicidadeLabel } from '../lib/constants'
import { formatCurrency } from '../lib/utils'
import Modal from '../components/Modal'
import type { CategoriaGasto, DespesaFixa, Periodicidade } from '../types'

interface FormState {
  categoria: CategoriaGasto
  valor: string
  periodicidade: Periodicidade
  descricao: string
  ativo: boolean
}

const emptyForm: FormState = { categoria: 'seguro', valor: '', periodicidade: 'diaria', descricao: '', ativo: true }

export default function DespesasFixas() {
  const { user } = useAuth()
  const [fixas, setFixas] = useState<DespesaFixa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DespesaFixa | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DespesaFixa | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('despesas_fixas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    if (err) setError(err.message)
    else setFixas(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(f: DespesaFixa) {
    setEditing(f)
    setForm({
      categoria: f.categoria,
      valor: String(f.valor),
      periodicidade: f.periodicidade,
      descricao: f.descricao ?? '',
      ativo: f.ativo,
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
      categoria: form.categoria,
      valor: Number(form.valor),
      periodicidade: form.periodicidade,
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
    }

    const { error: err } = editing
      ? await supabase.from('despesas_fixas').update(payload).eq('id', editing.id)
      : await supabase.from('despesas_fixas').insert(payload)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function toggleAtivo(f: DespesaFixa) {
    await supabase.from('despesas_fixas').update({ ativo: !f.ativo }).eq('id', f.id)
    load()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const { error: err } = await supabase.from('despesas_fixas').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Despesas Fixas</h1>
          <p className="page-subtitle">
            Cadastre gastos que se repetem (ex.: seguro R$ 10/dia) e o app soma automaticamente nos totais
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Nova despesa fixa
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : fixas.length === 0 ? (
        <div className="card empty-state">
          <Repeat size={32} />
          <p>Nenhuma despesa fixa cadastrada.</p>
          <button type="button" className="btn btn-secondary" onClick={openNew}>
            <Plus size={16} />
            Cadastrar despesa fixa
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {fixas.map((f) => (
            <div className="card stat-card" key={f.id}>
              <span className="dot" style={{ background: categoriaColor(f.categoria) }} />
              <div style={{ flex: 1 }}>
                <p className="stat-label">
                  {categoriaLabel(f.categoria)} · {periodicidadeLabel(f.periodicidade)}
                </p>
                <p className="stat-value">{formatCurrency(Number(f.valor))}</p>
                <p className="stat-sub">{f.descricao || '—'}</p>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className={`toggle ${f.ativo ? 'on' : ''}`}
                  onClick={() => toggleAtivo(f)}
                  aria-label={f.ativo ? 'Desativar' : 'Ativar'}
                  title={f.ativo ? 'Ativa' : 'Pausada'}
                >
                  <span className="toggle-dot" />
                </button>
                <button type="button" className="icon-btn" onClick={() => openEdit(f)} aria-label="Editar">
                  <Pencil size={16} />
                </button>
                <button type="button" className="icon-btn danger" onClick={() => setConfirmDelete(f)} aria-label="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar despesa fixa' : 'Nova despesa fixa'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="fixa-categoria">
                Categoria
              </label>
              <select
                id="fixa-categoria"
                className="input"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="fixa-valor">
                Valor (R$)
              </label>
              <input
                id="fixa-valor"
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="fixa-periodicidade">
              Repetição
            </label>
            <select
              id="fixa-periodicidade"
              className="input"
              value={form.periodicidade}
              onChange={(e) => setForm({ ...form, periodicidade: e.target.value as Periodicidade })}
            >
              {PERIODICIDADES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="input-hint">"Por dia" soma o valor a cada dia do período; "Por semana" a cada semana; "Por mês" a cada mês.</p>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="fixa-descricao">
              Descrição
            </label>
            <input
              id="fixa-descricao"
              className="input"
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: Seguro do carro"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativa (incluir nos totais)
            </label>
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

      <Modal open={confirmDelete !== null} title="Excluir despesa fixa" onClose={() => setConfirmDelete(null)}>
        <p className="modal-text">
          Tem certeza que deseja excluir a despesa fixa de{' '}
          {confirmDelete ? categoriaLabel(confirmDelete.categoria) : ''} de{' '}
          {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}?
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
