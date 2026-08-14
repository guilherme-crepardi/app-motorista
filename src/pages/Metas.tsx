import { useEffect, useMemo, useState } from 'react'
import { Save, Target } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  formatCurrency,
  todayISO,
  startOfWeek,
  startOfMonth,
  toISODate,
  clampPercent,
  sum,
} from '../lib/utils'
import type { Ganho, Meta, TipoMeta } from '../types'

const META_CONFIGS: { tipo: TipoMeta; titulo: string; descricao: string }[] = [
  { tipo: 'diaria', titulo: 'Meta diária', descricao: 'Quanto você quer ganhar por dia' },
  { tipo: 'semanal', titulo: 'Meta semanal', descricao: 'Quanto você quer ganhar na semana' },
  { tipo: 'mensal', titulo: 'Meta mensal', descricao: 'Quanto você quer ganhar no mês' },
]

export default function Metas() {
  const { user } = useAuth()
  const [ganhos, setGanhos] = useState<Ganho[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [values, setValues] = useState<Record<TipoMeta, string>>({ diaria: '', semanal: '', mensal: '' })
  const [saving, setSaving] = useState<TipoMeta | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const monthStart = toISODate(startOfMonth(new Date()))
    Promise.all([
      supabase.from('ganhos').select('*').eq('user_id', user.id).gte('data', monthStart),
      supabase.from('metas').select('*').eq('user_id', user.id),
    ]).then(([g, m]) => {
      if (!g.error) setGanhos(g.data ?? [])
      if (!m.error) {
        setMetas(m.data ?? [])
        const next = { diaria: '', semanal: '', mensal: '' }
        ;(m.data ?? []).forEach((meta: Meta) => {
          next[meta.tipo] = String(meta.valor)
        })
        setValues(next)
      }
    })
  }, [user])

  const periodInfo = useMemo(() => {
    const hoje = todayISO()
    const semanaInicio = toISODate(startOfWeek(new Date()))
    const mesInicio = toISODate(startOfMonth(new Date()))
    const ganhosDiarios = sum(ganhos.filter((g) => g.data === hoje).map((g) => Number(g.valor)))
    const ganhosSemanais = sum(ganhos.filter((g) => g.data >= semanaInicio).map((g) => Number(g.valor)))
    const ganhosMensais = sum(ganhos.filter((g) => g.data >= mesInicio).map((g) => Number(g.valor)))
    return { diaria: ganhosDiarios, semanal: ganhosSemanais, mensal: ganhosMensais }
  }, [ganhos])

  const metaValor = (tipo: TipoMeta): number => metas.find((m) => m.tipo === tipo)?.valor ?? 0

  function handleValueChange(tipo: TipoMeta, value: string) {
    if (tipo === 'diaria') {
      const d = Number(value)
      if (d > 0) {
        setValues({
          diaria: value,
          semanal: String(Math.round(d * 7 * 100) / 100),
          mensal: String(Math.round(d * 31 * 100) / 100),
        })
        return
      }
    }
    setValues((prev) => ({ ...prev, [tipo]: value }))
  }

  async function upsertMeta(tipo: TipoMeta, valor: number) {
    if (!user) return null
    const { data: existing } = await supabase
      .from('metas')
      .select('id')
      .eq('user_id', user.id)
      .eq('tipo', tipo)
      .maybeSingle()

    if (existing) {
      return (await supabase.from('metas').update({ valor }).eq('id', existing.id)).error
    }
    return (await supabase.from('metas').insert({ user_id: user.id, tipo, valor })).error
  }

  async function saveMeta(tipo: TipoMeta) {
    if (!user) return
    const valor = Number(values[tipo])
    if (!valor || valor <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setSaving(tipo)
    setError('')
    setMessage('')

    let err: Error | null = null

    if (tipo === 'diaria') {
      const semanal = Math.round(valor * 7 * 100) / 100
      const mensal = Math.round(valor * 31 * 100) / 100
      setValues({ diaria: String(valor), semanal: String(semanal), mensal: String(mensal) })
      err = await upsertMeta('diaria', valor)
      if (!err) err = await upsertMeta('semanal', semanal)
      if (!err) err = await upsertMeta('mensal', mensal)
    } else {
      err = await upsertMeta(tipo, valor)
    }

    setSaving(null)
    if (err) {
      setError(err.message)
      return
    }

    const { data: reloaded } = await supabase.from('metas').select('*').eq('user_id', user.id)
    if (reloaded) setMetas(reloaded)
    setMessage(`${META_CONFIGS.find((c) => c.tipo === tipo)?.titulo} salva com sucesso!`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Metas</h1>
          <p className="page-subtitle">Defina suas metas de ganho diária, semanal e mensal</p>
        </div>
      </header>

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="metas-grid">
        {META_CONFIGS.map(({ tipo, titulo, descricao }) => {
          const atual = periodInfo[tipo]
          const meta = metaValor(tipo)
          const progress = meta > 0 ? Math.round(clampPercent((atual / meta) * 100)) : null
          return (
            <div className="card meta-card" key={tipo}>
              <div className="meta-card-top">
                <span className="meta-card-title">
                  <Target size={16} />
                  {titulo}
                </span>
                <strong>{meta ? formatCurrency(meta) : 'Sem meta'}</strong>
              </div>
              <p className="meta-card-desc">{descricao}</p>

              <div className="meta-card-value">
                <span>{formatCurrency(atual)}</span>
                <span>ganhos no período atual</span>
              </div>

              {progress !== null && (
                <>
                  <div className="progress">
                    <div
                      className={`progress-bar${progress >= 100 ? ' complete' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="meta-card-sub">
                    {progress >= 100
                      ? 'Meta atingida! Parabéns!'
                      : `${progress}% da meta - faltam ${formatCurrency(meta - atual)}`}
                  </p>
                </>
              )}

              <div className="meta-form">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={values[tipo]}
                  onChange={(e) => handleValueChange(tipo, e.target.value)}
                  placeholder="Valor da meta (R$)"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => saveMeta(tipo)}
                  disabled={saving === tipo}
                >
                  <Save size={16} />
                  {saving === tipo ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
