import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MANUTENCOES_TIPOS, manutencaoTipoLabel, manutencaoTipoColor } from '../lib/constants'
import { formatCurrency, todayISO, currentMonthISO, formatDateBR, lastDayOfMonthISO, formatMonthBR, sum } from '../lib/utils'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import type { Manutencao, TipoManutencao } from '../types'

interface FormState {
  data: string
  tipo: TipoManutencao
  valor: string
  parcelado: boolean
  parcelas: string
  km_total: string
  km_dia: string
  km_semana: string
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
  km_semana: '',
  km_mes: '',
  descricao: '',
}

export default function Manutencoes() {
  const { user } = useAuth()
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
      valor: String(m.valor),
      parcelado: m.parcelado,
      parcelas: m.parcelas != null ? String(m.parcelas) : '',
      km_total: m.km_total != null ? String(m.km_total) : '',
      km_dia: m.km_dia != null ? String(m.km_dia) : '',
      km_semana: m.km_semana != null ? String(m.km_semana) : '',
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
      valor: Number(form.valor),
      parcelado: form.parcelado,
      parcelas: form.parcelado && form.parcelas ? Number(form.parcelas) : null,
      km_total: form.km_total ? Number(form.km_total) : null,
      km_dia: form.km_dia ? Number(form.km_dia) : null,
      km_semana: form.km_semana ? Number(form.km_semana) : null,
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
    if (!m.parcelado || !m.parcelas) return 'À vista'
    const parcela = Number(m.valor) / m.parcelas
    return `${m.parcelas}x de ${formatCurrency(parcela)}`
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Manutenções</h1>
          <p className="page-subtitle">Registre as manutenções do carro: pneus, óleo, bateria, limpeza e mais</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Nova manutenção
        </button>
      </header>

      <div className="manut-layout">
        <div className="manut-main">
          <div className="card toolbar">
            <div className="toolbar-filters">
              <div className="form-group">
                <label className="label" htmlFor="month">
                  Período
                </label>
                <MonthPicker value={month} onChange={setMonth} />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="tipo-filter">
                  Tipo
                </label>
                <select
                  id="tipo-filter"
                  className="input"
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as 'todos' | TipoManutencao)}
                >
                  <option value="todos">Todos</option>
                  {MANUTENCOES_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="toolbar-total">
              <span>Total do período</span>
              <strong>{formatCurrency(total)}</strong>
              <span className="toolbar-label">{filtered.length} manutenção(ões)</span>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="page-loading">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <Wrench size={32} />
              <p>Nenhuma manutenção registrada neste período.</p>
              <button type="button" className="btn btn-secondary" onClick={openNew}>
                <Plus size={16} />
                Registrar manutenção
              </button>
            </div>
          ) : (
            <div className="card table-card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Pagamento</th>
                      <th className="align-right">Km</th>
                      <th className="align-right">Valor</th>
                      <th className="align-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.id}>
                        <td>{formatDateBR(m.data)}</td>
                        <td>
                          <span className="badge" style={{ color: manutencaoTipoColor(m.tipo) }}>
                            {manutencaoTipoLabel(m.tipo)}
                          </span>
                        </td>
                        <td className="cell-muted">{m.descricao || '—'}</td>
                        <td className="cell-muted">{parcelamentoInfo(m)}</td>
                        <td className="align-right cell-muted">{m.km_total != null ? `${m.km_total} km` : '—'}</td>
                        <td className="align-right text-danger">{formatCurrency(Number(m.valor))}</td>
                        <td className="align-right">
                          <div className="row-actions">
                            <button type="button" className="icon-btn" onClick={() => openEdit(m)} aria-label="Editar">
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setConfirmDelete(m)}
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
                      <td className="align-right text-danger">{formatCurrency(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="card manut-historico">
          <h2 className="section-title">Histórico do ano</h2>
          {porMes.length === 0 ? (
            <p className="empty-state small">Nenhuma manutenção registrada em {yearLabel}.</p>
          ) : (
            <>
              <p className="historico-ano-total">
                Total em {yearLabel}: <strong>{formatCurrency(totalAno)}</strong>
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
                        {manutencaoTipoLabel(m.tipo)}
                      </span>
                      <span className="hist-item-info">
                        <span>{m.descricao || formatDateBR(m.data)}</span>
                        <span className="hist-item-date">{formatDateBR(m.data)}</span>
                      </span>
                      <strong>{formatCurrency(Number(m.valor))}</strong>
                    </div>
                  ))}
                  {count > items.length && (
                    <p className="hist-mais">+{count - items.length} mais neste mês</p>
                  )}
                </div>
              ))}
            </>
          )}
        </aside>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar manutenção' : 'Nova manutenção'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-data">
                Data
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
                Tipo
              </label>
              <select
                id="manut-tipo"
                className="input"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoManutencao })}
              >
                {MANUTENCOES_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-valor">
                Valor (R$)
              </label>
              <input
                id="manut-valor"
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
              <label className="label" htmlFor="manut-km-total">
                Km total do carro
              </label>
              <input
                id="manut-km-total"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_total}
                onChange={(e) => setForm({ ...form, km_total: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="manut-km-dia">
                Km do dia
              </label>
              <input
                id="manut-km-dia"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_dia}
                onChange={(e) => setForm({ ...form, km_dia: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="manut-km-semana">
                Km da semana
              </label>
              <input
                id="manut-km-semana"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_semana}
                onChange={(e) => setForm({ ...form, km_semana: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="manut-km-mes">
                Km do mês
              </label>
              <input
                id="manut-km-mes"
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.km_mes}
                onChange={(e) => setForm({ ...form, km_mes: e.target.value })}
                placeholder="Opcional"
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
              Foi parcelado
            </label>
          </div>

          {form.parcelado && (
            <div className="form-group">
              <label className="label" htmlFor="manut-parcelas">
                Em quantas vezes
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

          <div className="form-group">
            <label className="label" htmlFor="manut-descricao">
              Descrição
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
        title="Excluir manutenção"
        onClose={() => setConfirmDelete(null)}
      >
        <p className="modal-text">
          Tem certeza que deseja excluir a manutenção de{' '}
          {confirmDelete ? manutencaoTipoLabel(confirmDelete.tipo) : ''} no valor de{' '}
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
