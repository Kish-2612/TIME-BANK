create or replace function public.donate_to_community_pool(p_amount numeric)
returns public.community_time_pool
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pool public.community_time_pool;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Donation amount must be positive'; end if;

  perform 1 from public.wallets where user_id = v_user for update;
  if not exists (select 1 from public.wallets where user_id = v_user) then raise exception 'Wallet not found'; end if;
  if (select balance from public.wallets where user_id = v_user) < p_amount then raise exception 'Insufficient Time Credits'; end if;

  update public.wallets
  set balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      total_donated = total_donated + p_amount,
      updated_at = now()
  where user_id = v_user;

  update public.community_time_pool
  set balance = balance + p_amount,
      total_donated = total_donated + p_amount,
      updated_at = now()
  where id = true
  returning * into v_pool;

  insert into public.transactions (sender_id, receiver_id, amount, transaction_type, description)
  values (v_user, null, p_amount, 'community_donation', 'Community Time Pool donation');

  return v_pool;
end;
$$;

revoke all on function public.donate_to_community_pool(numeric) from public;
grant execute on function public.donate_to_community_pool(numeric) to authenticated;
