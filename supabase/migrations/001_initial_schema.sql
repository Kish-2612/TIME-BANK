create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 2),
  username text unique,
  avatar_url text,
  bio text,
  location text,
  phone_visibility boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category_id uuid references public.skill_categories(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  skill_type text not null check (skill_type in ('offer', 'want')),
  experience_level text,
  description text,
  created_at timestamptz not null default now(),
  unique (user_id, skill_id, skill_type)
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0 check (balance >= 0),
  total_earned numeric(10,2) not null default 0 check (total_earned >= 0),
  total_spent numeric(10,2) not null default 0 check (total_spent >= 0),
  total_donated numeric(10,2) not null default 0 check (total_donated >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.skill_categories(id),
  skill_id uuid references public.skills(id) on delete set null,
  title text not null check (length(trim(title)) >= 4),
  description text not null check (length(trim(description)) >= 12),
  duration_minutes integer not null check (duration_minutes > 0),
  time_credits numeric(10,2) not null check (time_credits > 0),
  availability text not null,
  service_mode text not null check (service_mode in ('online', 'in_person', 'both')),
  location text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (requester_id <> provider_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  service_request_id uuid references public.service_requests(id),
  amount numeric(10,2) not null check (amount > 0),
  transaction_type text not null check (transaction_type in ('service_payment', 'community_donation', 'bonus', 'refund', 'adjustment')),
  description text,
  created_at timestamptz not null default now(),
  check (sender_id is not null or receiver_id is not null),
  check (sender_id is null or receiver_id is null or sender_id <> receiver_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid unique not null references public.service_requests(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  check (reviewer_id <> reviewee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_time_pool (
  id boolean primary key default true check (id),
  balance numeric(10,2) not null default 0 check (balance >= 0),
  total_donated numeric(10,2) not null default 0 check (total_donated >= 0),
  total_distributed numeric(10,2) not null default 0 check (total_distributed >= 0),
  updated_at timestamptz not null default now()
);

insert into public.community_time_pool (id) values (true) on conflict (id) do nothing;

insert into public.skill_categories (name)
values ('Technology'), ('Education'), ('Design'), ('Fitness'), ('Photography'), ('Cooking'), ('Repair'), ('Languages')
on conflict (name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, location)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'TimeBank member'),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'location'), '')
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.complete_service_and_transfer(p_request_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests;
  v_service public.services;
  v_amount numeric(10,2);
  v_transaction public.transactions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_request from public.service_requests where id = p_request_id for update;
  if not found then raise exception 'Service request not found'; end if;
  if v_request.provider_id <> auth.uid() then raise exception 'Only the provider can complete this request'; end if;
  if v_request.status not in ('accepted', 'in_progress') then raise exception 'Request cannot be completed'; end if;

  select * into v_service from public.services where id = v_request.service_id;
  v_amount := v_service.time_credits;

  perform 1 from public.wallets where user_id = v_request.requester_id for update;
  perform 1 from public.wallets where user_id = v_request.provider_id for update;

  if (select balance from public.wallets where user_id = v_request.requester_id) < v_amount then
    raise exception 'Insufficient Time Credits';
  end if;

  update public.wallets
  set balance = balance - v_amount, total_spent = total_spent + v_amount, updated_at = now()
  where user_id = v_request.requester_id;

  update public.wallets
  set balance = balance + v_amount, total_earned = total_earned + v_amount, updated_at = now()
  where user_id = v_request.provider_id;

  insert into public.transactions (sender_id, receiver_id, service_request_id, amount, transaction_type, description)
  values (v_request.requester_id, v_request.provider_id, v_request.id, v_amount, 'service_payment', v_service.title)
  returning * into v_transaction;

  update public.service_requests set status = 'completed', completed_at = now() where id = v_request.id;

  insert into public.notifications (user_id, title, message, notification_type)
  values
    (v_request.provider_id, 'Time received', format('You received %s Time Credits for %s.', v_amount, v_service.title), 'earn'),
    (v_request.requester_id, 'Service completed', format('%s Time Credits were spent for %s.', v_amount, v_service.title), 'spend');

  return v_transaction;
end;
$$;

revoke all on function public.complete_service_and_transfer(uuid) from public;

create or replace function public.create_service_request(p_service_id uuid, p_message text default null)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
  v_request public.service_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_service
  from public.services
  where id = p_service_id and status = 'active';
  if not found then raise exception 'Service is unavailable'; end if;
  if v_service.provider_id = auth.uid() then raise exception 'You cannot request your own service'; end if;

  if exists (
    select 1 from public.service_requests
    where service_id = p_service_id
      and requester_id = auth.uid()
      and status in ('pending', 'accepted', 'in_progress')
  ) then
    raise exception 'You already have an open request for this service';
  end if;

  insert into public.service_requests (service_id, requester_id, provider_id, message)
  values (p_service_id, auth.uid(), v_service.provider_id, nullif(trim(p_message), ''))
  returning * into v_request;

  insert into public.notifications (user_id, title, message, notification_type)
  values (
    v_service.provider_id,
    'New service request',
    format('Someone requested your service: %s.', v_service.title),
    'request'
  );

  return v_request;
end;
$$;

revoke all on function public.create_service_request(uuid, text) from public;
grant execute on function public.create_service_request(uuid, text) to authenticated;

create or replace function public.set_service_request_status(p_request_id uuid, p_status text)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests;
  v_title text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('accepted', 'rejected') then raise exception 'Invalid request status'; end if;

  select r into v_request
  from public.service_requests r
  join public.services s on s.id = r.service_id
  where r.id = p_request_id
  for update;
  if not found then raise exception 'Service request not found'; end if;
  select title into v_title from public.services where id = v_request.service_id;
  if v_request.provider_id <> auth.uid() then raise exception 'Only the provider can update this request'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  update public.service_requests
  set status = p_status,
      accepted_at = case when p_status = 'accepted' then now() else null end
  where id = p_request_id
  returning * into v_request;

  insert into public.notifications (user_id, title, message, notification_type)
  values (
    v_request.requester_id,
    case when p_status = 'accepted' then 'Request accepted' else 'Request declined' end,
    format('Your request for %s was %s.', v_title, p_status),
    'request'
  );
  return v_request;
end;
$$;

revoke all on function public.set_service_request_status(uuid, text) from public;

create index if not exists services_provider_idx on public.services(provider_id);
create index if not exists services_category_idx on public.services(category_id);
create index if not exists services_status_idx on public.services(status);
create index if not exists services_created_idx on public.services(created_at desc);
create index if not exists requests_requester_idx on public.service_requests(requester_id);
create index if not exists requests_provider_idx on public.service_requests(provider_id);
create index if not exists requests_status_idx on public.service_requests(status);
create index if not exists transactions_sender_idx on public.transactions(sender_id);
create index if not exists transactions_receiver_idx on public.transactions(receiver_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read);

alter table public.profiles enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.wallets enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.community_time_pool enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists categories_select on public.skill_categories;
drop policy if exists skills_select on public.skills;
drop policy if exists user_skills_select on public.user_skills;
drop policy if exists user_skills_write_own on public.user_skills;
drop policy if exists wallets_select_own on public.wallets;
drop policy if exists services_select on public.services;
drop policy if exists services_insert_own on public.services;
drop policy if exists services_update_own on public.services;
drop policy if exists requests_select_participant on public.service_requests;
drop policy if exists transactions_select_participant on public.transactions;
drop policy if exists reviews_select on public.reviews;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists community_pool_select on public.community_time_pool;
drop policy if exists requests_insert_own on public.service_requests;

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy categories_select on public.skill_categories for select to authenticated using (true);
create policy skills_select on public.skills for select to authenticated using (true);
create policy user_skills_select on public.user_skills for select to authenticated using (true);
create policy user_skills_write_own on public.user_skills for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wallets_select_own on public.wallets for select to authenticated using (user_id = auth.uid());
create policy services_select on public.services for select to authenticated using (status = 'active' or provider_id = auth.uid());
create policy services_insert_own on public.services for insert to authenticated with check (provider_id = auth.uid());
create policy services_update_own on public.services for update to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy requests_select_participant on public.service_requests for select to authenticated using (requester_id = auth.uid() or provider_id = auth.uid());
create policy transactions_select_participant on public.transactions for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy reviews_select on public.reviews for select to authenticated using (true);
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy community_pool_select on public.community_time_pool for select to authenticated using (true);
