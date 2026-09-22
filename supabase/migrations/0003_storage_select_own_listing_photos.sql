-- Deleting or replacing a file needs permission to see it first. Public reads use the public link and don't need this.
create policy "listing photos: see own" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
