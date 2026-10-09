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
import { useLanguage } from '../contexts/LanguageContext'

interface FormState {
  data: string
  categoria: CategoriaGasto
  valor: string
  descricao: string
}

const emptyForm: FormState = { data: todayISO(), categoria: 'combustivel', valor: '', descricao: '' }

export default function Gastos() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const fixas = useDespesasFixas()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(currentMonthISO())
  const [todosMeses, setTodosMeses] = useState(false)
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
    let query = supabase
      .from('gastos')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
    if (!todosMeses) {
      query = query
        .gte('data', `${month}-01`)
        .lte('data', lastDayOfMonthISO(month))
    }
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setGastos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month, todosMeses])

  const filtered = useMemo(
    () => (categoriaFilter === 'todas' ? gastos : gastos.filter((g) => g.categoria === categoriaFilter)),
    [gastos, categoriaFilter],
  )

  const fixoPorCategoria = useMemo(() => {
    if (todosMeses) return {}
    return totalFixoPorCategoria(fixas, `${month}-01`, lastDayOfMonthISO(month))
  }, [fixas, month, todosMeses])

  const fixoTotal = useMemo(() => {
    if (todosMeses) return 0
    if (categoriaFilter === 'todas') return totalFixo(fixas, `${month}-01`, lastDayOfMonthISO(month))
    return fixoPorCategoria[categoriaFilter] ?? 0
  }, [fixas, month, categoriaFilter, fixoPorCategoria, todosMeses])

  const total = sum(filtered.map((g) => Number(g.valor))) + fixoTotal

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
          <h1>{t('expenses')}</h1>
          <p className="page-subtitle">{t('expenseSubtitle')}</p>
        </div>
        <button type="button" className="btn btn-primary btn-large" onClick={openNew}>
          <Plus size={18} />
          {t('registerExpense')}
        </button>
      </header>

      <section className="card gastos-total-card">
        <span>{todosMeses ? t('totalGeneral') : t('totalMonth')}</span>
        <strong className="text-danger">{formatCurrency(total)}</strong>
        {!todosMeses && fixoTotal > 0 && <small>{t('includesFixedExpenses').replace('{value}', formatCurrency(fixoTotal))}</small>}
      </section>

      <div className="card toolbar gastos-toolbar">
        <div className="gastos-filter-row">
          <div className="form-group">
            <label className="label" htmlFor="month">
              {t('period')}
            </label>
            {!todosMeses ? (
              <MonthPicker value={month} onChange={setMonth} />
            ) : (
              <input className="input" type="text" value={t('allMonths')} disabled />
            )}
          </div>
          <div className="form-group">
            <label className="label">&nbsp;</label>
            <button
              type="button"
              className={`btn ${todosMeses ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTodosMeses(!todosMeses)}
            >
              {todosMeses ? t('filterMonth') : t('everything')}
            </button>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="categoria-filter">
              {t('category')}
            </label>
            <select
              id="categoria-filter"
              className="input"
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value as 'todas' | CategoriaGasto)}
            >
              <option value="todas">{t('all')}</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Receipt size={32} />
          <p>{t('noExpensesPeriod')}</p>
          <button type="button" className="btn btn-secondary" onClick={openNew}>
            <Plus size={16} />
            {t('registerExpense')}
          </button>
        </div>
      ) : (
        <section className="gastos-list" aria-label="Gastos registrados">
          {filtered.map((g) => (
            <article className="card gasto-card" key={g.id}>
              <div className="gasto-card-main">
                <div>
                  <span className="badge" style={{ color: categoriaColor(g.categoria) }}>
                    {categoriaLabel(g.categoria)}
                  </span>
                  <strong>{formatCurrency(Number(g.valor))}</strong>
                  <small>{formatDateBR(g.data)}</small>
                  {g.descricao && <p>{g.descricao}</p>}
                </div>
                <div className="gasto-card-actions">
                  {g.comprovante_url && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingImage(g.comprovante_url!)}>
                      <Image size={15} />
                      {t('view')}
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}>
                    <Pencil size={15} />
                    {t('edit')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm btn-soft-danger" onClick={() => setConfirmDelete(g)}>
                    <Trash2 size={15} />
                    {t('delete')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <Modal open={modalOpen} title={editing ? t('editExpense') : t('newExpense')} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="gasto-data">
              {t('date')}
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
              {t('category')}
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
                {t('expenseName')}
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
              {t('receivedValue')}
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
              {t('description')}
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
            <label className="label">{t('receiptOptional')}</label>
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
                  alt={t('receipt')}
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
        title={t('deleteExpense')}
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir o gasto de {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}{' '}
          de {confirmDelete ? formatDateBR(confirmDelete.data) : ''}?
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

      <Modal open={viewingImage !== null} title={t('receipt')} onClose={() => setViewingImage(null)}>
        {viewingImage && (
          <img
            src={viewingImage}
            alt={t('receipt')}
            style={{ width: '100%', borderRadius: 8 }}
          />
        )}
      </Modal>
    </div>
  )
}
