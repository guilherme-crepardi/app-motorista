-- Migração: adicionar km rodados nos ganhos
-- Rode no SQL Editor.

alter table public.ganhos add column if not exists km numeric(10,1) check (km >= 0);

notify pgrst, 'reload schema';
