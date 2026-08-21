-- ============================================================================
-- GNEX CORE BROKERAGE — BASELINE: RECOVERED REMOTE FINANCIAL SCHEMA
-- ----------------------------------------------------------------------------
-- This file recovers the financial schema that exists on the production
-- Supabase project (g-nex, project juaijgiihnzdvqbqkojx) so it lives in the
-- repository. Everything is idempotent (CREATE IF NOT EXISTS / CREATE OR
-- REPLACE / DROP + CREATE) and safe to re-run. It does NOT change behaviour —
-- the execution/ledger hardening lives in the companion migration
-- 20260820110000_brokerage_execution.sql.
--
-- WARNING: handle_user_wallet_automatic_provision() seeds KES 10,000 on every
-- new profile. That is current production behaviour (sandbox seeding) and is
-- preserved here unchanged for fidelity; remove it when going to real money.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS (financial + admin vocabulary shared by tables and RPCs)
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.admin_role_type as enum ('super_admin', 'admin', 'support', 'editor');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.asset_type as enum ('crypto', 'gold');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deposit_status as enum ('pending', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mobile_provider as enum ('mpesa', 'airtel');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.notification_type as enum ('order_filled', 'order_cancelled', 'deposit_confirmed', 'withdrawal_sent', 'price_alert', 'new_follower', 'post_comment', 'post_like', 'announcement');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_side as enum ('buy', 'sell');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('open', 'filled', 'partial', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_type as enum ('market', 'limit', 'stop_limit');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.transaction_status as enum ('pending', 'confirmed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.transaction_type as enum ('buy', 'sell', 'deposit', 'withdrawal');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.withdrawal_status as enum ('pending', 'processing', 'sent', 'failed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. FINANCIAL TABLES (exact remote shape; constraints inline so CREATE TABLE
--    IF NOT EXISTS is a no-op against the live database and fully defines a
--    fresh one)
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Tradable instruments. NOTE: RLS is enabled with zero policies on production,
-- so the API client cannot read this table — market data reaches the client via
-- the price service. The execution migration adds a read policy.
create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  symbol text not null unique,
  name text not null,
  type text not null check (type in ('crypto', 'gold')),
  icon_url text,
  coingecko_id text,
  is_active boolean default true,
  decimal_places integer default 8,
  min_trade_amount numeric,
  created_at timestamptz default now()
);

-- Per-user KES cash account. This is the ONLY place cash lives in production.
--   balance_kes = spendable; escrow_kes = pending deposit credit;
--   locked_kes   = voluntarily locked / margin held for open positions;
--   reserve_kes  = silent 10% deposit reserve (platform-managed).
create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance_kes numeric(14,2) not null default 0.00,
  escrow_kes numeric(14,2) not null default 0.00,
  updated_at timestamptz not null default now(),
  locked_kes numeric not null default 0,
  reserve_kes numeric not null default 0
);

-- Spot holdings (units of an asset owned outright). avg_cost_kes tracks the
-- blended acquisition cost in KES for portfolio valuation.
create table if not exists public.user_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_symbol text not null check (asset_symbol in ('BTC','ETH','SOL','XRP','USDT','XAU')),
  units numeric not null default 0 check (units >= 0),
  avg_cost_kes numeric not null default 0 check (avg_cost_kes >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_symbol)
);

-- Margin positions (non-leveraged collateral by default; leverage is added by
-- the execution migration). Direction/status use the EXACT production case
-- ('Long'/'Short', 'OPEN'/'CLOSED').
create table if not exists public.user_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_symbol text not null,
  direction text not null check (direction in ('Long','Short')),
  entry_price_usd numeric(14,4) not null,
  units numeric(16,8) not null,
  margin_kes numeric(14,2) not null,
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  created_at timestamptz not null default now()
);

-- Order book / order history. side/type/status use CHECK constraints (text),
-- not the enums, on production — preserved here exactly.
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  asset_id uuid references public.assets(id),
  order_type text not null check (order_type in ('market','limit','stop_limit')),
  side text not null check (side in ('buy','sell')),
  quantity numeric(30,12) not null,
  price numeric(30,12),
  stop_price numeric,
  filled_quantity numeric(30,12) default 0,
  average_fill_price numeric,
  fee numeric default 0,
  status text not null default 'open' check (status in ('open','filled','partial','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_asset on public.orders (asset_id);

-- Financial ledger. One row per cash movement; buy/sell rows describe the
-- trade, deposit/withdrawal rows describe the money movement.
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  asset_id uuid references public.assets(id),
  type text not null check (type in ('buy','sell','deposit','withdrawal')),
  amount numeric(30,12) not null,
  price_at_time numeric(30,12),
  fee numeric default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','failed','cancelled')),
  reference text,
  mpesa_reference text,
  airtel_reference text,
  mobile_money_number text,
  mobile_money_provider text,
  notes text,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_transactions_user on public.transactions (user_id);

-- LEGACY per-asset wallet table. Only the deprecated RPCs
-- (lock_funds/release_funds/settle_trade/execute_market_order) touch this.
-- New execution paths use user_wallets + user_holdings + user_positions.
create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  asset_id uuid references public.assets(id),
  balance numeric default 0 check (balance >= 0),
  locked_balance numeric default 0 check (locked_balance >= 0),
  updated_at timestamptz default now(),
  unique (user_id, asset_id)
);

-- Voluntary cash locks (24h cooling-off before release) and the admin ledger
-- surfaces shared with the wallet flow.
create table if not exists public.fund_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_kes numeric not null default 0,
  status text not null default 'locked' check (status in ('locked','unlock_pending','released','cancelled')),
  created_at timestamptz not null default now(),
  unlock_available_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz
);

-- Deposit requests (M-Pesa/Airtel) and withdrawal requests.
create table if not exists public.deposit_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  amount_kes numeric not null,
  mobile_money_number text not null,
  mobile_money_provider text not null,
  user_reference text not null,
  status text not null default 'pending' check (status in ('pending','pending_verification','confirmed','rejected','reversed')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  payment_channel text,
  account_number text,
  expected_amount numeric,
  mpesa_reference text
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  asset_id uuid references public.assets(id),
  amount numeric not null,
  amount_kes numeric,
  mobile_money_number text not null,
  mobile_money_provider text not null,
  status text not null default 'pending' check (status in ('pending','approved','processing','sent','paid','failed','rejected')),
  admin_notes text,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz default now(),
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  fee_kes numeric not null default 0
);

-- Key/value platform configuration (fees, minimums, active assets, providers).
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- Admin role grants + append-only audit trail.
create table if not exists public.admin_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role admin_role_type not null,
  permissions jsonb,
  granted_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- User notifications (order fills, deposit confirmations, withdrawals…).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notifier_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  metadata_json jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- FX feed (USD -> KES reference rate used by the wallet and trade flows).
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'USD',
  target_currency text not null default 'KES',
  rate numeric(12,4) not null default 129.5000,
  updated_at timestamptz not null default now()
);

-- Price alerts (referenced by check_price_alerts(); kept for completeness).
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  asset_id uuid,
  condition text not null,
  target_price numeric not null,
  is_triggered boolean,
  triggered_at timestamptz,
  created_at timestamptz default now()
);



-- ----------------------------------------------------------------------------
-- 3. FINANCIAL FUNCTIONS (recovered from production; CREATE OR REPLACE is idempotent)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_role(p_user uuid, p_role admin_role_type)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  admin_id uuid := auth.uid();
begin
  if not has_role('super_admin'::admin_role_type) then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into admin_roles (user_id, role, granted_by)
  values (p_user, p_role, admin_id)
  on conflict (user_id)
  do update set role = p_role;

  perform log_admin_action(
    admin_id,
    'ASSIGN_ROLE',
    'admin_roles',
    p_user::text,
    null,
    jsonb_build_object('role', p_role)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.check_price_alerts(p_symbol text, p_price numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare r record;
begin
  for r in
    select pa.*, a.symbol
    from price_alerts pa
    join assets a on a.id = pa.asset_id
    where pa.is_triggered = false
    and a.symbol = p_symbol
  loop
    if (r.condition = 'above' and p_price >= r.target_price)
    or (r.condition = 'below' and p_price <= r.target_price)
    then
      update price_alerts
      set is_triggered = true,
          triggered_at = now()
      where id = r.id;

      perform create_notification(
        r.user_id,
        'price_alert',
        'Price alert triggered',
        jsonb_build_object(
          'symbol', p_symbol,
          'price', p_price
        )
      );
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_deposit(p_request_id uuid, p_admin uuid, p_asset uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  r record;
  usd_value numeric;
begin
  select * into r
  from public.deposit_requests
  where id = p_request_id
  and status = 'pending';

  if not found then
    raise exception 'INVALID_REQUEST';
  end if;

  -- convert KES → USD equivalent externally before calling this ideally
  usd_value := r.amount_kes / 130; -- placeholder rate

  update public.wallets
  set balance = balance + usd_value
  where user_id = r.user_id
  and asset_id = p_asset;

  update public.deposit_requests
  set status = 'confirmed',
      reviewed_by = p_admin,
      reviewed_at = now()
  where id = p_request_id;

  insert into public.transactions (
    user_id,
    asset_id,
    type,
    amount,
    price_at_time,
    status,
    mobile_money_number,
    mobile_money_provider
  )
  values (
    r.user_id,
    p_asset,
    'deposit',
    usd_value,
    null,
    'confirmed',
    r.mobile_money_number,
    r.mobile_money_provider
  );

end;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(p_user uuid, p_asset uuid, p_side order_side, p_type order_type, p_quantity numeric, p_price numeric DEFAULT NULL::numeric, p_stop_price numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  order_id uuid := gen_random_uuid();
begin

  insert into public.orders (
    id, user_id, asset_id,
    order_type, side,
    quantity, price, stop_price,
    status
  )
  values (
    order_id, p_user, p_asset,
    p_type, p_side,
    p_quantity, p_price, p_stop_price,
    'open'
  );

  return order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_wallets()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.wallets (user_id, asset_id)
  select new.id, id from public.assets where is_active = true;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS admin_role_type
 LANGUAGE plpgsql
 STABLE
AS $function$
declare r admin_role_type;
begin
  select role into r
  from public.admin_roles
  where user_id = auth.uid()
  limit 1;

  return r;
end;
$function$;

CREATE OR REPLACE FUNCTION public.execute_market_order(p_user uuid, p_asset uuid, p_side order_side, p_quantity numeric, p_price numeric, p_fee_percent numeric)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  order_id uuid := gen_random_uuid();
  fee numeric;
  net_quantity numeric;
begin

  fee := (p_quantity * p_fee_percent) / 100;
  net_quantity := p_quantity - fee;

  if p_side = 'buy' then

    perform lock_funds(p_user, p_asset, p_quantity);

    update public.wallets
    set balance = balance + net_quantity,
        locked_balance = locked_balance - p_quantity
    where user_id = p_user and asset_id = p_asset;

  else

    perform lock_funds(p_user, p_asset, p_quantity);

    update public.wallets
    set balance = balance + net_quantity,
        locked_balance = locked_balance - p_quantity
    where user_id = p_user and asset_id = p_asset;

  end if;

  insert into public.orders (
    id, user_id, asset_id,
    order_type, side,
    quantity, price,
    filled_quantity,
    average_fill_price,
    fee,
    status
  )
  values (
    order_id, p_user, p_asset,
    'market', p_side,
    p_quantity, p_price,
    p_quantity,
    p_price,
    fee,
    'filled'
  );

  insert into public.transactions (
    user_id, asset_id,
    type, amount,
    price_at_time,
    fee, status
  )
  values (
    p_user, p_asset,
    case when p_side = 'buy' then 'buy' else 'sell' end,
    p_quantity,
    p_price,
    fee,
    'confirmed'
  );

  return order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.execute_market_order(p_user uuid, p_asset uuid, p_side order_side, p_quantity numeric, p_price numeric)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  order_id uuid := gen_random_uuid();
begin

  insert into orders (
    id, user_id, asset_id, order_type, side,
    quantity, price, filled_quantity, status
  )
  values (
    order_id, p_user, p_asset, 'market', p_side,
    p_quantity, p_price, p_quantity, 'filled'
  );

  insert into transactions (
    user_id, asset_id, type, amount, price_at_time, status
  )
  values (
    p_user, p_asset,
    case when p_side = 'buy' then 'buy' else 'sell' end,
    p_quantity,
    p_price,
    'confirmed'
  );

  return order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fill_limit_order(p_order_id uuid, p_price numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  o record;
  fee numeric;
begin

  select * into o
  from public.orders
  where id = p_order_id
  and status = 'open';

  if not found then return; end if;

  fee := (o.quantity * 0.5) / 100;

  update public.orders
  set status = 'filled',
      filled_quantity = o.quantity,
      average_fill_price = p_price,
      fee = fee,
      updated_at = now()
  where id = p_order_id;

  insert into public.transactions (
    user_id, asset_id,
    type, amount,
    price_at_time,
    fee, status
  )
  values (
    o.user_id, o.asset_id,
    o.side,
    o.quantity,
    p_price,
    fee,
    'confirmed'
  );

end;
$function$;

CREATE OR REPLACE FUNCTION public.get_role_level(role admin_role_type)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  return case role
    when 'super_admin' then 4
    when 'admin' then 3
    when 'support' then 2
    when 'editor' then 1
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  generated_username text;
  base_username text;
  username_exists boolean;
  suffix text;
BEGIN
  -- 1. BASE HANDLE NOMINATION PARSING LOOP
  IF new.email IS NOT NULL THEN
    base_username := split_part(new.email, '@', 1);
  ELSIF (new.raw_user_meta_data ->> 'user_name') IS NOT NULL THEN
    base_username := new.raw_user_meta_data ->> 'user_name';
  ELSE
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 6);
  END IF;

  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  
  IF base_username = '' THEN
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 4);
  END IF;
  
  generated_username := base_username;

  LOOP
    SELECT exists(
      SELECT 1 FROM public.profiles WHERE username = generated_username
    ) INTO username_exists;
    EXIT WHEN NOT username_exists;
    suffix := substring(md5(random()::text) from 1 for 4);
    generated_username := base_username || '_' || suffix;
  END LOOP;

  -- =========================================================
  -- SUB-TRANSACTION A: PROFILE ROW CREATION (CRITICAL ANCHOR)
  -- =========================================================
  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, is_verified, monthly_roi)
    VALUES (
      new.id,
      generated_username,
      coalesce(new.raw_user_meta_data ->> 'full_name', generated_username),
      new.raw_user_meta_data ->> 'avatar_url',
      NULL,
      FALSE,
      0.00
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failure bypassed: %', SQLERRM;
  END;

  -- =========================================================
  -- SUB-TRANSACTION B: AUTO-PROVISION SYSTEM TRADING WALLET
  -- =========================================================
  -- 🟢 SAFE INTERCEPT: If your wallets table uses balance, balance_kes, or alternative columns,
  -- this isolated wrapper block prevents any mismatch from crashing your user registrations.
  BEGIN
    -- This handles basic column parameters matching your active 20 tables layout context
    INSERT INTO public.wallets (user_id, balance, created_at)
    VALUES (new.id, 0.00, now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Try an alternative structure if 'balance' column doesn't match your schema fields
    BEGIN
      INSERT INTO public.wallets (user_id, created_at)
      VALUES (new.id, now())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-wallet execution failure bypassed safely: %', SQLERRM;
    END;
  END;

  -- =========================================================
  -- SUB-TRANSACTION C: AUTO-PROVISION SYSTEM ACCESS PERMISSIONS
  -- =========================================================
  BEGIN
    INSERT INTO public.admin_roles (user_id, role, created_at)
    VALUES (new.id, 'support'::admin_role_type, now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Auto-role assignment execution failure bypassed safely: %', SQLERRM;
  END;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_master_pipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  generated_username text;
  base_username text;
  username_exists boolean;
  suffix text;
  user_email text;
  asset_record RECORD;
BEGIN
  -- A. Capture registering email strings safely
  user_email := lower(coalesce(new.email, ''));

  -- B. Parse baseline username prefix strings
  IF new.email IS NOT NULL THEN
    base_username := split_part(new.email, '@', 1);
  ELSIF (new.raw_user_meta_data ->> 'user_name') IS NOT NULL THEN
    base_username := new.raw_user_meta_data ->> 'user_name';
  ELSE
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 6);
  END IF;

  -- C. Strip unsafe spacing or character punctuations
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 4);
  END IF;
  
  generated_username := base_username;

  -- D. Unique Handle Verification Loop Check
  LOOP
    SELECT exists(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
    EXIT WHEN NOT username_exists;
    suffix := substring(md5(random()::text) from 1 for 4);
    generated_username := base_username || '_' || suffix;
  END LOOP;

  -- E. TRANSACTION LANE 1: PROFILE ACCOUNT CREATION
  INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, is_verified, monthly_roi)
  VALUES (
    new.id,
    generated_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', generated_username),
    new.raw_user_meta_data ->> 'avatar_url',
    NULL,
    FALSE,
    0.00
  ) ON CONFLICT (id) DO NOTHING;

  -- F. TRANSACTION LANE 2: MULTI-ASSET WALLET PROVISIONING
  -- 🟢 FIXED: Loop through your existing 'assets' table to generate a starting 
  -- wallet ledger balance slot for every platform token natively.
  BEGIN
    FOR asset_record IN SELECT id, symbol FROM public.assets LOOP
      INSERT INTO public.wallets (user_id, asset_id, balance, locked_balance, updated_at)
      VALUES (
        new.id, 
        asset_record.id, 
        0.00, 
        0.00, 
        now()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback safety check if your assets table is currently unpopulated during this testing phase
    BEGIN
      INSERT INTO public.wallets (user_id, balance, locked_balance, updated_at)
      VALUES (new.id, 0.00, 0.00, now()) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Defensive asset wallet allocation bypassed safely: %', SQLERRM;
    END;
  END;

  -- G. TRANSACTION LANE 3: PERMISSIONS SECURITY GATEWAY
  IF user_email = 'ahelstakov@gmail.com' THEN
    INSERT INTO public.admin_roles (user_id, role, created_at)
    VALUES (new.id, 'super_admin'::admin_role_type, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  generated_username text;
  base_username text;
  username_exists boolean;
  suffix text;
BEGIN
  -- A. Generate a base name safely
  IF new.email IS NOT NULL THEN
    base_username := split_part(new.email, '@', 1);
  ELSIF (new.raw_user_meta_data ->> 'user_name') IS NOT NULL THEN
    base_username := new.raw_user_meta_data ->> 'user_name';
  ELSE
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 6);
  END IF;

  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  
  IF base_username = '' THEN
    base_username := 'trader_' || substring(md5(random()::text) from 1 for 4);
  END IF;
  
  generated_username := base_username;

  -- B. Alphanumeric Collision Loop Check
  LOOP
    SELECT exists(SELECT 1 FROM public.profiles WHERE username = generated_username) INTO username_exists;
    EXIT WHEN NOT username_exists;
    suffix := substring(md5(random()::text) from 1 for 4);
    generated_username := base_username || '_' || suffix;
  END LOOP;

  -- C. HIGHLY DEFENSIVE SINGLE-COLUMN INSERT
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, generated_username)
  ON CONFLICT (id) DO NOTHING;

  -- D. SAFELY BACKFILL THE REMAINING METRICS
  BEGIN
    UPDATE public.profiles 
    SET 
      full_name = coalesce(new.raw_user_meta_data ->> 'full_name', generated_username),
      avatar_url = new.raw_user_meta_data ->> 'avatar_url',
      bio = NULL,
      is_verified = FALSE,
      monthly_roi = 0.00
    WHERE id = new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile backfill skipped safely: %', SQLERRM;
  END;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_user_wallet_automatic_provision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Automatically generate a fresh wallet profile containing a seed balance
  -- to incentivize early-stage testing inside our sandbox environment grid!
  INSERT INTO public.user_wallets (user_id, balance_kes)
  VALUES (NEW.id, 10000.00); -- 🟢 Seeds KES 10,000 for local Kenyan testing metrics
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admin_roles ar
    cross join lateral jsonb_array_elements_text(ar.permissions) p
    where ar.user_id = auth.uid() and p = p_permission
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_permission_for(p_user uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admin_roles ar
    cross join lateral jsonb_array_elements_text(ar.permissions) p
    where ar.user_id = p_user and p = p_permission
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_role(min_role admin_role_type)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  return get_role_level(current_user_role())
       >= get_role_level(min_role);
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_roles 
    WHERE user_id = check_user_id AND role = 'super_admin'::admin_role_type
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_funds(p_user uuid, p_asset uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update wallets
  set balance = balance - p_amount,
      locked_balance = locked_balance + p_amount
  where user_id = p_user
    and asset_id = p_asset
    and balance >= p_amount;

  if not found then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_admin uuid, p_action text, p_table text, p_target_id text, p_old jsonb, p_new jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.audit_logs (
    admin_id,
    action,
    target_table,
    target_id,
    old_value,
    new_value
  )
  values (
    p_admin,
    p_action,
    p_table,
    p_target_id,
    p_old,
    p_new
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_deposit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    perform create_notification(
      new.user_id,
      'deposit_confirmed',
      'Your deposit has been credited',
      jsonb_build_object('amount', new.amount_kes)
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_order_filled()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status = 'filled' and old.status <> 'filled' then
    perform create_notification(
      new.user_id,
      'order_filled',
      'Your order has been filled',
      jsonb_build_object('order_id', new.id)
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status = 'sent' and old.status <> 'sent' then
    perform create_notification(
      new.user_id,
      'withdrawal_sent',
      'Your withdrawal has been sent',
      jsonb_build_object('amount', new.amount)
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_withdrawal(p_request_id uuid, p_admin uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  r record;
begin
  select * into r
  from public.withdrawal_requests
  where id = p_request_id
  and status = 'pending';

  if not found then
    raise exception 'INVALID_REQUEST';
  end if;

  update public.withdrawal_requests
  set status = 'sent',
      processed_by = p_admin,
      processed_at = now()
  where id = p_request_id;

  insert into public.transactions (
    user_id,
    asset_id,
    type,
    amount,
    status,
    mobile_money_number,
    mobile_money_provider
  )
  values (
    r.user_id,
    r.asset_id,
    'withdrawal',
    r.amount,
    'confirmed',
    r.mobile_money_number,
    r.mobile_money_provider
  );

end;
$function$;

CREATE OR REPLACE FUNCTION public.provision_user_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sub-Block A: Auto-Provision Standard Portfolio Trading Wallet
  -- Wrapped in an independent try/catch so if your wallets table column layout 
  -- has a naming mismatch, it will NEVER delete your profile row above.
  BEGIN
    INSERT INTO public.wallets (user_id, balance, created_at)
    VALUES (new.id, 0.00, now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.wallets (user_id, created_at)
      VALUES (new.id, now())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Background wallet allocation failure bypassed safely: %', SQLERRM;
    END;
  END;

  -- Sub-Block B: Auto-Provision Base Access System Permissions
  BEGIN
    INSERT INTO public.admin_roles (user_id, role, created_at)
    VALUES (new.id, 'support'::admin_role_type, now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Background role assignment failure bypassed safely: %', SQLERRM;
  END;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_funds(p_user uuid, p_asset uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update wallets
  set balance = balance + p_amount,
      locked_balance = locked_balance - p_amount
  where user_id = p_user
    and asset_id = p_asset
    and locked_balance >= p_amount;

  if not found then
    raise exception 'INVALID_LOCK_STATE';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.settle_trade(buyer uuid, seller uuid, asset uuid, quantity numeric, price numeric, fee numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  total_cost numeric;
begin
  total_cost := quantity * price;

  -- buyer receives asset
  update wallets
  set balance = balance + quantity
  where user_id = buyer and asset_id = asset;

  -- seller receives fiat equivalent (assume USDT-like base later)
  -- simplified for now: same asset system

  update wallets
  set locked_balance = locked_balance - quantity
  where user_id = seller and asset_id = asset;

end;
$function$;



-- ----------------------------------------------------------------------------
-- 4. TRIGGERS (drop + create for idempotency)
-- ----------------------------------------------------------------------------

-- Provision a KES wallet when a profile is created (seeds 10,000 KES — see header).
drop trigger if exists on_auth_user_wallet_provision on public.profiles;
create trigger on_auth_user_wallet_provision
  after insert on public.profiles
  for each row execute function public.handle_user_wallet_automatic_provision();

-- Notify on order fill / deposit confirm / withdrawal sent.
drop trigger if exists trg_order_filled on public.orders;
create trigger trg_order_filled
  after update on public.orders
  for each row execute function public.notify_order_filled();

drop trigger if exists trg_deposit_confirmed on public.deposit_requests;
create trigger trg_deposit_confirmed
  after update on public.deposit_requests
  for each row execute function public.notify_deposit();

drop trigger if exists trg_withdrawal on public.withdrawal_requests;
create trigger trg_withdrawal
  after update on public.withdrawal_requests
  for each row execute function public.notify_withdrawal();

-- Full onboarding pipeline (profile + legacy per-asset wallets + super_admin
-- grant) when a new auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_master_pipeline();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (financial tables; drop + create for idempotency)
-- ----------------------------------------------------------------------------
alter table public.assets enable row level security;
alter table public.user_wallets enable row level security;
alter table public.user_holdings enable row level security;
alter table public.user_positions enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.fund_locks enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_roles enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.price_alerts enable row level security;

-- Orders: users manage their own; staff full access.
drop policy if exists "Users manage own orders" on public.orders;
create policy "Users manage own orders" on public.orders for all
  using (auth.uid() = user_id);
drop policy if exists "admin full access orders" on public.orders;
create policy "admin full access orders" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all
  using (public.has_role('admin'::public.admin_role_type)) with check (public.has_role('admin'::public.admin_role_type));

-- Transactions: users read their own; staff read; admins full.
drop policy if exists "Users view own transactions" on public.transactions;
create policy "Users view own transactions" on public.transactions for select
  using (auth.uid() = user_id);
drop policy if exists "user can view own transactions" on public.transactions;
create policy "user can view own transactions" on public.transactions for select
  using (auth.uid() = user_id);
drop policy if exists "admin full access transactions" on public.transactions;
create policy "admin full access transactions" on public.transactions for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "support transactions read" on public.transactions;
create policy "support transactions read" on public.transactions for select
  using (public.has_role('support'::public.admin_role_type));

-- Holdings / positions / wallets: owners read; holdings owners update.
drop policy if exists "Users read own holdings" on public.user_holdings;
create policy "Users read own holdings" on public.user_holdings for select
  using (auth.uid() = user_id);
drop policy if exists "Users update own holdings" on public.user_holdings;
create policy "Users update own holdings" on public.user_holdings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Allow select user_positions" on public.user_positions;
create policy "Allow select user_positions" on public.user_positions for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Allow select user_wallets" on public.user_wallets;
create policy "Allow select user_wallets" on public.user_wallets for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users read own fund locks" on public.fund_locks;
create policy "Users read own fund locks" on public.fund_locks for select
  using (auth.uid() = user_id);

-- Exchange rates readable by everyone (public reference rate).
drop policy if exists "Allow read rates" on public.exchange_rates;
create policy "Allow read rates" on public.exchange_rates for select
  using (true);

-- Notifications: users manage their own (existing production shape).
drop policy if exists "notifications_read_all" on public.notifications;
create policy "notifications_read_all" on public.notifications for select
  using (true);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  using (auth.uid() = recipient_id);
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete
  using (auth.uid() = recipient_id);

-- Deposit/withdrawal requests: owners read (admin policies added by the wallet
-- migration / admin centre).
drop policy if exists "Users read own deposit requests" on public.deposit_requests;
create policy "Users read own deposit requests" on public.deposit_requests for select
  using (auth.uid() = user_id);
drop policy if exists "Users read own withdrawal requests" on public.withdrawal_requests;
create policy "Users read own withdrawal requests" on public.withdrawal_requests for select
  using (auth.uid() = user_id);

-- Admin roles: staff read their own role; admins manage (recovered).
drop policy if exists "Staff read own role" on public.admin_roles;
create policy "Staff read own role" on public.admin_roles for select
  using (auth.uid() = user_id);
drop policy if exists "Admins read all roles" on public.admin_roles;
create policy "Admins read all roles" on public.admin_roles for select to authenticated
  using (public.has_permission('admins.manage'));
drop policy if exists "Authenticated users can read admin roles" on public.admin_roles;
create policy "Authenticated users can read admin roles" on public.admin_roles for select to authenticated
  using (true);
drop policy if exists "Staff manage admin roles" on public.admin_roles;
create policy "Staff manage admin roles" on public.admin_roles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

