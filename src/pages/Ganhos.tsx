import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function Ganhos() {
  const { user } = useAuth()
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [month, setMonth] = useState(currentMonthISO())
  const [weekDay, setWeekDay] = useState(todayISO())
  const [plataformaFilter, setPlataformaFilter] = useState<'todas' | Plataforma>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ganho | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
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
      label: `Semana de ${formatDateBR(toISODate(start))} a ${formatDateBR(toISODate(end))}`,
    }
  }, [periodo, month, weekDay])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('ganhos')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', range.from)
      .lte('data', range.to)
      .order('data', { ascending: false })
    if (err) setError(err.message)
    else setGanhos(data ?? [])
    setLoading(false)
  }, [user, range.from, range.to])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () => (plataformaFilter === 'todas' ? ganhos : ganhos.filter((g) => g.plataforma === plataformaFilter)),
    [ganhos, plataformaFilter],
  )

  const total = sum(filtered.map((g) => Number(g.valor)))

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
      valor: String(ganho.valor),
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
      valor: Number(form.valor),
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

  async function handleDelete() {
    if (!confirmDelete) return
    const { error: err } = await supabase.from('ganhos').delete().eq('id', confirmDelete.id)
    if (err) setError(err.message)
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Ganhos</h1>
          <p className="page-subtitle">Registre os valores recebidos em cada plataforma</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Novo ganho
        </button>
      </header>

      <div className="card toolbar">
        <div className="toolbar-filters">
          <div className="period-tabs">
            <button
              type="button"
              className={periodo === 'mes' ? 'tab active' : 'tab'}
              onClick={() => setPeriodo('mes')}
            >
              Mês
            </button>
            <button
              type="button"
              className={periodo === 'semana' ? 'tab active' : 'tab'}
              onClick={() => setPeriodo('semana')}
            >
              Semana
            </button>
          </div>

          {periodo === 'mes' ? (
            <div className="form-group">
              <label className="label" htmlFor="month">
                Período
              </label>
              <MonthPicker value={month} onChange={setMonth} />
            </div>
          ) : (
            <div className="week-nav">
              <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(-7)} aria-label="Semana anterior">
                <ChevronLeft size={18} />
              </button>
              <div className="form-group">
                <label className="label" htmlFor="week-day">
                  Dia de referência
                </label>
                <input
                  id="week-day"
                  className="input"
                  type="date"
                  value={weekDay}
                  onChange={(e) => setWeekDay(e.target.value)}
                />
              </div>
              <button type="button" className="icon-btn week-arrow" onClick={() => shiftWeek(7)} aria-label="Próxima semana">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="label" htmlFor="plataforma-filter">
              Plataforma
            </label>
            <select
              id="plataforma-filter"
              className="input"
              value={plataformaFilter}
              onChange={(e) => setPlataformaFilter(e.target.value as 'todas' | Plataforma)}
            >
              <option value="todas">Todas</option>
              {PLATAFORMAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-total">
          <span>Total do período</span>
          <strong>{formatCurrency(total)}</strong>
          <span className="toolbar-label">{range.label}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={32} />
          <p>Nenhum ganho registrado neste período.</p>
          <button type="button" className="btn btn-secondary" onClick={openNew}>
            <Plus size={16} />
            Registrar ganho
          </button>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Plataforma</th>
                  <th>Corridas</th>
                  <th>Km</th>
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
                      <span className="badge">{plataformaLabel(g.plataforma)}</span>
                    </td>
                    <td>{g.corridas ?? '—'}</td>
                    <td>{g.km != null ? `${g.km} km` : '—'}</td>
                    <td className="cell-muted">{g.descricao || '—'}</td>
                    <td className="align-right text-success">{formatCurrency(Number(g.valor))}</td>
                    <td className="align-right">
                      <div className="row-actions">
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
                  <td colSpan={5}>Total</td>
                  <td className="align-right text-success">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar ganho' : 'Novo ganho'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="ganho-data">
              Data
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
              Plataforma
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
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="ganho-valor">
                Valor (R$)
              </label>
              <input
                id="ganho-valor"
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
              <label className="label" htmlFor="ganho-corridas">
                Corridas
              </label>
              <input
                id="ganho-corridas"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.corridas}
                onChange={(e) => setForm({ ...form, corridas: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ganho-km">
                Km rodados
              </label>
              <input
                id="ganho-km"
                className="input"
                type="number"
                step="0.1"
                min="0"
                value={form.km}
                onChange={(e) => setForm({ ...form, km: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ganho-horas">
                Horas trabalhadas
              </label>
              <input
                id="ganho-horas"
                className="input"
                type="text"
                inputMode="decimal"
                value={form.horas}
                onChange={(e) => setForm({ ...form, horas: e.target.value })}
                placeholder="Ex.: 8 ou 8:30"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="ganho-descricao">
              Descrição
            </label>
            <input
              id="ganho-descricao"
              className="input"
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: dia corrido, dinheiro de volta..."
            />
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

      <Modal open={confirmDelete !== null} title="Excluir ganho" onClose={() => setConfirmDelete(null)}>
        <p className="modal-text">
          Tem certeza que deseja excluir o ganho de {confirmDelete ? formatCurrency(Number(confirmDelete.valor)) : ''}{' '}
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
    </div>
  )
}
