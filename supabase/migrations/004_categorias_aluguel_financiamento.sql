-- Migração: adicionar categorias de aluguel e financiamento (carro/moto)
-- Rode no SQL Editor. Atualiza as constraints de gastos e despesas_fixas.

alter table public.gastos
  drop constraint if exists gastos_categoria_check,
  add constraint gastos_categoria_check
    check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'aluguel_carro', 'aluguel_moto', 'financiamento_carro', 'financiamento_moto', 'outro'));

alter table public.despesas_fixas
  drop constraint if exists despesas_fixas_categoria_check,
  add constraint despesas_fixas_categoria_check
    check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'aluguel_carro', 'aluguel_moto', 'financiamento_carro', 'financiamento_moto', 'outro'));

notify pgrst, 'reload schema';
