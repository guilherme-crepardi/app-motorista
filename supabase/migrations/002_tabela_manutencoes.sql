-- Migração: criar a tabela de manutenções
-- Rode no SQL Editor se você já criou as tabelas com o schema.sql ANTES desta atualização.
-- (É seguro rodar mesmo que a tabela já exista.)

create table if not exists public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('pneu', 'oleo', 'bateria', 'limpeza', 'revisao', 'outro')),
  valor numeric(12,2) not null check (valor >= 0),
  parcelado boolean not null default false,
  parcelas integer check (parcelas > 0),
  km_total numeric(10,1) check (km_total >= 0),
  km_dia numeric(10,1) check (km_dia >= 0),
  km_semana numeric(10,1) check (km_semana >= 0),
  km_mes numeric(10,1) check (km_mes >= 0),
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_manutencoes_user_data on public.manutencoes (user_id, data desc);

alter table public.manutencoes enable row level security;

create policy "Usuarios acessam suas manutencoes" on public.manutencoes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
