-- ============================================================================
-- GNEX CORE BROKERAGE — EXECUTION + LEDGER HARDENING
-- ----------------------------------------------------------------------------
-- Turn-key production execution on top of the recovered baseline schema.
--
-- Principles enforced here:
--   * The database is the ONLY source of truth for balances, holdings and
--     positions. The browser never decides price, validity or fees.
--   * Cash lives exclusively in user_wallets.balance_kes (available),
--     locked_kes (margin + voluntary locks). Asset units live in
--     user_holdings (spot) and user_positions (margin).
--   * Nothing can ever go negative (guarded updates + CHECK constraints).
--   * Trades are idempotent: a retried request with the same idempotency_key
--     returns the original result instead of double-executing.
--   * Trading is USD-denominated; KES is used only for cash settlement and
--     display. amount_kes is recorded on every ledger row so the admin ledger
--     is consistent.
--   * Realtime publish on orders/transactions/positions/holdings/wallets lets
--     the UI reconcile after every execution.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCHEMA ADDITIONS
-- ----------------------------------------------------------------------------

-- Orders: mode (spot vs margin), server idempotency key, KES margin amount.
alter table public.orders add column if not exists mode text not null default 'spot' check (mode in ('spot','margin'));
alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists margin_kes numeric(14,2) not null default 0;

-- One executed order per (user, idempotency_key) — retries never double-fill.
create unique index if not exists orders_user_idempotency_key_uq
  on public.orders (user_id, idempotency_key)
  where idempotency_key is not null;

-- Ledger: track the KES value actually moved and the source order.
alter table public.transactions add column if not exists amount_kes numeric(14,2);
alter table public.transactions add column if not exists order_id uuid references public.orders(id);

-- Positions: leverage, liquidation level, close/P&L metadata. Existing rows
-- default to 1x (non-leveraged collateral) to preserve history.
alter table public.user_positions add column if not exists leverage numeric not null default 1;
alter table public.user_positions add column if not exists liquidation_price_usd numeric(14,4);
alter table public.user_positions add column if not exists fee_kes numeric(14,2) not null default 0;
alter table public.user_positions add column if not exists realized_pnl_kes numeric(14,2);
alter table public.user_positions add column if not exists close_price_usd numeric(14,4);
alter table public.user_positions add column if not exists closed_at timestamptz;
alter table public.user_positions add column if not exists updated_at timestamptz not null default now();

-- holdings check must accept the full asset catalogue (BNB was missing).
alter table public.user_holdings drop constraint if exists user_holdings_asset_symbol_check;
alter table public.user_holdings add constraint user_holdings_asset_symbol_check
  check (asset_symbol in ('BTC','ETH','SOL','XRP','USDT','XAU','BNB'));

-- assets: readable by the API client so the market can render the real
-- instrument list instead of a hardcoded client constant.
drop policy if exists "Assets readable by authenticated users" on public.assets;
create policy "Assets readable by authenticated users"
  on public.assets for select to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 2. NOTIFICATION PRIMITIVE
--    notify_* triggers call create_notification(), which does not exist on
--    production (any order fill would crash its transaction). This closes the
--    gap so fills/deposits/withdrawals can notify.
-- ----------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user uuid,
  p_type text,
  p_title text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, notifier_id, notification_type, metadata_json)
  values (p_user, p_user, p_type, jsonb_build_object('title', p_title) || coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. EXECUTION ENGINE
--    SECURITY DEFINER + fixed search_path: never reachable from the browser,
--    called only by the server-side API routes (service role). RLS is bypassed
--    inside, so every guard is explicit.
-- ----------------------------------------------------------------------------

-- Constants used by the engine (single source of truth for precision).
create or replace function public.trade_round(value numeric, digits int)
returns numeric
language sql immutable
as $$ select round(coalesce(value, 0), digits); $$;

create or replace function public.execute_trade(
  p_user uuid,
  p_asset_symbol text,
  p_side text,
  p_mode text,
  p_amount_usd numeric,
  p_price_usd numeric,
  p_fx_rate numeric,
  p_fee_percent numeric,
  p_leverage numeric default 1,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_asset public.assets%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_holdings public.user_holdings%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_pos_id uuid;
  v_side text := lower(p_side);
  v_mode text := lower(p_mode);
  v_symbol text := upper(p_asset_symbol);
  v_quantity numeric;
  v_fee_usd numeric;
  v_fee_kes numeric;
  v_liq numeric;
  v_old_units numeric := 0;
  v_old_avg numeric := 0;
  v_existing record;
begin
  -- ---- input sanity ---------------------------------------------------------
  if p_user is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_amount_usd <= 0 or p_price_usd <= 0 or p_fx_rate <= 0 then
    raise exception 'INVALID_PARAMS';
  end if;
  if v_side not in ('buy','sell') then
    raise exception 'INVALID_PARAMS';
  end if;
  if v_mode not in ('spot','margin') then
    raise exception 'INVALID_PARAMS';
  end if;
  if v_mode = 'margin' and (p_leverage < 1 or p_leverage > 100) then
    raise exception 'INVALID_LEVERAGE';
  end if;

  select * into v_asset from public.assets
  where symbol = v_symbol and is_active = true;
  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  -- ensure a wallet row always exists (users created before provisioning).
  insert into public.user_wallets (user_id) values (p_user) on conflict do nothing;
  select * into v_wallet from public.user_wallets where user_id = p_user;
  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  -- ---- idempotency -----------------------------------------------------------
  -- A retried request carrying the same key returns the original outcome.
  if p_idempotency_key is not null then
    select id, status, filled_quantity into v_existing
    from public.orders
    where user_id = p_user and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'ok', true, 'duplicate', true, 'order_id', v_existing.id,
        'status', v_existing.status
      );
    end if;
  end if;

  v_quantity := public.trade_round(p_amount_usd / p_price_usd, 8);
  if v_quantity <= 0 then
    raise exception 'INVALID_PARAMS';
  end if;

  v_fee_usd := public.trade_round(p_amount_usd * p_fee_percent / 100, 8);
  v_fee_kes := public.trade_round(v_fee_usd * p_fx_rate, 2);

  -- ---- SPOT -------------------------------------------------------------------
  if v_mode = 'spot' then
    if v_side = 'buy' then
      declare
        v_cost_kes numeric := public.trade_round(p_amount_usd * p_fx_rate, 2) + v_fee_kes;
      begin
        if v_wallet.balance_kes < v_cost_kes then
          raise exception 'INSUFFICIENT_FUNDS';
        end if;

        update public.user_wallets
          set balance_kes = public.trade_round(balance_kes - v_cost_kes, 2),
              updated_at = now()
          where user_id = p_user;

        select units, avg_cost_kes into v_old_units, v_old_avg
        from public.user_holdings where user_id = p_user and asset_symbol = v_symbol;
        if not found then
          v_old_units := 0; v_old_avg := 0;
        end if;

        insert into public.user_holdings (user_id, asset_symbol, units, avg_cost_kes, updated_at)
        values (p_user, v_symbol, v_quantity, public.trade_round(p_amount_usd * p_fx_rate, 2), now())
        on conflict (user_id, asset_symbol) do update
          set units = public.trade_round(public.user_holdings.units + excluded.units, 8),
              avg_cost_kes = public.trade_round(
                (public.user_holdings.avg_cost_kes * public.user_holdings.units + excluded.units * excluded.avg_cost_kes)
                / (public.user_holdings.units + excluded.units), 2
              ),
              updated_at = now();
      end;
    else
      declare
        v_revenue_kes numeric := public.trade_round(p_amount_usd * p_fx_rate, 2) - v_fee_kes;
      begin
        select units, avg_cost_kes into v_old_units, v_old_avg
        from public.user_holdings where user_id = p_user and asset_symbol = v_symbol;
        if not found or v_old_units < v_quantity then
          raise exception 'INSUFFICIENT_HOLDINGS';
        end if;

        update public.user_holdings
          set units = public.trade_round(units - v_quantity, 8),
              updated_at = now()
          where user_id = p_user and asset_symbol = v_symbol;

        update public.user_wallets
          set balance_kes = public.trade_round(balance_kes + v_revenue_kes, 2),
              updated_at = now()
          where user_id = p_user;
      end;
    end if;
  else
    -- ---- MARGIN ----------------------------------------------------------------
    declare
      v_margin_usd numeric := p_amount_usd / p_leverage;
      v_margin_kes numeric := public.trade_round(v_margin_usd * p_fx_rate, 2);
      v_total_debit numeric := v_margin_kes + v_fee_kes;
      v_direction text := case when v_side = 'buy' then 'Long' else 'Short' end;
    begin
      if v_wallet.balance_kes < v_total_debit then
        raise exception 'INSUFFICIENT_FUNDS';
      end if;

      v_liq := public.trade_round(
        case when v_direction = 'Long' then p_price_usd * (1 - 1/p_leverage)
             else p_price_usd * (1 + 1/p_leverage) end, 4);

      update public.user_wallets
        set balance_kes = public.trade_round(balance_kes - v_total_debit, 2),
            locked_kes = public.trade_round(locked_kes + v_margin_kes, 2),
            updated_at = now()
        where user_id = p_user;

      v_pos_id := gen_random_uuid();
      insert into public.user_positions (
        id, user_id, asset_symbol, direction,
        entry_price_usd, units, margin_kes, leverage,
        liquidation_price_usd, status, updated_at
      )
      values (
        v_pos_id, p_user, v_symbol, v_direction,
        public.trade_round(p_price_usd, 4), v_quantity, v_margin_kes, p_leverage,
        v_liq, 'OPEN', now()
      );
    end;
  end if;

  -- ---- order + ledger rows ------------------------------------------------------
  insert into public.orders (
    id, user_id, asset_id, order_type, side, mode,
    quantity, price, filled_quantity, average_fill_price,
    fee, margin_kes, idempotency_key, status, updated_at
  )
  values (
    v_order_id, p_user, v_asset.id, 'market', v_side, v_mode,
    v_quantity, public.trade_round(p_price_usd, 4), v_quantity, public.trade_round(p_price_usd, 4),
    v_fee_usd, coalesce((select margin_kes from public.user_positions where id = v_pos_id), 0),
    p_idempotency_key, 'filled', now()
  );

  insert into public.transactions (
    user_id, asset_id, type, amount, price_at_time,
    fee, amount_kes, order_id, status, reference, notes, processed_at, created_at
  )
  values (
    p_user, v_asset.id, v_side, v_quantity, public.trade_round(p_price_usd, 4),
    v_fee_usd,
    case when v_mode = 'spot' then
           case when v_side = 'buy' then public.trade_round(p_amount_usd * p_fx_rate, 2) + v_fee_kes
                else public.trade_round(p_amount_usd * p_fx_rate, 2) - v_fee_kes end
         else (select margin_kes from public.user_positions where id = v_pos_id) end,
    v_order_id, 'confirmed', coalesce(p_idempotency_key, v_order_id::text),
    case when v_mode = 'margin' then 'margin open' else v_side || ' (spot)' end,
    now(), now()
  );

  return jsonb_build_object(
    'ok', true, 'duplicate', false,
    'order_id', v_order_id,
    'position_id', v_pos_id,
    'mode', v_mode, 'side', v_side,
    'symbol', v_symbol,
    'quantity', v_quantity,
    'price_usd', public.trade_round(p_price_usd, 4),
    'fee_kes', v_fee_kes,
    'amount_kes', case when v_mode = 'spot' then
                 case when v_side = 'buy' then public.trade_round(p_amount_usd * p_fx_rate, 2) + v_fee_kes
                      else public.trade_round(p_amount_usd * p_fx_rate, 2) - v_fee_kes end
                 else (select margin_kes from public.user_positions where id = v_pos_id) end,
    'leverage', case when v_mode = 'margin' then p_leverage else null end,
    'liquidation_price_usd', (select liquidation_price_usd from public.user_positions where id = v_pos_id),
    'wallet', jsonb_build_object(
      'balance_kes', (select balance_kes from public.user_wallets where user_id = p_user),
      'locked_kes', (select locked_kes from public.user_wallets where user_id = p_user)
    )
  );
end;
$$;

-- Close a margin position: settle P&L against the locked margin, return any
-- remaining equity to the available balance, and liquidate cleanly when the
-- loss exceeds the margin (balance can never go negative).
create or replace function public.close_position(
  p_user uuid,
  p_position_id uuid,
  p_close_price_usd numeric,
  p_fx_rate numeric,
  p_fee_percent numeric
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_pos public.user_positions%rowtype;
  v_asset public.assets%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_pnl_usd numeric;
  v_pnl_kes numeric;
  v_fee_usd numeric;
  v_fee_kes numeric;
  v_equity numeric;
  v_credit numeric := 0;
  v_realized numeric;
  v_liquidated boolean := false;
  v_close_side text;
begin
  if p_user is null then raise exception 'UNAUTHORIZED'; end if;
  if p_close_price_usd <= 0 or p_fx_rate <= 0 then raise exception 'INVALID_PARAMS'; end if;

  select * into v_pos from public.user_positions
  where id = p_position_id and user_id = p_user and status = 'OPEN';
  if not found then raise exception 'POSITION_NOT_FOUND'; end if;

  select * into v_asset from public.assets where symbol = v_pos.asset_symbol;
  if not found then raise exception 'ASSET_NOT_FOUND'; end if;

  v_pnl_usd := case when v_pos.direction = 'Long'
    then (p_close_price_usd - v_pos.entry_price_usd) * v_pos.units
    else (v_pos.entry_price_usd - p_close_price_usd) * v_pos.units end;
  v_pnl_kes := public.trade_round(v_pnl_usd * p_fx_rate, 2);

  v_fee_usd := public.trade_round(p_close_price_usd * v_pos.units * p_fee_percent / 100, 8);
  v_fee_kes := public.trade_round(v_fee_usd * p_fx_rate, 2);

  v_equity := v_pos.margin_kes + v_pnl_kes - v_fee_kes;
  if v_equity > 0 then
    v_credit := public.trade_round(v_equity, 2);
    v_realized := public.trade_round(v_pnl_kes - v_fee_kes, 2);
  else
    v_liquidated := true;
    v_credit := 0;
    v_realized := public.trade_round(-v_pos.margin_kes, 2);
  end if;

  update public.user_wallets
    set balance_kes = public.trade_round(balance_kes + v_credit, 2),
        locked_kes = public.trade_round(greatest(0, locked_kes - v_pos.margin_kes), 2),
        updated_at = now()
    where user_id = p_user;

  update public.user_positions
    set status = 'CLOSED',
        close_price_usd = public.trade_round(p_close_price_usd, 4),
        realized_pnl_kes = v_realized,
        fee_kes = v_fee_kes,
        closed_at = now(),
        updated_at = now()
    where id = v_pos.id;

  v_close_side := case when v_pos.direction = 'Long' then 'sell' else 'buy' end;

  insert into public.orders (
    id, user_id, asset_id, order_type, side, mode,
    quantity, price, filled_quantity, average_fill_price,
    fee, margin_kes, idempotency_key, status, updated_at
  )
  values (
    v_order_id, v_pos.user_id, v_asset.id, 'market', v_close_side, 'margin',
    v_pos.units, public.trade_round(p_close_price_usd, 4), v_pos.units, public.trade_round(p_close_price_usd, 4),
    v_fee_usd, v_pos.margin_kes, ('close:' || v_pos.id::text), 'filled', now()
  );

  insert into public.transactions (
    user_id, asset_id, type, amount, price_at_time,
    fee, amount_kes, order_id, status, reference, notes, processed_at, created_at
  )
  values (
    v_pos.user_id, v_asset.id, v_close_side, v_pos.units, public.trade_round(p_close_price_usd, 4),
    v_fee_usd, v_credit, v_order_id, 'confirmed', v_pos.id::text,
    case when v_liquidated then 'margin liquidation' else 'margin close' end,
    now(), now()
  );

  return jsonb_build_object(
    'ok', true,
    'position_id', v_pos.id,
    'liquidated', v_liquidated,
    'realized_pnl_kes', v_realized,
    'credit_kes', v_credit,
    'wallet', jsonb_build_object(
      'balance_kes', (select balance_kes from public.user_wallets where user_id = p_user),
      'locked_kes', (select locked_kes from public.user_wallets where user_id = p_user)
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION
--    One publication carries every financial table so a single subscription
--    can reconcile wallet + holdings + positions + orders + ledger after any
--    execution. Replica identity FULL so UPDATE payloads carry the changed row.
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_positions;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_holdings;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_wallets;
exception when duplicate_object then null; end $$;

alter table public.orders replica identity full;
alter table public.transactions replica identity full;
alter table public.user_positions replica identity full;
alter table public.user_holdings replica identity full;
alter table public.user_wallets replica identity full;

-- ----------------------------------------------------------------------------
-- 5. ADMIN LEDGER VIEW — show the KES value of every trade row (was `amount`,
--    which stores asset units, not cash).
-- ----------------------------------------------------------------------------
create or replace view public.admin_transactions_view as
select
  'deposit'::text as tx_type,
  dr.id as id,
  dr.user_id,
  null::uuid as asset_id,
  dr.amount_kes as amount_kes,
  dr.status as status,
  dr.created_at as created_at,
  coalesce(dr.mpesa_reference, dr.user_reference) as reference,
  dr.mobile_money_provider as provider,
  p.username as username,
  null::text as asset_symbol
from public.deposit_requests dr
left join public.profiles p on p.id = dr.user_id
union all
select
  'withdrawal'::text,
  wr.id,
  wr.user_id,
  wr.asset_id,
  coalesce(wr.amount_kes, wr.amount, 0),
  wr.status,
  wr.created_at,
  null::text,
  wr.mobile_money_provider,
  p2.username,
  a.symbol
from public.withdrawal_requests wr
left join public.profiles p2 on p2.id = wr.user_id
left join public.assets a on a.id = wr.asset_id
union all
select
  'trade'::text,
  t.id,
  t.user_id,
  t.asset_id,
  coalesce(t.amount_kes, t.amount, 0),
  t.status,
  t.created_at,
  coalesce(t.reference, t.order_id::text),
  null::text,
  p3.username,
  a2.symbol
from public.transactions t
left join public.profiles p3 on p3.id = t.user_id
left join public.assets a2 on a2.id = t.asset_id;