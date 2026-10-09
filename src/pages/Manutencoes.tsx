import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MANUTENCOES_TIPOS, manutencaoTipoLabel, manutencaoTipoColor } from '../lib/constants'
import { formatCurrency, todayISO, currentMonthISO, formatDateBR, lastDayOfMonthISO, formatMonthBR, sum } from '../lib/utils'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import type { Manutencao, TipoManutencao } from '../types'
import { useLanguage } from '../contexts/LanguageContext'

interface FormState {
  data: string
  tipo: TipoManutencao
  valor: string
  parcelado: boolean
  parcelas: string
  km_total: string
  km_dia: string
  km_mes: string
  descricao: string
}

const emptyForm: FormState = {
  data: todayISO(),
  tipo: 'oleo',
  valor: '',
  parcelado: false,
  parcelas: '',
  km_total: '',
  km_dia: '',
  km_mes: '',
  descricao: '',
}

function formatIntegerBR(digits: string): string {
  const clean = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!clean) return ''
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatValorInput(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d{3})/, '')
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const integer = formatIntegerBR(padded.slice(0, -2)) || '0'
  const cents = padded.slice(-2)
  return `${integer},${cents}`
}

function formatValorFromNumber(value: number): string {
  return formatValorInput(String(Math.round(Number(value) * 100)))
}

function parseValor(text: string): number {
  const normalized = text.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

export default function Manutencoes() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [anoManutencoes, setAnoManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(currentMonthISO())
  const [tipoFilter, setTipoFilter] = useState<'todos' | TipoManutencao>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Manutencao | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Manutencao | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const [year] = month.split('-').map(Number)
    const yearFrom = `${year}-01-01`
    const yearTo = `${year}-12-31`
    const [mes, ano] = await Promise.all([
      supabase
        .from('manutencoes')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', `${month}-01`)
        .lte('data', lastDayOfMonthISO(month))
        .order('data', { ascending: false }),
      supabase
        .from('manutencoes')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', yearFrom)
        .lte('data', yearTo)
        .order('data', { ascending: false }),
    ])
    if (mes.error) setError(mes.error.message)
    else setManutencoes(mes.data ?? [])
    if (ano.error) setError(ano.error.message)
    else setAnoManutencoes(ano.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month])

  const filtered = useMemo(
    () => (tipoFilter === 'todos' ? manutencoes : manutencoes.filter((m) => m.tipo === tipoFilter)),
    [manutencoes, tipoFilter],
  )

  const total = sum(filtered.map((m) => Number(m.valor)))

  const porMes = useMemo(() => {
    const map = new Map<string, { total: number; count: number; items: Manutencao[] }>()
    for (const m of anoManutencoes) {
      const key = m.data.slice(0, 7)
      const entry = map.get(key) ?? { total: 0, count: 0, items: [] }
      entry.total += Number(m.valor)
      entry.count += 1
      entry.items.push(m)
      map.set(key, entry)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, entry]) => ({ key, ...entry, items: entry.items.slice(0, 4) }))
  }, [anoManutencoes])

  const totalAno = sum(anoManutencoes.map((m) => Number(m.valor)))

  const yearLabel = month.slice(0, 4)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(m: Manutencao) {
    setEditing(m)
    setForm({
      data: m.data,
      tipo: m.tipo,
      valor: formatValorFromNumber(Number(m.valor)),
      parcelado: m.parcelado,
      parcelas: m.parcelas != null ? String(m.parcelas) : '',
      km_total: m.km_total != null ? String(m.km_total) : '',
      km_dia: m.km_dia != null ? String(m.km_dia) : '',
      km_mes: m.km_mes != null ? String(m.km_mes) : '',
      descricao: m.descricao ?? '',
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
      data: form.data,
      tipo: form.tipo,
      valor: parseValor(form.valor),
      parcelado: form.parcelado,
      parcelas: form.parcelado && form.parcelas ? Number(form.parcelas) : null,
      km_total: form.km_total ? Number(form.km_total) : null,
      km_dia: form.km_dia ? Number(form.km_dia) : null,
      km_semana: null,
      km_mes: form.km_mes ? Number(form.km_mes) : null,
      descricao: form.descricao.trim() || null,
    }

    const { error: err } = editing
      ? await supabase.from('manutencoes').update(payload).eq('id', editing.id)
      : await supabase.from('manutencoes').insert(payload)

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
    const { error: err } = await supabase.from('manutencoes').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  function parcelamentoInfo(m: Manutencao): string {
    if (!m.parcelado || !m.parcelas) return t('cash')
    const parcela = Number(m.valor) / m.parcelas
    return `${m.parcelas}x de ${formatCurrency(parcela)}`
  }

  function manutencaoTitulo(m: Manutencao): string {
    if (m.tipo === 'outro' && m.descricao) return m.descricao
    return manutencaoTipoLabel(m.tipo)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('maintenance')}</h1>
          <p className="page-subtitle">{t('maintenanceSubtitle')}</p>
        </div>
        <button type="button" className="btn btn-primary btn-large" onClick={openNew}>
          <Plus size={18} />
          {t('registerMaintenance')}
        </button>
      </header>

      <div className="manut-layout">
        <div className="manut-main">
          <section className="card manut-total-card">
            <span>{t('periodTotal')}</span>
            <strong className="text-danger">{formatCurrency(total)}</strong>
            <small>{filtered.length} manutenção(ões)</small>
          </section>

          <div className="card toolbar manut-toolbar">
            <div className="manut-filter-row">
              <div className="form-group">
                <label className="label" htmlFor="month">
                  {t('period')}
                </label>
                <MonthPicker value={month} onChange={setMonth} />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="tipo-filter">
                  {t('type')}
                </label>
                <select
                  id="tipo-filter"
                  className="input"
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as 'todos' | TipoManutencao)}
                >
                  <option value="todos">{t('allPlural')}</option>
                  {MANUTENCOES_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="page-loading">{t('loading')}</div>
          ) : filtered.length > 0 ? (
            <section className="manut-list" aria-label={t('maintenance')}>
              {filtered.map((m) => (
                <article className="card manut-card" key={m.id}>
                  <div className="manut-card-main">
                    <div>
                      <span className="badge" style={{ color: manutencaoTipoColor(m.tipo) }}>
                        {manutencaoTitulo(m)}
                      </span>
                      <strong>{formatCurrency(Number(m.valor))}</strong>
                      <small>{formatDateBR(m.data)} · {parcelamentoInfo(m)}</small>
                      {m.km_total != null && <small>{m.km_total} km do carro</small>}
                      {m.tipo !== 'outro' && m.descricao && <p>{m.descricao}</p>}
                    </div>
                    <div className="manut-card-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>
                        <Pencil size={15} />
                        {t('edit')}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm btn-soft-danger" onClick={() => setConfirmDelete(m)}>
                        <Trash2 size={15} />
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="card manut-historico">
          <h2 className="section-title">{t('yearHistory')}</h2>
          {porMes.length === 0 ? (
            <p className="empty-state small">{t('noMaintenanceYear').replace('{year}', yearLabel)}</p>
          ) : (
            <>
              <p className="historico-ano-total">
                {t('totalInYear').replace('{year}', yearLabel)} <strong>{formatCurrency(totalAno)}</strong>
              </p>
              {porMes.map(({ key, total: totalMes, count, items }) => (
                <div className="hist-mes" key={key}>
                  <div className="hist-mes-head">
                    <strong>{formatMonthBR(key)}</strong>
                    <span>
                      {count} · {formatCurrency(totalMes)}
                    </span>
                  </div>
                  {items.map((m) => (
                    <div className="hist-item" key={m.id}>
                      <span className="badge" style={{ color: manutencaoTipoColor(m.tipo) }}>
                        {manutencaoTitulo(m)}
                      </span>
                      <span className="hist-item-info">
                        <span>{manutencaoTitulo(m)}</span>
                        <span className="hist-item-date">{formatDateBR(m.data)}</span>
                      </span>
                      <strong>{formatCurrency(Number(m.valor))}</strong>
                    </div>
                  ))}
                  {count > items.length && (
                    <p className="hist-mais">+{count - items.length} {t('moreThisMonth')}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </aside>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? t('editMaintenance') : t('newMaintenance')}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-data">
                {t('date')}
              </label>
              <input
                id="manut-data"
                className="input"
                type="date"
                required
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="manut-tipo">
                {t('type')}
              </label>
              <select
                id="manut-tipo"
                className="input"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoManutencao })}
              >
                {MANUTENCOES_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value === 'outro' ? 'Outro (escrever)' : t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.tipo === 'outro' && (
            <div className="form-group">
              <label className="label" htmlFor="manut-tipo-custom">
                {t('writeMaintenanceType')}
              </label>
              <input
                id="manut-tipo-custom"
                className="input"
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Freio, suspensão, correia..."
                required
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-valor">
                {t('receivedValue')}
              </label>
              <input
                id="manut-valor"
                className="input"
                type="text"
                inputMode="decimal"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: formatValorInput(e.target.value) })}
                placeholder="0,00"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="manut-km-total">
                {t('carTotalKm')}
              </label>
              <input
                id="manut-km-total"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_total}
                onChange={(e) => setForm({ ...form, km_total: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-km-dia">
                {t('dayKm')}
              </label>
              <input
                id="manut-km-dia"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_dia}
                onChange={(e) => setForm({ ...form, km_dia: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="manut-km-mes">
                {t('monthKm')}
              </label>
              <input
                id="manut-km-mes"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_mes}
                onChange={(e) => setForm({ ...form, km_mes: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.parcelado}
                onChange={(e) => setForm({ ...form, parcelado: e.target.checked })}
              />
              {t('paidInInstallments')}
            </label>
          </div>

          {form.parcelado && (
            <div className="form-group">
              <label className="label" htmlFor="manut-parcelas">
                {t('installmentsCount')}
              </label>
              <input
                id="manut-parcelas"
                className="input"
                type="number"
                step="1"
                min="1"
                required
                value={form.parcelas}
                onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
                placeholder="Ex.: 3"
              />
            </div>
          )}

          {form.tipo !== 'outro' && (
            <div className="form-group">
              <label className="label" htmlFor="manut-descricao">
                {t('description')}
              </label>
              <input
                id="manut-descricao"
                className="input"
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: troca dos 4 pneus, óleo sintético..."
              />
            </div>
          )}

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
        title={t('deleteMaintenance')}
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir a manutenção de{' '}
          {confirmDelete ? manutencaoTitulo(confirmDelete) : ''} no valor de{' '}
          {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}?
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
