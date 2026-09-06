create table if not exists public.service_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null references public.service_requests(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  provider_id uuid not null references public.profiles(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  duration_minutes integer not null check (duration_minutes > 0),
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'waiting', 'active', 'completed', 'cancelled', 'expired')),
  video_room_id uuid unique not null default gen_random_uuid(),
  provider_joined_at timestamptz,
  requester_joined_at timestamptz,
  completed_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_id <> requester_id),
  check (scheduled_end_at > scheduled_start_at)
);

alter table public.transactions
  add column if not exists session_id uuid references public.service_sessions(id);

alter table public.transactions
  drop constraint if exists transactions_session_id_key;
alter table public.transactions
  add constraint transactions_session_id_key unique (session_id);

create index if not exists service_sessions_request_idx on public.service_sessions(request_id);
create index if not exists service_sessions_provider_idx on public.service_sessions(provider_id);
create index if not exists service_sessions_requester_idx on public.service_sessions(requester_id);
create index if not exists service_sessions_status_end_idx on public.service_sessions(status, scheduled_end_at);

alter table public.service_sessions enable row level security;
drop policy if exists service_sessions_select_participant on public.service_sessions;
create policy service_sessions_select_participant
on public.service_sessions for select to authenticated
using (provider_id = auth.uid() or requester_id = auth.uid());

create or replace function public.accept_service_request(p_request_id uuid)
returns public.service_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests;
  v_service public.services;
  v_session public.service_sessions;
  v_start timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_request
  from public.service_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Service request not found'; end if;
  if v_request.provider_id <> auth.uid() then raise exception 'Only the provider can accept this request'; end if;

  select * into v_service
  from public.services
  where id = v_request.service_id and status = 'active';
  if not found then raise exception 'Service is no longer active'; end if;
  if v_request.status = 'accepted' then
    select * into v_session from public.service_sessions where request_id = p_request_id;
    if found then return v_session; end if;
  end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  insert into public.service_sessions (
    request_id, service_id, provider_id, requester_id, duration_minutes,
    scheduled_start_at, scheduled_end_at, status
  )
  values (
    v_request.id, v_service.id, v_request.provider_id, v_request.requester_id,
    v_service.duration_minutes, v_start,
    v_start + make_interval(mins => v_service.duration_minutes), 'waiting'
  )
  returning * into v_session;

  update public.service_requests
  set status = 'accepted', accepted_at = v_start
  where id = p_request_id;

  insert into public.notifications (user_id, title, message, notification_type)
  values (
    v_request.requester_id,
    'Request accepted',
    format('Your %s session is ready to join.', v_service.title),
    'request'
  );

  return v_session;
exception
  when unique_violation then
    select * into v_session from public.service_sessions where request_id = p_request_id;
    if found then return v_session; end if;
    raise;
end;
$$;

revoke all on function public.accept_service_request(uuid) from public;
grant execute on function public.accept_service_request(uuid) to authenticated;

create or replace function public.join_service_session(p_session_id uuid)
returns public.service_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.service_sessions;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_session from public.service_sessions where id = p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if auth.uid() not in (v_session.provider_id, v_session.requester_id) then raise exception 'You are not a session participant'; end if;
  if v_session.status in ('completed', 'cancelled', 'expired') then raise exception 'Session is no longer active'; end if;
  if v_now >= v_session.scheduled_end_at then raise exception 'Session has ended'; end if;

  update public.service_sessions
  set provider_joined_at = case when auth.uid() = provider_id then coalesce(provider_joined_at, v_now) else provider_joined_at end,
      requester_joined_at = case when auth.uid() = requester_id then coalesce(requester_joined_at, v_now) else requester_joined_at end,
      actual_start_at = coalesce(actual_start_at, v_now),
      status = case when status = 'waiting' then 'active' else status end,
      updated_at = v_now
  where id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

revoke all on function public.join_service_session(uuid) from public;
grant execute on function public.join_service_session(uuid) to authenticated;

create or replace function public.complete_service_session(p_session_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.service_sessions;
  v_service public.services;
  v_transaction public.transactions;
  v_amount numeric(10,2);
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_session from public.service_sessions where id = p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if auth.uid() not in (v_session.provider_id, v_session.requester_id) then raise exception 'You are not a session participant'; end if;

  if v_session.settled_at is not null then
    select * into v_transaction from public.transactions where session_id = p_session_id;
    return v_transaction;
  end if;
  if v_now < v_session.scheduled_end_at then raise exception 'Session has not reached its scheduled end'; end if;
  if v_session.status in ('cancelled', 'expired') then raise exception 'Session cannot be settled'; end if;

  select * into v_service from public.services where id = v_session.service_id;
  v_amount := v_service.time_credits;

  if v_session.requester_id = v_session.provider_id then raise exception 'Participants must be different users'; end if;

  if v_session.requester_id < v_session.provider_id then
    perform 1 from public.wallets where user_id = v_session.requester_id for update;
    perform 1 from public.wallets where user_id = v_session.provider_id for update;
  else
    perform 1 from public.wallets where user_id = v_session.provider_id for update;
    perform 1 from public.wallets where user_id = v_session.requester_id for update;
  end if;

  if not exists (select 1 from public.wallets where user_id = v_session.requester_id)
     or not exists (select 1 from public.wallets where user_id = v_session.provider_id) then
    raise exception 'Wallet not found';
  end if;

  if (select balance from public.wallets where user_id = v_session.requester_id) < v_amount then
    raise exception 'Insufficient Time Credits';
  end if;

  update public.wallets
  set balance = balance - v_amount, total_spent = total_spent + v_amount, updated_at = v_now
  where user_id = v_session.requester_id;

  update public.wallets
  set balance = balance + v_amount, total_earned = total_earned + v_amount, updated_at = v_now
  where user_id = v_session.provider_id;

  insert into public.transactions (
    sender_id, receiver_id, service_request_id, session_id, amount, transaction_type, description
  )
  values (
    v_session.requester_id, v_session.provider_id, v_session.request_id, p_session_id,
    v_amount, 'service_payment', v_service.title
  )
  returning * into v_transaction;

  update public.service_sessions
  set status = 'completed', actual_end_at = v_now, completed_at = v_now,
      settled_at = v_now, updated_at = v_now
  where id = p_session_id;

  update public.service_requests
  set status = 'completed', completed_at = v_now
  where id = v_session.request_id;

  insert into public.notifications (user_id, title, message, notification_type)
  values
    (v_session.provider_id, 'Credits settled', format('%s Time Credits were transferred to you.', v_amount), 'earn'),
    (v_session.requester_id, 'Session completed', format('%s Time Credits were charged for %s.', v_amount, v_service.title), 'spend');

  return v_transaction;
end;
$$;

revoke all on function public.complete_service_session(uuid) from public;
grant execute on function public.complete_service_session(uuid) to authenticated;

revoke execute on function public.complete_service_and_transfer(uuid) from authenticated;

revoke execute on function public.set_service_request_status(uuid, text) from authenticated;

create or replace function public.reject_service_request(p_request_id uuid)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.service_requests where id = p_request_id for update;
  if not found then raise exception 'Service request not found'; end if;
  if v_request.provider_id <> auth.uid() then raise exception 'Only the provider can reject this request'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  update public.service_requests set status = 'rejected' where id = p_request_id returning * into v_request;
  insert into public.notifications (user_id, title, message, notification_type)
  values (v_request.requester_id, 'Request declined', 'Your TimeBank request was declined.', 'request');
  return v_request;
end;
$$;

revoke all on function public.reject_service_request(uuid) from public;
grant execute on function public.reject_service_request(uuid) to authenticated;

create or replace function public.get_server_time()
returns timestamptz
language sql
security invoker
as $$
  select clock_timestamp();
$$;

grant execute on function public.get_server_time() to authenticated;
