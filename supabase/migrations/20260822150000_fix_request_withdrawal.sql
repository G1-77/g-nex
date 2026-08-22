-- =============================================================================
-- 20260822150000_fix_request_withdrawal.sql
--
-- Corrects three defects in request_withdrawal() introduced in 20260822130000:
--   1. v_settings was declared "record" but accessed with the jsonb ->>
--      operator  =>  runtime 42883 "operator does not exist: record ->> unknown".
--   2. platform_settings.value holds BARE scalars (e.g. 0.03), so even a jsonb
--      variable needs "#>> '{}'" unwrapping -- "->>'value'" returned NULL and
--      would have silently fallen back to defaults forever.
--   3. The wallet debit ran BEFORE the idempotency upsert, so a client retry
--      double-reserved funds. Idempotent replay now short-circuits BEFORE any
--      mutation, guarded by a FOR UPDATE wallet lock that serializes replays.
--   4. Portfolio valuation referenced non-existent columns
--      (user_holdings.quantity / asset_id / assets.current_price_usd).
--      Real columns are asset_symbol / units / avg_cost_kes; the DB stores no
--      market prices, so valuation uses cost basis as a conservative proxy.
--
-- No other functions touched. Grants re-asserted to match house lockdown.
-- =============================================================================

create or replace function public.request_withdrawal(
  p_user uuid,
  p_amount_kes numeric,
  p_phone text,
  p_provider text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_settings                   jsonb;
  v_wallet                     public.user_wallets%rowtype;
  v_fee_kes                    numeric;
  v_fee_rate                   numeric;
  v_max_pct                    numeric;
  v_holdings_kes               numeric := 0;
  v_pending_out_kes            numeric := 0;
  v_unverified_provisional_kes numeric := 0;
  v_cap_limit                  numeric;
  v_available                  numeric;
  v_gross_kes                  numeric;
  v_net_kes                    numeric;
  v_existing_id                uuid;
  v_existing_status            text;
  v_provider_slug              text;
  v_withdrawal_id_tmp          uuid;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Validate input
  -- ---------------------------------------------------------------------------
  if p_amount_kes is null or p_amount_kes <= 0 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  end if;

  if p_phone is null or length(btrim(p_phone)) < 9 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PHONE');
  end if;

  v_provider_slug := lower(regexp_replace(coalesce(p_provider, ''), '[^a-z0-9]', '', 'g'));
  if v_provider_slug = '' then
    return jsonb_build_object('ok', false, 'error', 'UNSUPPORTED_PROVIDER');
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Lock the wallet row FIRST. This serialises every concurrent request or
  --    replay by the same user, making the replay check below race-free.
  -- ---------------------------------------------------------------------------
  select * into v_wallet from public.user_wallets where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND');
  end if;

  -- ---------------------------------------------------------------------------
  -- 3. Idempotent replay: return the ORIGINAL request untouched. Must run
  --    before any balance mutation so retries can never double-reserve.
  -- ---------------------------------------------------------------------------
  if p_idempotency_key is not null then
    select id, status
      into v_existing_id, v_existing_status
      from public.withdrawal_requests
     where user_id = p_user
       and idempotency_key = p_idempotency_key
     order by created_at desc
     limit 1;

    if found then
      return jsonb_build_object(
        'ok',               true,
        'withdrawal_id',    v_existing_id,
        'status',           v_existing_status,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 4. Fee from platform settings.
  --    platform_settings.value is a bare jsonb scalar (e.g. 0.03):
  --      "#>> '{}'" unwraps a scalar; "->>'value'" covers an object wrapper.
  -- ---------------------------------------------------------------------------
  select value into v_settings from public.platform_settings where key = 'withdrawal_fee_rate';
  v_fee_rate := coalesce(
    nullif(v_settings #>> '{}', '')::numeric,
    nullif(v_settings ->> 'value', '')::numeric,
    0.03
  );
  v_fee_kes := round(p_amount_kes * v_fee_rate, 2);

  if v_fee_kes >= p_amount_kes then
    return jsonb_build_object('ok', false, 'error', 'AMOUNT_EXCEEDS_FEE');
  end if;

  -- ---------------------------------------------------------------------------
  -- 5. Provider whitelist (setting absent/null => allow; strict when present).
  --    "?" matches an object key or a string element in a jsonb array.
  -- ---------------------------------------------------------------------------
  select value into v_settings from public.platform_settings where key = 'payment_providers';
  if v_settings is not null
     and jsonb_typeof(v_settings) in ('object', 'array')
     and not (v_settings ? v_provider_slug) then
    return jsonb_build_object('ok', false, 'error', 'UNSUPPORTED_PROVIDER');
  end if;

  -- ---------------------------------------------------------------------------
  -- 6. Holdings valuation (cost-basis proxy; DB keeps no live prices).
  -- ---------------------------------------------------------------------------
  select coalesce(sum(units * avg_cost_kes), 0)
    into v_holdings_kes
  from public.user_holdings
  where user_id = p_user;

  -- ---------------------------------------------------------------------------
  -- 7. Pending outbound total (money already spoken for by earlier requests).
  -- ---------------------------------------------------------------------------
  select coalesce(sum(amount_kes), 0)
    into v_pending_out_kes
  from public.withdrawal_requests
  where user_id = p_user
    and status in ('pending', 'approved', 'processing', 'sent');

  -- ---------------------------------------------------------------------------
  -- 8. Unverified provisional deposits cannot fund withdrawals.
  -- ---------------------------------------------------------------------------
  select coalesce(sum(amount_kes), 0)
    into v_unverified_provisional_kes
  from public.deposit_requests
  where user_id = p_user
    and status in ('pending', 'pending_verification');

  -- ---------------------------------------------------------------------------
  -- 9. Cap: max pct of (balance + locked + holdings); default 70%.
  -- ---------------------------------------------------------------------------
  select value into v_settings from public.platform_settings where key = 'max_withdraw_pct';
  v_max_pct := coalesce(
    nullif(v_settings #>> '{}', '')::numeric,
    nullif(v_settings ->> 'value', '')::numeric,
    0.7
  );

  v_cap_limit := round(
    v_max_pct * (v_wallet.balance_kes + v_wallet.locked_kes + v_holdings_kes),
    2
  );

  v_available := greatest(
    0,
    least(
      v_cap_limit,
      v_wallet.balance_kes - v_pending_out_kes - v_unverified_provisional_kes
    )
  );

  if p_amount_kes > v_cap_limit or p_amount_kes > v_available then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_AVAILABLE_BALANCE');
  end if;

  v_gross_kes := p_amount_kes;             -- gross locked now; fee netted at payout
  v_net_kes   := p_amount_kes - v_fee_kes;

  -- ---------------------------------------------------------------------------
  -- 10. ATOMIC reservation: balance_kes -> locked_kes.
  -- ---------------------------------------------------------------------------
  update public.user_wallets
     set balance_kes = balance_kes - v_gross_kes,
         locked_kes  = locked_kes + v_gross_kes,
         updated_at  = now()
   where user_id = p_user
     and balance_kes >= v_gross_kes;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_FUNDS');
  end if;

  -- ---------------------------------------------------------------------------
  -- 11. Create withdrawal request. Replays never reach here (step 3 catches
  --     them under the wallet lock), so a plain insert is race-safe.
  -- ---------------------------------------------------------------------------
  insert into public.withdrawal_requests (
    user_id,
    asset_id,
    amount,
    amount_kes,
    fee_kes,
    mobile_money_number,
    mobile_money_provider,
    status,
    approval_role,
    idempotency_key,
    created_at
  ) values (
    p_user,
    null,
    p_amount_kes,
    p_amount_kes,
    round(v_fee_kes, 2),
    btrim(p_phone),
    p_provider,
    'pending',
    null,
    p_idempotency_key,
    now()
  )
  returning id into v_withdrawal_id_tmp;

  -- ---------------------------------------------------------------------------
  -- 12. Pending ledger entry (positive amounts; direction carried by type,
  --     matching existing buy/sell convention).
  -- ---------------------------------------------------------------------------
  insert into public.transactions (
    user_id,
    asset_id,
    type,
    amount,
    amount_kes,
    fee,
    status,
    reference,
    mobile_money_number,
    mobile_money_provider,
    notes
  ) values (
    p_user,
    null,
    'withdrawal',
    p_amount_kes,
    p_amount_kes,
    v_fee_kes,
    'pending',
    v_withdrawal_id_tmp::text,
    btrim(p_phone),
    p_provider,
    'Withdrawal request pending admin approval'
  );

  -- ---------------------------------------------------------------------------
  -- 13. Audit trail.
  -- ---------------------------------------------------------------------------
  perform public.log_admin_action(
    p_user,
    'WITHDRAWAL_REQUESTED',
    'withdrawal_requests',
    v_withdrawal_id_tmp::text,
    null,
    jsonb_build_object(
      'amount_kes',      p_amount_kes,
      'fee_kes',         v_fee_kes,
      'net_kes',         v_net_kes,
      'provider',        p_provider,
      'phone',           btrim(p_phone),
      'idempotency_key', p_idempotency_key
    )
  );

  return jsonb_build_object(
    'ok',            true,
    'withdrawal_id', v_withdrawal_id_tmp,
    'status',        'pending',
    'gross_kes',     v_gross_kes,
    'net_kes',       v_net_kes,
    'fee_kes',       v_fee_kes
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Lockdown (mirror 20260822130000): service_role only.
-- -----------------------------------------------------------------------------
revoke execute on function public.request_withdrawal(uuid, numeric, text, text, text) from public;
revoke execute on function public.request_withdrawal(uuid, numeric, text, text, text) from anon;
revoke execute on function public.request_withdrawal(uuid, numeric, text, text, text) from authenticated;
grant execute on function public.request_withdrawal(uuid, numeric, text, text, text) to service_role;
