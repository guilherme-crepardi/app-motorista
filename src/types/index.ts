export type Plataforma = 'uber' | '99' | 'outra'

export interface Ganho {
  id: string
  user_id: string
  data: string
  plataforma: Plataforma
  valor: number
  corridas: number | null
  horas_trabalhadas: number | null
  km: number | null
  descricao: string | null
  created_at: string
}

export type CategoriaGasto =
  | 'combustivel'
  | 'manutencao'
  | 'pneus'
  | 'alimentacao'
  | 'seguro'
  | 'aluguel_carro'
  | 'aluguel_moto'
  | 'financiamento_carro'
  | 'financiamento_moto'
  | 'outro'

export type Periodicidade = 'diaria' | 'semanal' | 'mensal'

export interface DespesaFixa {
  id: string
  user_id: string
  categoria: CategoriaGasto
  valor: number
  periodicidade: Periodicidade
  descricao: string | null
  ativo: boolean
  created_at: string
}

export interface Gasto {
  id: string
  user_id: string
  data: string
  categoria: CategoriaGasto
  valor: number
  descricao: string | null
  comprovante_url: string | null
  created_at: string
}

export type TipoMeta = 'diaria' | 'semanal' | 'mensal'

export interface HistoricoGanhos {
  id: string
  user_id: string
  mes: string
  total: number
  total_uber: number
  total_99: number
  total_outra: number
  corridas: number
  horas: number
  created_at: string
}

export interface HistoricoGastos {
  id: string
  user_id: string
  mes: string
  total: number
  total_gastos: number
  total_manutencoes: number
  total_fixas: number
  created_at: string
}

export interface Meta {
  id: string
  user_id: string
  tipo: TipoMeta
  valor: number
  updated_at: string
}

export type TipoManutencao = 'pneu' | 'oleo' | 'bateria' | 'limpeza' | 'revisao' | 'outro'

export interface Manutencao {
  id: string
  user_id: string
  data: string
  tipo: TipoManutencao
  valor: number
  parcelado: boolean
  parcelas: number | null
  km_total: number | null
  km_dia: number | null
  km_semana: number | null
  km_mes: number | null
  descricao: string | null
  created_at: string
}
