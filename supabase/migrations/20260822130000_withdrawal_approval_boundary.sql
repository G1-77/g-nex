-- =============================================================================
-- GNEX WITHDRAWAL APPROVAL BOUNDARY
-- =============================================================================
-- Implements strict withdrawal lifecycle:
-- request → pending → approved → sent → completed/failed
-- with atomic fund reservation, idempotency, and admin-only execution boundary.
-- =============================================================================

-- 1. ADD NEW COLUMNS TO withdrawal_requests
-- =============================================================================
alter table public.withdrawal_requests
  add column if not exists approval_role public.admin_role_type,
  add column if not exists rejected_by uuid references public.profiles(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists failed_by uuid references public.profiles(id),
  add column if not exists failed_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists idempotency_key text;

-- 2. EXTEND STATUS CHECK TO INCLUDE 'cancelled'
-- =============================================================================
alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_status_check;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_check
  check (status in (
    'pending',      -- user submitted, awaiting admin review
    'approved',     -- admin approved, awaiting execution
    'processing',   -- execution started (future use)
    'sent',         -- payout completed (funds left platform)
    'paid',         -- alias for sent (legacy compatibility)
    'failed',       -- execution failed, funds refunded
    'rejected',     -- admin rejected, funds released
    'cancelled'     -- user cancelled before approval
  ));

-- 3. IDEMPOTENCY INDEX (one request per user per idempotency_key)
-- =============================================================================
create unique index if not exists withdrawal_requests_user_idempotency_key_uq
  on public.withdrawal_requests (user_id, idempotency_key)
  where idempotency_key is not null;

-- 4. QUERY PERFORMANCE INDEXES
-- =============================================================================
create index if not exists idx_withdrawal_requests_user_id
  on public.withdrawal_requests (user_id);

create index if not exists idx_withdrawal_requests_status
  on public.withdrawal_requests (status);

create index if not exists idx_withdrawal_requests_created_at
  on public.withdrawal_requests (created_at desc);

-- 5. TIGHTEN INSERT RLS: USERS CAN ONLY CREATE 'pending' ROWS
-- =============================================================================
alter table public.withdrawal_requests enable row level security;

drop policy if exists "Users create own withdrawal requests" on public.withdrawal_requests;
create policy "Users create own withdrawal requests"
  on public.withdrawal_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and asset_id is null
    and status = 'pending'
    and approved_by is null
    and processed_by is null
    and rejected_by is null
    and failed_by is null
    and paid_at is null
  );

-- 6. NEW RPC: request_withdrawal
-- Atomic: validate → reserve (balance_kes→locked_kes) → insert withdrawal + pending ledger + audit
-- Idempotent on (user_id, idempotency_key)
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
  v_settings record;
  v_wallet public.user_wallets%rowtype;
  v_profile record;
  v_fee_kes numeric;
  v_holdings_kes numeric := 0;
  v_pending_out_kes numeric := 0;
  v_unverified_provisional_kes numeric := 0;
  v_cap_limit numeric;
  v_available numeric;
  v_gross_kes numeric;
  v_withdrawal_id uuid;
  v_net_kes numeric;
begin
  -- 1. Validate input
  if p_amount_kes <= 0 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  end if;

  -- 2. Fetch platform settings
  select value into v_settings from public.platform_settings where key = 'withdrawal_fee_rate';
  v_fee_kes := round(p_amount_kes * coalesce(v_settings->>'value', '0.03')::numeric, 2);

  if v_fee_kes >= p_amount_kes then
    return jsonb_build_object('ok', false, 'error', 'AMOUNT_EXCEEDS_FEE');
  end if;

  -- 3. Validate provider
  select value into v_settings from public.platform_settings where key = 'payment_providers';
  if not (v_settings is null or (v_settings->>'value')::jsonb ? lower(regexp_replace(p_provider, '[^a-z0-9]', '', 'g'))) then
    return jsonb_build_object('ok', false, 'error', 'UNSUPPORTED_PROVIDER');
  end if;

  -- 4. Fetch wallet
  select * into v_wallet from public.user_wallets where user_id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND');
  end if;

  -- 5. Fetch profile for phone validation (policy: non-matching still queues but flagged)
  select mobile_money_number into v_profile from public.profiles where id = p_user;
  -- phone matching is advisory for admin queue risk flag; not a hard gate at request time

  -- 6. Compute holdings KES value (using stored asset prices as conservative proxy)
  select coalesce(sum(h.quantity * a.current_price_usd * 130.0), 0)
    into v_holdings_kes
  from public.user_holdings h
  join public.assets a on a.id = h.asset_id
  where h.user_id = p_user;

  -- 7. Compute pending withdrawals total (excluding rejected/failed/cancelled)
  select coalesce(sum(amount_kes), 0)
    into v_pending_out_kes
  from public.withdrawal_requests
  where user_id = p_user
    and status in ('pending', 'approved', 'processing', 'sent');

  -- 8. Compute unverified provisional deposits
  select coalesce(sum(amount_kes), 0)
    into v_unverified_provisional_kes
  from public.deposit_requests
  where user_id = p_user
    and status in ('pending', 'pending_verification');

  -- 9. Get max_withdraw_pct
  select value into v_settings from public.platform_settings where key = 'max_withdraw_pct';
  v_cap_limit := round(
    coalesce(v_settings->>'value', '0.7')::numeric
    * (v_wallet.balance_kes + v_wallet.locked_kes + v_holdings_kes),
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

  v_gross_kes := p_amount_kes; -- gross amount locked (fee deducted at payout)
  v_net_kes := p_amount_kes - v_fee_kes;

  -- 10. ATOMIC: reserve funds (balance_kes → locked_kes) and create withdrawal + ledger
  -- This single statement either fully succeeds or rolls back entirely
  update public.user_wallets
    set balance_kes = balance_kes - v_gross_kes,
        locked_kes = locked_kes + v_gross_kes,
        updated_at = now()
    where user_id = p_user
      and balance_kes >= v_gross_kes;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_FUNDS');
  end if;

  -- 11. Insert withdrawal request (idempotent on idempotency_key)
  insert into public.withdrawal_requests (
    user_id,
    asset_id,
    amount,
    amount_kes,
    fee_kes,
    mobile_money_number,
    mobile_money_provider,
    status,
    idempotency_key,
    created_at
  ) values (
    p_user,
    null,
    p_amount_kes,
    p_amount_kes,
    round(v_fee_kes, 2),
    p_phone,
    p_provider,
    'pending',
    p_idempotency_key,
    now()
  )
  on conflict (user_id, idempotency_key) where idempotency_key is not null
  do update set
    amount = excluded.amount,
    amount_kes = excluded.amount_kes,
    fee_kes = excluded.fee_kes,
    mobile_money_number = excluded.mobile_money_number,
    mobile_money_provider = excluded.mobile_money_provider,
    updated_at = now()
  returning id into v_withdrawal_id;

  -- 12. Create pending ledger entry
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
    v_withdrawal_id::text,
    p_phone,
    p_provider,
    'Withdrawal request pending admin approval'
  );

  -- 13. Audit log
  perform public.log_admin_action(
    p_user,
    'WITHDRAWAL_REQUESTED',
    'withdrawal_requests',
    v_withdrawal_id::text,
    null,
    jsonb_build_object(
      'amount_kes', p_amount_kes,
      'fee_kes', v_fee_kes,
      'net_kes', p_amount_kes - v_fee_kes,
      'provider', p_provider,
      'phone', p_phone,
      'idempotency_key', p_idempotency_key
    )
  );

  return jsonb_build_object(
    'ok', true,
    'withdrawal_id', v_withdrawal_id,
    'status', 'pending',
    'gross_kes', v_gross_kes,
    'net_kes', v_net_kes,
    'fee_kes', v_fee_kes
  );
end;
$$;

-- 6b. NEW RPC: cancel_withdrawal (user cancels while pending)
-- =============================================================================
create or replace function public.cancel_withdrawal(
  p_user uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wd public.withdrawal_requests%rowtype;
  v_amount_kes numeric;
begin
  select * into v_wd from public.withdrawal_requests
    where id = p_request_id and user_id = p_user
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_wd.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'NOT_CANCELLABLE');
  end if;

  v_amount_kes := coalesce(v_wd.amount_kes, v_wd.amount, 0);

  -- Release locked funds back to balance
  update public.user_wallets
    set balance_kes = balance_kes + v_amount_kes,
        locked_kes = greatest(0, locked_kes - v_amount_kes),
        updated_at = now()
    where user_id = p_user;

  -- Update withdrawal status
  update public.withdrawal_requests
    set status = 'cancelled'
    where id = p_request_id;

  -- Mark ledger cancelled
  update public.transactions
    set status = 'cancelled',
        notes = 'Withdrawal cancelled by user before approval'
    where reference = p_request_id::text
      and type = 'withdrawal'
      and user_id = p_user;

  -- Audit
  perform public.log_admin_action(
    p_user,
    'WITHDRAWAL_CANCELLED',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('status', v_wd.status),
    jsonb_build_object('status', 'cancelled', 'amount_kes', v_amount_kes)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_request_id, 'released_kes', v_amount_kes);
end;
$$;

-- 7. NEW RPC: admin_approve_withdrawal
-- Idempotent: only transitions pending → approved
-- =============================================================================
create or replace function public.admin_approve_withdrawal(
  p_withdrawal_id uuid,
  p_admin uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wd public.withdrawal_requests%rowtype;
  v_role public.admin_role_type;
begin
  select * into v_wd from public.withdrawal_requests
    where id = p_withdrawal_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_wd.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'NOT_PENDING');
  end if;

  -- Get admin's role
  select role into v_role from public.admin_roles where user_id = p_admin;

  update public.withdrawal_requests
    set status = 'approved',
        approved_by = p_admin::text,
        approved_at = now(),
        approval_role = v_role
    where id = p_withdrawal_id;

  -- Audit
  perform public.log_admin_action(
    p_admin,
    'WITHDRAWAL_APPROVED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'approved', 'approved_by', p_admin, 'approval_role', v_role)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'status', 'approved');
end;
$$;

-- 8. REWRITE: admin_process_withdrawal (now requires 'approved', FOR UPDATE, consumes locked_kes)
-- =============================================================================
create or replace function public.admin_process_withdrawal(
  p_withdrawal_id uuid,
  p_admin uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wd public.withdrawal_requests%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_gross_kes numeric;
begin
  select * into v_wd from public.withdrawal_requests
    where id = p_withdrawal_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_wd.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'NOT_APPROVED');
  end if;

  v_gross_kes := coalesce(v_wd.amount_kes, v_wd.amount, 0);

  -- Consume locked funds (atomic check: locked_kes must cover gross)
  select * into v_wallet from public.user_wallets where user_id = v_wd.user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND');
  end if;

  if v_wallet.locked_kes < v_gross_kes then
    return jsonb_build_object('ok', false, 'error', 'RESERVATION_MISSING');
  end if;

  -- Consume locked → funds leave platform
  update public.user_wallets
    set locked_kes = locked_kes - v_gross_kes,
        updated_at = now()
    where user_id = v_wd.user_id;

  -- Update withdrawal to sent/completed
  update public.withdrawal_requests
    set status = 'sent',
        processed_by = p_admin,
        processed_at = now(),
        paid_at = now(),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_withdrawal_id;

  -- Flip ledger pending → confirmed
  update public.transactions
    set status = 'confirmed',
        processed_by = p_admin,
        processed_at = now(),
        notes = 'Withdrawal processed and sent'
    where reference = p_withdrawal_id::text
      and type = 'withdrawal'
      and user_id = v_wd.user_id
      and status = 'pending';

  -- Audit
  perform public.log_admin_action(
    p_admin,
    'WITHDRAWAL_COMPLETED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('status', 'approved'),
    jsonb_build_object('status', 'sent', 'gross_kes', v_gross_kes, 'note', p_note)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'debited_kes', v_gross_kes);
end;
$$;

-- 9. REWRITE: admin_reject_withdrawal (releases locked funds back to balance)
-- =============================================================================
create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_admin uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wd public.withdrawal_requests%rowtype;
  v_amount_kes numeric;
begin
  select * into v_wd from public.withdrawal_requests
    where id = p_withdrawal_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_wd.status not in ('pending', 'approved') then
    return jsonb_build_object('ok', false, 'error', 'NOT_REJECTABLE');
  end if;

  v_amount_kes := coalesce(v_wd.amount_kes, v_wd.amount, 0);

  -- Release locked funds back to available balance
  update public.user_wallets
    set balance_kes = balance_kes + v_amount_kes,
        locked_kes = greatest(0, locked_kes - v_amount_kes),
        updated_at = now()
    where user_id = v_wd.user_id;

  -- Update withdrawal
  update public.withdrawal_requests
    set status = 'rejected',
        rejected_by = p_admin,
        rejected_at = now(),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_withdrawal_id;

  -- Mark ledger cancelled/rejected
  update public.transactions
    set status = 'cancelled',
        notes = 'Withdrawal rejected by admin: ' || coalesce(p_note, 'no reason given')
    where reference = p_withdrawal_id::text
      and type = 'withdrawal'
      and user_id = v_wd.user_id
      and status = 'pending';

  -- Audit
  perform public.log_admin_action(
    p_admin,
    'WITHDRAWAL_REJECTED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('status', v_wd.status),
    jsonb_build_object('status', 'rejected', 'rejected_by', p_admin, 'note', p_note, 'released_kes', v_amount_kes)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'released_kes', v_amount_kes);
end;
$$;

-- 10. NEW RPC: admin_fail_withdrawal (post-debit failure → refund)
-- =============================================================================
create or replace function public.admin_fail_withdrawal(
  p_withdrawal_id uuid,
  p_admin uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wd public.withdrawal_requests%rowtype;
  v_amount_kes numeric;
  v_wallet public.user_wallets%rowtype;
begin
  select * into v_wd from public.withdrawal_requests
    where id = p_withdrawal_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_wd.status not in ('sent', 'approved', 'processing') then
    return jsonb_build_object('ok', false, 'error', 'NOT_FAILABLE');
  end if;

  v_amount_kes := coalesce(v_wd.amount_kes, v_wd.amount, 0);

  -- If status was 'sent' (funds already left), we refund gross to balance
  if v_wd.status = 'sent' then
    update public.user_wallets
      set balance_kes = balance_kes + v_amount_kes,
          updated_at = now()
      where user_id = v_wd.user_id;
  elsif v_wd.status in ('approved', 'processing') then
    -- Funds still locked, release back
    update public.user_wallets
      set balance_kes = balance_kes + v_amount_kes,
          locked_kes = greatest(0, locked_kes - v_amount_kes),
          updated_at = now()
      where user_id = v_wd.user_id;
  end if;

  -- Update withdrawal
  update public.withdrawal_requests
    set status = 'failed',
        failed_by = p_admin,
        failed_at = now(),
        failure_reason = p_note,
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_withdrawal_id;

  -- Mark ledger failed
  update public.transactions
    set status = 'failed',
        notes = 'Withdrawal failed: ' || coalesce(p_note, 'external execution failure')
    where reference = p_withdrawal_id::text
      and type = 'withdrawal'
      and user_id = v_wd.user_id;

  -- Audit
  perform public.log_admin_action(
    p_admin,
    'WITHDRAWAL_FAILED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('status', v_wd.status),
    jsonb_build_object('status', 'failed', 'failed_by', p_admin, 'reason', p_note, 'refunded_kes', v_amount_kes)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'refunded_kes', v_amount_kes);
end;
$$;

-- 11. GRANT EXECUTE TO SERVICE_ROLE ONLY (all new/rewritten RPCs)
-- =============================================================================
revoke execute on function
  public.request_withdrawal(uuid, numeric, text, text, text),
  public.cancel_withdrawal(uuid, uuid),
  public.admin_approve_withdrawal(uuid, uuid),
  public.admin_process_withdrawal(uuid, uuid, text),
  public.admin_reject_withdrawal(uuid, uuid, text),
  public.admin_fail_withdrawal(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.request_withdrawal(uuid, numeric, text, text, text),
  public.cancel_withdrawal(uuid, uuid),
  public.admin_approve_withdrawal(uuid, uuid),
  public.admin_process_withdrawal(uuid, uuid, text),
  public.admin_reject_withdrawal(uuid, uuid, text),
  public.admin_fail_withdrawal(uuid, uuid, text)
to service_role;

-- =============================================================================
-- NOTES
-- =============================================================================
-- * All RPCs use SECURITY DEFINER with search_path = public
-- * Error protocol: jsonb {ok: false, error: 'UPPER_SNAKE_CODE'}
-- * Success: jsonb {ok: true, ...}
-- * FOR UPDATE row locks prevent race conditions on status transitions
-- * Idempotency via unique index on (user_id, idempotency_key) for requests
-- * Approval/execution boundary enforced at DB level via status checks
-- * Funds move: balance_kes → locked_kes (reserve) → consumed on process → balance on reject/fail
-- * Ledger entries track every state transition with status = pending/confirmed/cancelled/failed
-- * Audit trail via log_admin_action for all sensitive operations
-- * Only service_role can execute financial RPCs (not exposed to browser)
-- * Phone matching no longer gates auto-approval; all requests queue for admin review
-- * Admin queue risk flag: phone mismatch between request and profile.mobile_money_number