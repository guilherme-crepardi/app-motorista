create table if not exists public.historico_gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  total numeric(12,2) not null default 0,
  total_gastos numeric(12,2) not null default 0,
  total_manutencoes numeric(12,2) not null default 0,
  total_fixas numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);

create index if not exists idx_historico_gastos_user_mes on public.historico_gastos (user_id, mes desc);

alter table public.historico_gastos enable row level security;

create policy "Usuarios acessam seu historico de gastos" on public.historico_gastos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
