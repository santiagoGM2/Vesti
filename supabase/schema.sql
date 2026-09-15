-- Bootstrap for a dedicated Vesti project. Review before applying to an existing project.
create table if not exists public.wardrobes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.wardrobes enable row level security;
create policy "Owner reads wardrobe" on public.wardrobes for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner creates wardrobe" on public.wardrobes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates wardrobe" on public.wardrobes for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes wardrobe" on public.wardrobes for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.wardrobes to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('vesti-private','vesti-private',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Owner reads photos" on storage.objects for select to authenticated using (bucket_id='vesti-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owner uploads photos" on storage.objects for insert to authenticated with check (bucket_id='vesti-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owner deletes photos" on storage.objects for delete to authenticated using (bucket_id='vesti-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create schema if not exists private;
create table private.studio_usage(user_id uuid references auth.users(id) on delete cascade, day date, count integer not null, primary key(user_id,day));
alter table private.studio_usage enable row level security;
-- Limited definer function is isolated in private; public wrapper uses invoker rights.
create function private.reserve_studio_request() returns boolean language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 if auth.uid() is null then return false; end if;
 insert into private.studio_usage as u(user_id,day,count) values(auth.uid(),(now() at time zone 'UTC')::date,1)
 on conflict(user_id,day) do update set count=u.count+1 where u.count<20 returning count into total;
 return total is not null;
end $$;
revoke all on function private.reserve_studio_request() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.reserve_studio_request() to authenticated;
create function public.reserve_studio_request() returns boolean language sql security invoker set search_path='' as $$ select private.reserve_studio_request(); $$;
revoke all on function public.reserve_studio_request() from public,anon;
grant execute on function public.reserve_studio_request() to authenticated;
