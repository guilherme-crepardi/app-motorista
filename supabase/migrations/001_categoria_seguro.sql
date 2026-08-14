-- Migração: adicionar a categoria "seguro" nos gastos
-- Rode apenas se você já criou as tabelas com o schema.sql ANTES desta atualização.

alter table public.gastos drop constraint if exists gastos_categoria_check;

alter table public.gastos add constraint gastos_categoria_check
  check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'outro'));
