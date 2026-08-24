import { supabase } from './supabase'
import { ocorrenciasNoPeriodo } from './despesasFixas'
import type { Gasto, Manutencao, DespesaFixa, HistoricoGastos } from '../types'

function sum(list: number[]): number {
  return list.reduce((acc, v) => acc + v, 0)
}

function resumoDoMes(
  mes: string,
  gastos: Gasto[],
  manutencoes: Manutencao[],
  fixas: DespesaFixa[],
  userId: string,
) {
  const fromISO = `${mes}-01`
  const [y, m] = mes.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const toISO = `${mes}-${String(lastDay).padStart(2, '0')}`

  let totalFixas = 0
  for (const f of fixas) {
    if (!f.ativo) continue
    const qtd = ocorrenciasNoPeriodo(f.periodicidade, fromISO, toISO)
    totalFixas += Number(f.valor) * qtd
  }

  return {
    user_id: userId,
    mes,
    total_gastos: sum(gastos.map((g) => Number(g.valor))),
    total_manutencoes: sum(manutencoes.map((m) => Number(m.valor))),
    total_fixas: totalFixas,
    total: sum(gastos.map((g) => Number(g.valor))) + sum(manutencoes.map((m) => Number(m.valor))) + totalFixas,
  }
}

export async function syncHistoricoGastos(userId: string, fixas?: DespesaFixa[]): Promise<void> {
  const [gastosRes, manutRes, fixasRes] = await Promise.all([
    supabase.from('gastos').select('*').eq('user_id', userId),
    supabase.from('manutencoes').select('*').eq('user_id', userId),
    fixas ? null : supabase.from('despesas_fixas').select('*').eq('user_id', userId),
  ])

  if (gastosRes.error || manutRes.error) return

  const gastos = gastosRes.data ?? []
  const manutencoes = manutRes.data ?? []
  const todasFixas = fixas ?? (fixasRes?.data as DespesaFixa[] ?? [])

  const byMonth = new Map<string, { gastos: Gasto[]; manutencoes: Manutencao[] }>()
  for (const g of gastos) {
    const mes = g.data.slice(0, 7)
    if (!byMonth.has(mes)) byMonth.set(mes, { gastos: [], manutencoes: [] })
    byMonth.get(mes)!.gastos.push(g)
  }
  for (const m of manutencoes) {
    const mes = m.data.slice(0, 7)
    if (!byMonth.has(mes)) byMonth.set(mes, { gastos: [], manutencoes: [] })
    byMonth.get(mes)!.manutencoes.push(m)
  }

  if (byMonth.size === 0) return

  const aResumo = []
  for (const [mes, data] of byMonth) {
    aResumo.push(resumoDoMes(mes, data.gastos, data.manutencoes, todasFixas, userId))
  }

  if (aResumo.length > 0) {
    await supabase.from('historico_gastos').upsert(aResumo, { onConflict: 'user_id,mes' })
  }
}

export async function fetchHistoricoGastos(userId: string): Promise<HistoricoGastos[]> {
  const { data, error } = await supabase
    .from('historico_gastos')
    .select('*')
    .eq('user_id', userId)
    .order('mes', { ascending: false })

  if (error) return []
  return data ?? []
}
