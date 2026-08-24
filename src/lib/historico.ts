import { supabase } from './supabase'
import type { Ganho, HistoricoGanhos } from '../types'

function sum(list: number[]): number {
  return list.reduce((acc, v) => acc + v, 0)
}

function resumoDoMes(mes: string, ganhos: Ganho[], userId: string) {
  return {
    user_id: userId,
    mes,
    total: sum(ganhos.map((g) => Number(g.valor))),
    total_uber: sum(ganhos.filter((g) => g.plataforma === 'uber').map((g) => Number(g.valor))),
    total_99: sum(ganhos.filter((g) => g.plataforma === '99').map((g) => Number(g.valor))),
    total_outra: sum(ganhos.filter((g) => g.plataforma === 'outra').map((g) => Number(g.valor))),
    corridas: sum(ganhos.map((g) => Number(g.corridas ?? 0))),
    horas: sum(ganhos.map((g) => Number(g.horas_trabalhadas ?? 0))),
  }
}

export async function syncHistorico(userId: string): Promise<void> {
  const { data: ganhos, error } = await supabase
    .from('ganhos')
    .select('*')
    .eq('user_id', userId)

  if (error || !ganhos) return

  const byMonth = new Map<string, Ganho[]>()
  for (const g of ganhos) {
    const mes = g.data.slice(0, 7)
    if (!byMonth.has(mes)) byMonth.set(mes, [])
    byMonth.get(mes)!.push(g)
  }
  if (byMonth.size === 0) return

  const aResumo = []
  for (const [mes, lista] of byMonth) {
    aResumo.push(resumoDoMes(mes, lista, userId))
  }

  if (aResumo.length > 0) {
    await supabase.from('historico_ganhos').upsert(aResumo, { onConflict: 'user_id,mes' })
  }
}

export async function fetchHistorico(userId: string): Promise<HistoricoGanhos[]> {
  const { data, error } = await supabase
    .from('historico_ganhos')
    .select('*')
    .eq('user_id', userId)
    .order('mes', { ascending: false })

  if (error) return []
  return data ?? []
}
