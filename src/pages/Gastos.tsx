import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Receipt, Image, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CATEGORIAS, categoriaLabel, categoriaColor } from '../lib/constants'
import { formatCurrency, todayISO, currentMonthISO, formatDateBR, lastDayOfMonthISO, sum } from '../lib/utils'
import { useDespesasFixas, totalFixo, totalFixoPorCategoria } from '../lib/despesasFixas'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import type { Gasto, CategoriaGasto } from '../types'

interface FormState {
  data: string
  categoria: CategoriaGasto
  valor: string
  descricao: string
}

const emptyForm: FormState = { data: todayISO(), categoria: 'combustivel', valor: '', descricao: '' }

export default function Gastos() {
  const { user } = useAuth()
  const fixas = useDespesasFixas()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(currentMonthISO())
  const [categoriaFilter, setCategoriaFilter] = useState<'todas' | CategoriaGasto>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Gasto | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Gasto | null>(null)
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', `${month}-01`)
      .lte('data', lastDayOfMonthISO(month))
      .order('data', { ascending: false })
    if (err) setError(err.message)
    else setGastos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month])

  const filtered = useMemo(
    () => (categoriaFilter === 'todas' ? gastos : gastos.filter((g) => g.categoria === categoriaFilter)),
    [gastos, categoriaFilter],
  )

  const fixoPorCategoria = useMemo(() => totalFixoPorCategoria(fixas, `${month}-01`, lastDayOfMonthISO(month)), [fixas, month])

  const fixoTotal = useMemo(() => {
    if (categoriaFilter === 'todas') return totalFixo(fixas, `${month}-01`, lastDayOfMonthISO(month))
    return fixoPorCategoria[categoriaFilter] ?? 0
  }, [fixas, month, categoriaFilter, fixoPorCategoria])

  const total = sum(filtered.map((g) => Number(g.valor))) + fixoTotal

  const byCategoria = useMemo(() => {
    const map = new Map<CategoriaGasto, number>()
    filtered.forEach((g) => map.set(g.categoria, (map.get(g.categoria) ?? 0) + Number(g.valor)))
    CATEGORIAS.forEach(({ value }) => {
      const fixo = categoriaFilter === 'todas' || categoriaFilter === value ? (fixoPorCategoria[value] ?? 0) : 0
      if (fixo > 0) map.set(value, (map.get(value) ?? 0) + fixo)
    })
    return CATEGORIAS.map(({ value, label, color }) => ({
      value,
      label,
      color,
      total: map.get(value) ?? 0,
    }))
  }, [filtered, fixoPorCategoria, categoriaFilter])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setComprovanteFile(null)
    setComprovantePreview(null)
    setModalOpen(true)
  }

  function openEdit(gasto: Gasto) {
    setEditing(gasto)
    setForm({
      data: gasto.data,
      categoria: gasto.categoria,
      valor: String(gasto.valor),
      descricao: gasto.descricao ?? '',
    })
    setComprovanteFile(null)
    setComprovantePreview(gasto.comprovante_url ?? null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    let comprovanteUrl: string | null = editing?.comprovante_url ?? null

    if (comprovanteFile) {
      const ext = comprovanteFile.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('comprovantes')
        .upload(path, comprovanteFile, { upsert: true })
      if (uploadErr) {
        setError(uploadErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(path)
      comprovanteUrl = urlData.publicUrl
    }

    const payload = {
      user_id: user.id,
      data: form.data,
      categoria: form.categoria,
      valor: Number(form.valor),
      descricao: form.descricao.trim() || null,
      comprovante_url: comprovanteUrl,
    }

    const { error: err } = editing
      ? await supabase.from('gastos').update(payload).eq('id', editing.id)
      : await supabase.from('gastos').insert(payload)

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
    const { error: err } = await supabase.from('gastos').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Gastos</h1>
          <p className="page-subtitle">Combustível, manutenção, pneus, alimentação e outros</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Novo gasto
        </button>
      </header>

      <div className="card toolbar">
        <div className="form-row">
          <div className="form-group">
            <label className="label" htmlFor="month">
              Período
            </label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="categoria-filter">
              Categoria
            </label>
            <select
              id="categoria-filter"
              className="input"
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value as 'todas' | CategoriaGasto)}
            >
              <option value="todas">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar-total">
          <span>Total do mês</span>
          <strong>{formatCurrency(total)}</strong>
          {fixoTotal > 0 && <span className="toolbar-sub">inclui {formatCurrency(fixoTotal)} automáticos (despesas fixas)</span>}
        </div>
      </div>

      {byCategoria.some((c) => c.total > 0) && (
        <div className="cards-grid small">
          {byCategoria
            .filter((c) => c.total > 0)
            .map((c) => (
              <div className="card stat-card" key={c.value}>
                <span className="dot" style={{ background: c.color }} />
                <div>
                  <p className="stat-label">{c.label}</p>
                  <p className="stat-value">{formatCurrency(c.total)}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Receipt size={32} />
          <p>Nenhum gasto registrado neste período.</p>
          <button type="button" className="btn btn-secondary" onClick={openNew}>
            <Plus size={16} />
            Registrar gasto
          </button>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th className="align-right">Valor</th>
                  <th className="align-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td>{formatDateBR(g.data)}</td>
                    <td>
                      <span className="badge" style={{ color: categoriaColor(g.categoria) }}>
                        {categoriaLabel(g.categoria)}
                      </span>
                    </td>
                    <td className="cell-muted">{g.descricao || '—'}</td>
                    <td className="align-right text-danger">{formatCurrency(Number(g.valor))}</td>
                    <td className="align-right">
                      <div className="row-actions">
                        {g.comprovante_url && (
                          <button type="button" className="icon-btn" onClick={() => setViewingImage(g.comprovante_url!)} aria-label="Ver comprovante">
                            <Image size={16} />
                          </button>
                        )}
                        <button type="button" className="icon-btn" onClick={() => openEdit(g)} aria-label="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setConfirmDelete(g)}
                          aria-label="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="align-right text-danger">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar gasto' : 'Novo gasto'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="gasto-data">
              Data
            </label>
            <input
              id="gasto-data"
              className="input"
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="gasto-categoria">
              Categoria
            </label>
            <select
              id="gasto-categoria"
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
          {form.categoria === 'outro' && (
            <div className="form-group">
              <label className="label" htmlFor="gasto-categoria-custom">
                Nome do gasto
              </label>
              <input
                id="gasto-categoria-custom"
                className="input"
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: multa, taxa, serviço..."
              />
            </div>
          )}
          <div className="form-group">
            <label className="label" htmlFor="gasto-valor">
              Valor (R$)
            </label>
            <input
              id="gasto-valor"
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
          <div className="form-group">
            <label className="label" htmlFor="gasto-descricao">
              Descrição
            </label>
            <input
              id="gasto-descricao"
              className="input"
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: óleo, troca de pneu, almoço..."
            />
          </div>
          <div className="form-group">
            <label className="label">Comprovante (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setComprovanteFile(file)
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (ev) => setComprovantePreview(ev.target?.result as string)
                  reader.readAsDataURL(file)
                } else {
                  setComprovantePreview(editing?.comprovante_url ?? null)
                }
              }}
            />
            {comprovantePreview && (
              <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                <img
                  src={comprovantePreview}
                  alt="Comprovante"
                  style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }}
                  onClick={() => setViewingImage(comprovantePreview)}
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  style={{ position: 'absolute', top: 4, right: 4 }}
                  onClick={() => {
                    setComprovanteFile(null)
                    setComprovantePreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
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
        title="Excluir gasto"
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir o gasto de {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}{' '}
          de {confirmDelete ? formatDateBR(confirmDelete.data) : ''}?
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

      <Modal open={viewingImage !== null} title="Comprovante" onClose={() => setViewingImage(null)}>
        {viewingImage && (
          <img
            src={viewingImage}
            alt="Comprovante"
            style={{ width: '100%', borderRadius: 8 }}
          />
        )}
      </Modal>
    </div>
  )
}
