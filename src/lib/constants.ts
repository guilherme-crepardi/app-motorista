import type { Plataforma, CategoriaGasto, TipoMeta, TipoManutencao, Periodicidade } from '../types'

export const PLATAFORMAS: { value: Plataforma; label: string }[] = [
  { value: 'uber', label: 'Uber' },
  { value: '99', label: '99' },
  { value: 'outra', label: 'Outra' },
]

export const CATEGORIAS: { value: CategoriaGasto; label: string; color: string }[] = [
  { value: 'combustivel', label: 'Combustível', color: '#f59e0b' },
  { value: 'manutencao', label: 'Manutenção', color: '#ef4444' },
  { value: 'pneus', label: 'Pneus', color: '#8b5cf6' },
  { value: 'alimentacao', label: 'Alimentação', color: '#10b981' },
  { value: 'seguro', label: 'Seguro do carro', color: '#06b6d4' },
  { value: 'aluguel_carro', label: 'Aluguel de carro', color: '#3b82f6' },
  { value: 'aluguel_moto', label: 'Aluguel de moto', color: '#6366f1' },
  { value: 'financiamento_carro', label: 'Financiamento de carro', color: '#0ea5e9' },
  { value: 'financiamento_moto', label: 'Financiamento de moto', color: '#14b8a6' },
  { value: 'outro', label: 'Outro', color: '#64748b' },
]

export const TIPOS_META: { value: TipoMeta; label: string }[] = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
]

export const MANUTENCOES_TIPOS: { value: TipoManutencao; label: string; color: string }[] = [
  { value: 'pneu', label: 'Troca de pneu', color: '#8b5cf6' },
  { value: 'oleo', label: 'Troca de óleo', color: '#f59e0b' },
  { value: 'bateria', label: 'Bateria', color: '#06b6d4' },
  { value: 'limpeza', label: 'Limpeza interna', color: '#10b981' },
  { value: 'revisao', label: 'Revisão', color: '#3b82f6' },
  { value: 'outro', label: 'Outro', color: '#64748b' },
]

export function manutencaoTipoLabel(value: TipoManutencao): string {
  return MANUTENCOES_TIPOS.find((t) => t.value === value)?.label ?? value
}

export function manutencaoTipoColor(value: TipoManutencao): string {
  return MANUTENCOES_TIPOS.find((t) => t.value === value)?.color ?? '#64748b'
}

export const PERIODICIDADES: { value: Periodicidade; label: string }[] = [
  { value: 'diaria', label: 'Por dia' },
  { value: 'semanal', label: 'Por semana' },
  { value: 'mensal', label: 'Por mês' },
]

export function periodicidadeLabel(value: Periodicidade): string {
  return PERIODICIDADES.find((p) => p.value === value)?.label ?? value
}

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const ANO_INICIO = 2000
export const ANO_FIM = 2050

export function listaAnos(): number[] {
  const anos: number[] = []
  for (let y = ANO_INICIO; y <= ANO_FIM; y++) anos.push(y)
  return anos
}

export function plataformaLabel(value: Plataforma): string {
  return PLATAFORMAS.find((p) => p.value === value)?.label ?? value
}

export function plataformaColor(value: Plataforma): string {
  const colors: Record<Plataforma, string> = { uber: '#3b82f6', '99': '#ef4444', outra: '#64748b' }
  return colors[value]
}

export function categoriaLabel(value: CategoriaGasto): string {
  return CATEGORIAS.find((c) => c.value === value)?.label ?? value
}

export function categoriaColor(value: CategoriaGasto): string {
  return CATEGORIAS.find((c) => c.value === value)?.color ?? '#64748b'
}
