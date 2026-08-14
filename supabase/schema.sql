-- Planejamento Motorista - Schema do banco
-- Rode este script no SQL Editor do seu projeto Supabase.

create table if not exists public.ganhos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null,
  plataforma text not null check (plataforma in ('uber', '99', 'outra')),
  valor numeric(12,2) not null check (valor >= 0),
  corridas integer check (corridas >= 0),
  horas_trabalhadas numeric(4,2) check (horas_trabalhadas >= 0),
  km numeric(10,1) check (km >= 0),
  descricao text,
  created_at timestamptz not null default now()
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data date not null,
  categoria text not null check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'aluguel_carro', 'aluguel_moto', 'financiamento_carro', 'financiamento_moto', 'outro')),
  valor numeric(12,2) not null check (valor >= 0),
  descricao text,
  created_at timestamptz not null default now()
);

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('diaria', 'semanal', 'mensal')),
  valor numeric(12,2) not null check (valor >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, tipo)
);

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

create table if not exists public.despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  categoria text not null check (categoria in ('combustivel', 'manutencao', 'pneus', 'alimentacao', 'seguro', 'aluguel_carro', 'aluguel_moto', 'financiamento_carro', 'financiamento_moto', 'outro')),
  valor numeric(12,2) not null check (valor >= 0),
  periodicidade text not null check (periodicidade in ('diaria', 'semanal', 'mensal')),
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.historico_ganhos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  total numeric(12,2) not null default 0,
  total_uber numeric(12,2) not null default 0,
  total_99 numeric(12,2) not null default 0,
  total_outra numeric(12,2) not null default 0,
  corridas integer not null default 0,
  horas numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);

create table if not exists public.preferencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tema text not null default 'light' check (tema in ('light', 'dark')),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_ganhos_user_data on public.ganhos (user_id, data desc);
create index if not exists idx_gastos_user_data on public.gastos (user_id, data desc);
create index if not exists idx_manutencoes_user_data on public.manutencoes (user_id, data desc);
create index if not exists idx_despesas_fixas_user on public.despesas_fixas (user_id);
create index if not exists idx_historico_ganhos_user_mes on public.historico_ganhos (user_id, mes desc);

alter table public.ganhos enable row level security;
alter table public.gastos enable row level security;
alter table public.metas enable row level security;
alter table public.manutencoes enable row level security;
alter table public.despesas_fixas enable row level security;
alter table public.historico_ganhos enable row level security;
alter table public.preferencias enable row level security;

create policy "Usuarios acessam seus ganhos" on public.ganhos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam seus gastos" on public.gastos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam suas metas" on public.metas
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam suas manutencoes" on public.manutencoes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam suas despesas fixas" on public.despesas_fixas
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam seu historico de ganhos" on public.historico_ganhos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios acessam suas preferencias" on public.preferencias
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
