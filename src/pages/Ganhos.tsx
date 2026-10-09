import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Wallet, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATAFORMAS, plataformaLabel } from '../lib/constants'
import {
  formatCurrency,
  todayISO,
  currentMonthISO,
  formatDateBR,
  formatMonthBR,
  lastDayOfMonthISO,
  sum,
  isoToDate,
  startOfWeek,
  addDays,
  toISODate,
  horasToText,
  textToHoras,
} from '../lib/utils'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import type { Ganho, Plataforma } from '../types'
import { useLanguage } from '../contexts/LanguageContext'

interface FormState {
  data: string
  plataforma: Plataforma
  valor: string
  corridas: string
  horas: string
  km: string
  descricao: string
}

const emptyForm: FormState = { data: todayISO(), plataforma: 'uber', valor: '', corridas: '', horas: '', km: '', descricao: '' }

type Periodo = 'mes' | 'semana'

const quickPlatforms: { value: Plataforma; label: string; short: string }[] = [
  { value: 'uber', label: 'Uber', short: 'U' },
  { value: '99', label: '99', short: '99' },
  { value: 'outra', label: 'Outra', short: 'O' },
]

function parseValor(text: string): number {
  const normalized = text.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
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

function completeValorInput(text: string): string {
  return formatValorInput(text)
}

function formatHorasInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  const padded = digits.padStart(4, '0')
  return `${padded.slice(0, -2)}:${padded.slice(-2)}`
}

export default function Ganhos() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [ganhosHoje, setGanhosHoje] = useState<Ganho[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [month, setMonth] = useState(currentMonthISO())
  const [weekDay, setWeekDay] = useState(todayISO())
  const [plataformaFilter, setPlataformaFilter] = useState<'todas' | Plataforma>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ganho | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickDate, setQuickDate] = useState(todayISO())
  const [quickKm, setQuickKm] = useState('')
  const [quickHoras, setQuickHoras] = useState('')
  const [quickValues, setQuickValues] = useState<Record<Plataforma, string>>({ uber: '', '99': '', outra: '' })
  const [saving, setSaving] = useState(false)
  const [quickSaving, setQuickSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [expandedGanhoId, setExpandedGanhoId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Ganho | null>(null)

  const range = useMemo(() => {
    if (periodo === 'mes') {
      return { from: `${month}-01`, to: lastDayOfMonthISO(month), label: formatMonthBR(month) }
    }
    const start = startOfWeek(isoToDate(weekDay))
    const end = addDays(start, 6)
    return {
      from: toISODate(start),
      to: toISODate(end),
      label: `${t('weekRange')} ${formatDateBR(toISODate(start))} ${t('to')} ${formatDateBR(toISODate(end))}`,
    }
  }, [periodo, month, weekDay, t])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [periodoResult, hojeResult] = await Promise.all([
      supabase
        .from('ganhos')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', range.from)
        .lte('data', range.to)
        .order('data', { ascending: false }),
      supabase
        .from('ganhos')
        .select('*')
        .eq('user_id', user.id)
        .eq('data', todayISO())
        .order('data', { ascending: false }),
    ])
    if (periodoResult.error) setError(periodoResult.error.message)
    else setGanhos(periodoResult.data ?? [])
    if (hojeResult.error) setError(hojeResult.error.message)
    else setGanhosHoje(hojeResult.data ?? [])
    setLoading(false)
  }, [user, range.from, range.to])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () => (plataformaFilter === 'todas' ? ganhos : ganhos.filter((g) => g.plataforma === plataformaFilter)),
    [ganhos, plataformaFilter],
  )

  const ganhosHojeFiltrados = plataformaFilter === 'todas' ? ganhosHoje : ganhosHoje.filter((g) => g.plataforma === plataformaFilter)
  const totalHoje = sum(ganhosHojeFiltrados.map((g) => Number(g.valor)))
  const totalCorridasHoje = sum(ganhosHojeFiltrados.map((g) => Number(g.corridas ?? 0)))
  const totalKmHoje = sum(ganhosHojeFiltrados.map((g) => Number(g.km ?? 0)))
  const totalHorasHoje = sum(ganhosHojeFiltrados.map((g) => Number(g.horas_trabalhadas ?? 0)))

  function shiftWeek(days: number) {
    const d = isoToDate(weekDay)
    d.setDate(d.getDate() + days)
    setWeekDay(toISODate(d))
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(ganho: Ganho) {
    setEditing(ganho)
    setForm({
      data: ganho.data,
      plataforma: ganho.plataforma,
      valor: formatValorInput(String(Math.round(Number(ganho.valor) * 100))),
      corridas: ganho.corridas != null ? String(ganho.corridas) : '',
      horas: ganho.horas_trabalhadas != null ? horasToText(ganho.horas_trabalhadas) : '',
      km: ganho.km != null ? String(ganho.km) : '',
      descricao: ganho.descricao ?? '',
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
      plataforma: form.plataforma,
      valor: parseValor(form.valor),
      corridas: form.corridas ? Number(form.corridas) : null,
      horas_trabalhadas: textToHoras(form.horas),
      km: form.km ? Number(form.km) : null,
      descricao: form.descricao.trim() || null,
    }

    const { error: err } = editing
      ? await supabase.from('ganhos').update(payload).eq('id', editing.id)
      : await supabase.from('ganhos').insert(payload)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setModalOpen(false)
    load()
  }

  async function handleQuickSave() {
    if (!user) return
    const payload = quickPlatforms
      .map((platform) => ({
        user_id: user.id,
        data: quickDate,
        plataforma: platform.value,
        valor: parseValor(quickValues[platform.value]),
        corridas: null,
        horas_trabalhadas: textToHoras(quickHoras),
        km: quickKm ? Number(quickKm.replace(',', '.')) : null,
        descricao: null,
      }))
      .filter((item) => item.valor > 0)

    if (payload.length === 0) {
      setError('Digite pelo menos um valor para salvar.')
      setSuccess('')
      return
    }

    setQuickSaving(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase.from('ganhos').insert(payload)
    setQuickSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    setQuickValues({ uber: '', '99': '', outra: '' })
    setQuickKm('')
    setQuickHoras('')
    setSuccess('Ganhos salvos com sucesso.')
    setQuickOpen(false)
    load()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const { error: err } = await supabase.from('ganhos').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="page">
      <header className="page-header ganhos-page-header">
        <div>
          <h1>{t('receipts')}</h1>
          <p className="page-subtitle">{t('typePlatformValues')}</p>
        </div>
        <button type="button" className="btn btn-primary btn-large" onClick={() => setQuickOpen(true)}>
          <Plus size={18} />
          {t('registerEarning')}
        </button>
      </header>

      {quickOpen && (
        <section className="card ganhos-mobile-entry">
          <button type="button" className="icon-btn ganhos-entry-close" onClick={() => setQuickOpen(false)} aria-label={t('closeMenu')}>
            <X size={20} />
          </button>
          <div className="ganhos-entry-head">
            <div>
              <h2>{t('launchReceipts')}</h2>
              <p>{t('quickSaveToday')}</p>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="quick-date">
                {t('day')}
              </label>
              <input
                id="quick-date"
                className="input"
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
              />
            </div>
          </div>

          <div className="quick-extra-grid">
            <div className="form-group">
              <label className="label" htmlFor="quick-km">
                {t('kmToday')}
              </label>
              <input
                id="quick-km"
                className="input quick-extra-input"
                type="text"
                inputMode="decimal"
                value={quickKm}
                onChange={(e) => setQuickKm(e.target.value.replace(/[^\d,.]/g, '').replace('.', ','))}
                placeholder="Ex.: 120"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="quick-horas">
                {t('workedHours')}
              </label>
              <input
                id="quick-horas"
                className="input quick-extra-input"
                type="text"
                inputMode="decimal"
                value={quickHoras}
                onChange={(e) => setQuickHoras(formatHorasInput(e.target.value))}
                placeholder="Ex.: 10:30"
              />
            </div>
          </div>

          <div className="quick-platform-list">
            {quickPlatforms.map((platform) => (
              <label className="quick-platform-row" key={platform.value}>
                <span className={`quick-platform-icon platform-${platform.value}`}>{platform.short}</span>
                <span className="quick-platform-name">{platform.label}</span>
                <span className="quick-money-prefix">R$</span>
                <input
                  className="quick-money-input"
                  type="text"
                  inputMode="decimal"
                  value={quickValues[platform.value]}
                  onChange={(e) => setQuickValues({ ...quickValues, [platform.value]: formatValorInput(e.target.value) })}
                  onBlur={() =>
                    setQuickValues((values) => ({
                      ...values,
                      [platform.value]: completeValorInput(values[platform.value]),
                    }))
                  }
                  placeholder="0,00"
                  aria-label={`Valor recebido no ${platform.label}`}
                />
                <Pencil size={18} className="quick-edit-icon" />
              </label>
            ))}
          </div>

          <button type="button" className="btn ganhos-save-btn" onClick={handleQuickSave} disabled={quickSaving}>
            <Save size={18} />
            {quickSaving ? t('saving') : t('save')}
          </button>
        </section>
      )}

      <section className="ganhos-summary">
        <div className="card ganho-total-card">
          <span className="ganho-total-label">{t('received')} {t('today').toLowerCase()}</span>
          <strong>{formatCurrency(totalHoje)}</strong>
          <span>{formatDateBR(todayISO())}</span>
        </div>
        <div className="card ganho-mini-card">
          <span>{t('rides')}</span>
          <strong>{totalCorridasHoje || '—'}</strong>
        </div>
        <div className="card ganho-mini-card">
          <span>{t('drivenKm')}</span>
          <strong>{totalKmHoje ? `${totalKmHoje} km` : '—'}</strong>
        </div>
        <div className="card ganho-mini-card">
          <span>{t('hours')}</span>
          <strong>{totalHorasHoje ? `${horasToText(totalHorasHoje)} h` : '—'}</strong>
        </div>
      </section>

      <div className="card toolbar ganhos-toolbar">
        <div className="ganhos-filter-grid">
          <div className="form-group ganhos-periodo">
            <label className="label">{t('viewBy')}</label>
            <div className="period-tabs">
              <button
                type="button"
                className={periodo === 'mes' ? 'tab active' : 'tab'}
                onClick={() => setPeriodo('mes')}
              >
                {t('month')}
              </button>
              <button
                type="button"
                className={periodo === 'semana' ? 'tab active' : 'tab'}
                onClick={() => setPeriodo('semana')}
              >
                {t('week')}
              </button>
            </div>
          </div>

          <div className="ganhos-filter-panel">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setPeriodo('mes')
                setMonth(currentMonthISO())
                setWeekDay(todayISO())
              }}
            >
              {t('backToToday')}
            </button>
            {periodo === 'mes' ? (
              <div className="form-group">
                <label className="label" htmlFor="month">
                  {t('chooseMonth')}
                </label>
                <MonthPicker value={month} onChange={setMonth} />
              </div>
            ) : (
              <div className="week-nav ganhos-week-nav">
                <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(-7)} aria-label={t('previousWeek')}>
                  <ChevronLeft size={18} />
                </button>
                <div className="form-group">
                  <label className="label" htmlFor="week-day">
                    {t('chooseWeekDay')}
                  </label>
                  <input
                    id="week-day"
                    className="input"
                    type="date"
                    value={weekDay}
                    onChange={(e) => setWeekDay(e.target.value)}
                  />
                </div>
                <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(7)} aria-label={t('nextWeek')}>
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="plataforma-filter">
                {t('showPlatform')}
              </label>
              <select
                id="plataforma-filter"
                className="input"
                value={plataformaFilter}
                onChange={(e) => setPlataformaFilter(e.target.value as 'todas' | Plataforma)}
              >
                <option value="todas">{t('allPlatforms')}</option>
                {PLATAFORMAS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {success && <div className="alert alert-info">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={32} />
          <p>{t('noEarningsPeriod')}</p>
          <p className="stat-sub">{t('tapToAddFirstEarning')}</p>
          <button type="button" className="btn btn-primary btn-large" onClick={openNew}>
            <Plus size={16} />
            {t('registerEarning')}
          </button>
        </div>
      ) : (
        <section className="ganhos-list" aria-label="Ganhos registrados">
          {filtered.map((g) => {
            const expanded = expandedGanhoId === g.id
            return (
              <article className="card ganho-card compact" key={g.id}>
                <div className="ganho-card-main compact">
                  <div className="ganho-card-summary">
                    <span className="badge">{plataformaLabel(g.plataforma)}</span>
                    <strong>{formatCurrency(Number(g.valor))}</strong>
                    <span>{formatDateBR(g.data)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedGanhoId(expanded ? null : g.id)}
                  >
                    {expanded ? t('hide') : t('details')}
                  </button>
                </div>

                {expanded && (
                  <div className="ganho-card-expanded">
                    <div className="ganho-card-details">
                      <span>
                        <strong>{g.corridas ?? '—'}</strong>
                        {t('rides')}
                      </span>
                      <span>
                        <strong>{g.km != null ? `${g.km} km` : '—'}</strong>
                        Km
                      </span>
                      <span>
                        <strong>{g.horas_trabalhadas != null ? `${horasToText(g.horas_trabalhadas)} h` : '—'}</strong>
                        {t('hours')}
                      </span>
                    </div>

                    {g.descricao && <p className="ganho-card-note">{g.descricao}</p>}

                    <div className="ganho-card-actions">
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
                )}
              </article>
            )
          })}
        </section>
      )}

      <Modal open={modalOpen} title={editing ? t('editEarning') : t('registerEarning')} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="ganho-form">
          <p className="modal-help">{t('fillEarningHelp')}</p>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="ganho-valor">
                {t('receivedValue')}
              </label>
              <input
                id="ganho-valor"
                className="input input-large"
                type="text"
                inputMode="decimal"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: formatValorInput(e.target.value) })}
                onBlur={() => setForm((current) => ({ ...current, valor: completeValorInput(current.valor) }))}
                placeholder="Ex.: 150,00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
            <label className="label" htmlFor="ganho-data">
              {t('earningDay')}
            </label>
            <input
              id="ganho-data"
              className="input"
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>
            <div className="form-group">
            <label className="label" htmlFor="ganho-plataforma">
              {t('usedPlatform')}
            </label>
            <select
              id="ganho-plataforma"
              className="input"
              value={form.plataforma}
              onChange={(e) => setForm({ ...form, plataforma: e.target.value as Plataforma })}
            >
              {PLATAFORMAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="ganho-corridas">
                {t('howManyRides')}
              </label>
              <input
                id="ganho-corridas"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.corridas}
                onChange={(e) => setForm({ ...form, corridas: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ganho-km">
                {t('drivenKm')}
              </label>
              <input
                id="ganho-km"
                className="input"
                type="number"
                step="0.1"
                min="0"
                value={form.km}
                onChange={(e) => setForm({ ...form, km: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ganho-horas">
                {t('workedHours')}
              </label>
              <input
                id="ganho-horas"
                className="input"
                type="text"
                inputMode="decimal"
                value={form.horas}
                onChange={(e) => setForm({ ...form, horas: formatHorasInput(e.target.value) })}
                placeholder="Ex.: 8:30"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="ganho-descricao">
              {t('observation')}
            </label>
            <input
              id="ganho-descricao"
              className="input"
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: dia bom, chuva, bônus..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
              {saving ? t('saving') : t('saveEarning')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmDelete !== null} title={t('deleteEarning')} onClose={() => setConfirmDelete(null)}>
        <p className="modal-text">
          Tem certeza que deseja excluir o ganho de {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}{' '}
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
    </div>
  )
}
