import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from './supabase'
import { isoToDate } from './utils'
import type { CategoriaGasto, DespesaFixa, Periodicidade } from '../types'

export function ocorrenciasNoPeriodo(periodicidade: Periodicidade, fromISO: string, toISO: string): number {
  const from = isoToDate(fromISO)
  const to = isoToDate(toISO)
  const dias = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
  if (dias <= 0) return 0
  if (periodicidade === 'diaria') return dias
  if (periodicidade === 'semanal') return Math.ceil(dias / 7)
  const meses = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
  return Math.max(0, meses)
}

export function totalFixoPorCategoria(
  fixas: DespesaFixa[],
  fromISO: string,
  toISO: string,
): Partial<Record<CategoriaGasto, number>> {
  const result: Partial<Record<CategoriaGasto, number>> = {}
  for (const f of fixas) {
    if (!f.ativo) continue
    const qtd = ocorrenciasNoPeriodo(f.periodicidade, fromISO, toISO)
    const valor = Number(f.valor) * qtd
    result[f.categoria] = (result[f.categoria] ?? 0) + valor
  }
  return result
}

export function totalFixo(fixas: DespesaFixa[], fromISO: string, toISO: string): number {
  const porCategoria = totalFixoPorCategoria(fixas, fromISO, toISO)
  return Object.values(porCategoria).reduce((acc, v) => acc + (v ?? 0), 0)
}

export function fixoDiarioPorCategoria(fixas: DespesaFixa[]): Partial<Record<CategoriaGasto, number>> {
  const result: Partial<Record<CategoriaGasto, number>> = {}
  for (const f of fixas) {
    if (!f.ativo || f.periodicidade !== 'diaria') continue
    result[f.categoria] = (result[f.categoria] ?? 0) + Number(f.valor)
  }
  return result
}

export function fixoDiario(fixas: DespesaFixa[]): number {
  const porCategoria = fixoDiarioPorCategoria(fixas)
  return Object.values(porCategoria).reduce((acc, v) => acc + (v ?? 0), 0)
}

export function useDespesasFixas(): DespesaFixa[] {
  const { user } = useAuth()
  const [fixas, setFixas] = useState<DespesaFixa[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('despesas_fixas')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) setFixas(data as DespesaFixa[])
      })
  }, [user])

  return fixas
}
