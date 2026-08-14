-- Migração: tabela de preferências por usuário (ex.: tema)
-- Rode no SQL Editor.

create table if not exists public.preferencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tema text not null default 'light' check (tema in ('light', 'dark')),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.preferencias enable row level security;

create policy "Usuarios acessam suas preferencias" on public.preferencias
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
