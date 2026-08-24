insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', true)
on conflict (id) do nothing;

create policy "Usuarios fazem upload de comprovantes"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'comprovantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuarios visualizam seus comprovantes"
on storage.objects
for select to authenticated
using (
  bucket_id = 'comprovantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuarios atualizam seus comprovantes"
on storage.objects
for update to authenticated
using (
  bucket_id = 'comprovantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuarios deletam seus comprovantes"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'comprovantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Comprovantes sao publicos"
on storage.objects
for select to public
using (bucket_id = 'comprovantes');
