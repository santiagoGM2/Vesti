-- Durable request claims prevent duplicate paid submissions across devices.
create table public.studio_cache (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null check(length(request_key)=64),
 status text not null check(status in ('pending','completed')),
 result jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,request_key)
);
alter table public.studio_cache enable row level security;
grant select,insert,update,delete on public.studio_cache to authenticated;
create policy "Owner reads studio cache" on public.studio_cache for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner claims studio request" on public.studio_cache for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner checkpoints studio request" on public.studio_cache for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner releases rejected request" on public.studio_cache for delete to authenticated using ((select auth.uid())=user_id);
