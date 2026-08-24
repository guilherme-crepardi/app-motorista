alter table public.gastos add column if not exists comprovante_url text;

notify pgrst, 'reload schema';
