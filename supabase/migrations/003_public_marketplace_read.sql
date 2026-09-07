drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists categories_select on public.skill_categories;
create policy categories_select
on public.skill_categories for select
to anon, authenticated
using (true);

drop policy if exists skills_select on public.skills;
create policy skills_select
on public.skills for select
to anon, authenticated
using (true);

drop policy if exists services_select on public.services;
create policy services_select
on public.services for select
to anon, authenticated
using (status = 'active' or (auth.uid() is not null and provider_id = auth.uid()));