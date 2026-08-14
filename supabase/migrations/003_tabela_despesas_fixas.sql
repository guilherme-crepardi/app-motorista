-- Migração: criar a tabela de despesas fixas/recorrentes
-- Rode no SQL Editor se você já criou as tabelas com o schema.sql ANTES desta atualização.
-- (É seguro rodar mesmo que a tabela já exista.)

create table if not exists public.despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  categoria text not null check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'outro')),
  valor numeric(12,2) not null check (valor >= 0),
  periodicidade text not null check (periodicidade in ('diaria', 'semanal', 'mensal')),
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_despesas_fixas_user on public.despesas_fixas (user_id);

alter table public.despesas_fixas enable row level security;

create policy "Usuarios acessam suas despesas fixas" on public.despesas_fixas
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
