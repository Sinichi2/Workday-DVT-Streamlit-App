-- Images embedded in Help Center articles.
--
-- Public bucket, unlike source-files: help content is meant to be read, and a
-- signed URL would expire inside a stored article body and break the image.
-- Nothing sensitive goes here - it is editorial artwork, not customer data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read (the bucket is public); only admins may put anything in it.
drop policy if exists article_images_read on storage.objects;
create policy article_images_read on storage.objects for select
  using (bucket_id = 'article-images');

drop policy if exists article_images_write on storage.objects;
create policy article_images_write on storage.objects for insert
  with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists article_images_update on storage.objects;
create policy article_images_update on storage.objects for update
  using (bucket_id = 'article-images' and public.is_admin());

drop policy if exists article_images_delete on storage.objects;
create policy article_images_delete on storage.objects for delete
  using (bucket_id = 'article-images' and public.is_admin());
