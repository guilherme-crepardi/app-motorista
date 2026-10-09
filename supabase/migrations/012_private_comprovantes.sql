update storage.buckets
set public = false
where id = 'comprovantes';

drop policy if exists "Comprovantes sao publicos" on storage.objects;

drop policy if exists "Usuarios fazem upload de comprovantes" on storage.objects;
drop policy if exists "Usuarios visualizam seus comprovantes" on storage.objects;
drop policy if exists "Usuarios atualizam seus comprovantes" on storage.objects;
drop policy if exists "Usuarios deletam seus comprovantes" on storage.objects;

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
)
with check (
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
