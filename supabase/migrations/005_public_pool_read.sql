drop policy if exists community_pool_select on public.community_time_pool;
create policy community_pool_select
on public.community_time_pool for select
to anon, authenticated
using (true);
