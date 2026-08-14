-- Migração: tabela de histórico mensal de ganhos
-- Rode no SQL Editor. Sempre que um mês termina, o app salva um resumo aqui.

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

create index if not exists idx_historico_ganhos_user_mes on public.historico_ganhos (user_id, mes desc);

alter table public.historico_ganhos enable row level security;

create policy "Usuarios acessam seu historico de ganhos" on public.historico_ganhos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
