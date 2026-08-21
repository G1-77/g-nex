-- ============================================================================
-- GNEX TRADING ECOSYSTEM — CONDITIONAL ORDER ENGINE + FINANCIAL HARDENING
-- ----------------------------------------------------------------------------
-- 1. RPC privilege lockdown. Postgres grants EXECUTE to PUBLIC by default, so
--    SECURITY DEFINER trade RPCs (execute_trade / close_position) were callable
--    directly by any authenticated user with a fabricated price, and legacy
--    financial RPCs (process_withdrawal, fill_limit_order, confirm_deposit…)
--    were reachable without internal authorization. Only the service role may
--    call them now; user-facing access goes exclusively through the API routes.
-- 2. audit_logs.metadata — recordAudit() writes this column; the table never
--    had it, so every audit write failed silently.
-- 3. Conditional orders: stop_market / stop_limit / take_profit with trigger
--    prices, KES/unit reservations, expiry, activation state and a product
--    discriminator (quick_trade | spot | ftt).
-- 4. place_order / cancel_order / process_conditional_orders RPCs. The engine
--    is evaluated against SERVER-RESOLVED authoritative prices passed in by the
--    API layer (Postgres cannot fetch providers) and is concurrency-safe via
--    FOR UPDATE SKIP LOCKED. It also auto-liquidates margin positions whose
--    liquidation price has been crossed.
-- 5. Admin-controlled trading settings seeds.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUDIT LOG SCHEMA FIX
-- ----------------------------------------------------------------------------
alter table public.audit_logs add column if not exists metadata jsonb;

-- ----------------------------------------------------------------------------
-- 2. RPC PRIVILEGE LOCKDOWN
-- ----------------------------------------------------------------------------
revoke execute on function
  public.execute_trade(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text),
  public.close_position(uuid, uuid, numeric, numeric, numeric)
from public, anon, authenticated;
grant execute on function
  public.execute_trade(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text),
  public.close_position(uuid, uuid, numeric, numeric, numeric)
to service_role;

revoke execute on function
  public.lock_funds(uuid, uuid, numeric),
  public.release_funds(uuid, uuid, numeric),
  public.settle_trade(uuid, uuid, uuid, numeric, numeric, numeric),
  public.execute_market_order(uuid, uuid, order_side, numeric, numeric, numeric),
  public.execute_market_order(uuid, uuid, order_side, numeric, numeric),
  public.fill_limit_order(uuid, numeric),
  public.create_order(uuid, uuid, order_side, order_type, numeric, numeric, numeric),
  public.confirm_deposit(uuid, uuid, uuid),
  public.process_withdrawal(uuid, uuid),
  public.log_admin_action(uuid, text, text, text, jsonb, jsonb),
  public.check_price_alerts(text, numeric),
  public.create_notification(uuid, text, text, jsonb)
from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. CONDITIONAL ORDER SCHEMA
-- ----------------------------------------------------------------------------

-- Extended order vocabulary (text CHECK constraints, matching the baseline style).
alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders add constraint orders_order_type_check
  check (order_type in ('market', 'limit', 'stop_market', 'stop_limit', 'take_profit'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('open', 'triggered', 'filled', 'partial', 'cancelled', 'expired'));

-- Conditional-order columns.
alter table public.orders add column if not exists trigger_price numeric;
alter table public.orders add column if not exists reserved_kes numeric(14,2) not null default 0;
alter table public.orders add column if not exists reserved_units numeric default 0;
alter table public.orders add column if not exists reserved_avg_cost_kes numeric default 0;
alter table public.orders add column if not exists expires_at timestamptz;
alter table public.orders add column if not exists activated_at timestamptz;

-- Product discriminator shared by Quick Trade / Spot / FTT.
alter table public.orders add column if not exists product text not null default 'spot';
do $$ begin
  alter table public.orders add constraint orders_product_check
    check (product in ('quick_trade', 'spot', 'ftt'));
exception when duplicate_object then null; end $$;

create index if not exists idx_orders_active on public.orders (status)
  where status in ('open', 'triggered');
create index if not exists idx_orders_expiry on public.orders (expires_at)
  where expires_at is not null and status in ('open', 'triggered');
create index if not exists idx_positions_open on public.user_positions (status)
  where status = 'OPEN';

-- ----------------------------------------------------------------------------
-- 4. EXECUTE_TRADE gains the product discriminator (backwards compatible).
-- ----------------------------------------------------------------------------
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
  p_idempotency_key text default null,
  p_product text default 'spot'
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
  v_realized numeric;
  v_existing record;
begin
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
  if p_product not in ('quick_trade','spot','ftt') then
    raise exception 'INVALID_PARAMS';
  end if;

  select * into v_asset from public.assets
  where symbol = v_symbol and is_active = true;
  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  insert into public.user_wallets (user_id) values (p_user) on conflict do nothing;
  select * into v_wallet from public.user_wallets where user_id = p_user;
  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

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
        values (p_user, v_symbol, v_quantity, public.trade_round(p_price_usd * p_fx_rate, 4), now())
        on conflict (user_id, asset_symbol) do update
          set units = public.trade_round(public.user_holdings.units + excluded.units, 8),
              avg_cost_kes = public.trade_round(
                (public.user_holdings.avg_cost_kes * public.user_holdings.units + excluded.units * excluded.avg_cost_kes)
                / (public.user_holdings.units + excluded.units), 4
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

        v_realized := public.trade_round(v_revenue_kes - v_quantity * v_old_avg, 2);

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

  insert into public.orders (
    id, user_id, asset_id, order_type, side, mode, product,
    quantity, price, filled_quantity, average_fill_price,
    fee, margin_kes, idempotency_key, status, updated_at, realized_pnl_kes
  )
  values (
    v_order_id, p_user, v_asset.id, 'market', v_side, v_mode, p_product,
    v_quantity, public.trade_round(p_price_usd, 4), v_quantity, public.trade_round(p_price_usd, 4),
    v_fee_usd, coalesce((select margin_kes from public.user_positions where id = v_pos_id), 0),
    p_idempotency_key, 'filled', now(),
    case when v_mode = 'spot' and v_side = 'sell' then v_realized else null end
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
    'realized_pnl_kes', case when v_mode = 'spot' and v_side = 'sell' then v_realized else null end,
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

revoke execute on function
  public.execute_trade(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text)
from public, anon, authenticated;
grant execute on function
  public.execute_trade(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text)
to service_role;

-- ----------------------------------------------------------------------------
-- 5. PLACE ORDER (conditional types only; market orders keep execute_trade).
--    Reserves KES for buys and units for sells up front so an open order can
--    never overcommit the wallet or the same holdings twice.
-- ----------------------------------------------------------------------------
create or replace function public.place_order(
  p_user uuid,
  p_asset_symbol text,
  p_side text,
  p_order_type text,
  p_amount_usd numeric,
  p_limit_price numeric default null,
  p_trigger_price numeric default null,
  p_reference_price numeric default null,
  p_fx_rate numeric default null,
  p_fee_percent numeric default null,
  p_product text default 'spot',
  p_expires_at timestamptz default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_asset public.assets%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_holding public.user_holdings%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_side text := lower(p_side);
  v_type text := lower(p_order_type);
  v_symbol text := upper(p_asset_symbol);
  v_quantity numeric;
  v_est_fee_usd numeric;
  v_reserved_kes numeric := 0;
  v_avg_cost numeric := 0;
  v_existing record;
begin
  if p_user is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount_usd is null or p_amount_usd <= 0 then raise exception 'INVALID_PARAMS'; end if;
  if v_side not in ('buy','sell') then raise exception 'INVALID_PARAMS'; end if;
  if v_type not in ('limit','stop_market','stop_limit','take_profit') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;
  if p_product not in ('quick_trade','spot','ftt') then raise exception 'INVALID_PARAMS'; end if;
  if p_fx_rate is null or p_fx_rate <= 0 or p_fee_percent is null or p_fee_percent < 0 then
    raise exception 'INVALID_PARAMS';
  end if;
  -- Conditional orders are spot-only: margin conditionals need a position
  -- model that does not exist yet, and mixing them would blur settlement.
  if p_product = 'ftt' then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  if v_type in ('limit','stop_limit') and (p_limit_price is null or p_limit_price <= 0) then
    raise exception 'INVALID_LIMIT_PRICE';
  end if;
  if v_type in ('stop_market','stop_limit','take_profit') and (p_trigger_price is null or p_trigger_price <= 0) then
    raise exception 'INVALID_TRIGGER_PRICE';
  end if;

  -- Trigger sanity against the authoritative reference price (Binance rules):
  --   buy stop triggers below the market, sell stop above;
  --   buy take-profit above, sell take-profit below.
  if p_trigger_price is not null and p_reference_price is not null and p_reference_price > 0 then
    if v_type in ('stop_market','stop_limit') then
      if v_side = 'buy' and p_trigger_price >= p_reference_price then
        raise exception 'TRIGGER_PRICE_INVALID';
      end if;
      if v_side = 'sell' and p_trigger_price <= p_reference_price then
        raise exception 'TRIGGER_PRICE_INVALID';
      end if;
    else
      if v_side = 'buy' and p_trigger_price <= p_reference_price then
        raise exception 'TRIGGER_PRICE_INVALID';
      end if;
      if v_side = 'sell' and p_trigger_price >= p_reference_price then
        raise exception 'TRIGGER_PRICE_INVALID';
      end if;
    end if;
  end if;

  select * into v_asset from public.assets
  where symbol = v_symbol and is_active = true;
  if not found then raise exception 'ASSET_NOT_FOUND'; end if;

  insert into public.user_wallets (user_id) values (p_user) on conflict do nothing;
  select * into v_wallet from public.user_wallets where user_id = p_user;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;

  if p_idempotency_key is not null then
    select id, status into v_existing
    from public.orders
    where user_id = p_user and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', v_existing.id, 'status', v_existing.status);
    end if;
  end if;

  -- Quantity is fixed at placement against the limit price for resting orders
  -- (a stop_market fills at market, but its size is still quoted up front).
  v_quantity := public.trade_round(
    p_amount_usd / coalesce(nullif(p_limit_price, 0), nullif(p_trigger_price, 0), p_reference_price), 8);
  if v_quantity is null or v_quantity <= 0 then raise exception 'INVALID_PARAMS'; end if;

  v_est_fee_usd := public.trade_round(p_amount_usd * p_fee_percent / 100, 8);

  if v_side = 'buy' then
    v_reserved_kes := public.trade_round(p_amount_usd * p_fx_rate, 2)
                    + public.trade_round(v_est_fee_usd * p_fx_rate, 2);
    if v_wallet.balance_kes < v_reserved_kes then
      raise exception 'INSUFFICIENT_FUNDS';
    end if;

    update public.user_wallets
      set balance_kes = public.trade_round(balance_kes - v_reserved_kes, 2),
          locked_kes = public.trade_round(locked_kes + v_reserved_kes, 2),
          updated_at = now()
      where user_id = p_user;
  else
    select * into v_holding from public.user_holdings
    where user_id = p_user and asset_symbol = v_symbol;
    if not found or v_holding.units < v_quantity then
      raise exception 'INSUFFICIENT_HOLDINGS';
    end if;
    v_avg_cost := v_holding.avg_cost_kes;

    update public.user_holdings
      set units = public.trade_round(units - v_quantity, 8),
          updated_at = now()
      where user_id = p_user and asset_symbol = v_symbol;
  end if;

  insert into public.orders (
    id, user_id, asset_id, order_type, side, mode, product,
    quantity, price, trigger_price, filled_quantity,
    fee, margin_kes, reserved_kes, reserved_units, reserved_avg_cost_kes,
    expires_at, idempotency_key, status, updated_at
  )
  values (
    v_order_id, p_user, v_asset.id, v_type, v_side, 'spot', p_product,
    v_quantity, p_limit_price, p_trigger_price, 0,
    0, 0, v_reserved_kes,
    case when v_side = 'sell' then v_quantity else 0 end,
    case when v_side = 'sell' then v_avg_cost else 0 end,
    p_expires_at, p_idempotency_key, 'open', now()
  );

  return jsonb_build_object(
    'ok', true, 'duplicate', false,
    'order_id', v_order_id,
    'order_type', v_type, 'side', v_side, 'symbol', v_symbol,
    'quantity', v_quantity,
    'limit_price', p_limit_price,
    'trigger_price', p_trigger_price,
    'reserved_kes', v_reserved_kes,
    'expires_at', p_expires_at,
    'wallet', jsonb_build_object(
      'balance_kes', (select balance_kes from public.user_wallets where user_id = p_user),
      'locked_kes', (select locked_kes from public.user_wallets where user_id = p_user)
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. CANCEL ORDER — releases reservations server-side; the UI only ever asks.
-- ----------------------------------------------------------------------------
create or replace function public.cancel_order(
  p_user uuid,
  p_order_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_user is null or p_order_id is null then raise exception 'INVALID_PARAMS'; end if;

  select * into v_order from public.orders
  where id = p_order_id and user_id = p_user
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status not in ('open','triggered') then
    raise exception 'ORDER_NOT_CANCELLABLE';
  end if;

  if v_order.reserved_kes > 0 then
    update public.user_wallets
      set balance_kes = public.trade_round(balance_kes + v_order.reserved_kes, 2),
          locked_kes = public.trade_round(greatest(0, locked_kes - v_order.reserved_kes), 2),
          updated_at = now()
      where user_id = p_user;
  end if;

  if v_order.reserved_units > 0 then
    update public.user_holdings h
      set units = public.trade_round(h.units + v_order.reserved_units, 8),
          updated_at = now()
      from public.assets a
      where a.id = v_order.asset_id
        and h.asset_symbol = a.symbol
        and h.user_id = p_user;
  end if;

  update public.orders
    set status = 'cancelled',
        reserved_kes = 0,
        reserved_units = 0,
        updated_at = now()
    where id = v_order.id;

  return jsonb_build_object('ok', true, 'order_id', v_order.id, 'status', 'cancelled');
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. CONDITIONAL ORDER ENGINE
--    Called by POST /api/orders/engine with SERVER-resolved prices:
--      p_prices: {"BTC": 67123.45, "XAU": 3301.2, ...}
--    Evaluates triggers, fills resting orders atomically, expires stale ones
--    and liquidates crossed margin positions. SKIP LOCKED keeps concurrent
--    ticks from double-processing the same row.
-- ----------------------------------------------------------------------------
create or replace function public.process_conditional_orders(
  p_prices jsonb,
  p_fx_rate numeric,
  p_fee_percent numeric
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_filled int := 0;
  v_triggered int := 0;
  v_expired int := 0;
  v_liquidated int := 0;
  v_order record;
  v_pos record;
  v_price numeric;
  v_fill_price numeric;
  v_qty numeric;
  v_amount_usd numeric;
  v_fee_usd numeric;
  v_fee_kes numeric;
  v_actual_kes numeric;
  v_refund numeric;
  v_revenue_kes numeric;
  v_realized numeric;
  v_limit_ok boolean;
begin
  if p_fx_rate is null or p_fx_rate <= 0 or p_fee_percent is null or p_fee_percent < 0 then
    raise exception 'INVALID_PARAMS';
  end if;

  -- ---- 7a. Expiry -----------------------------------------------------------
  with expired as (
    update public.orders o
      set status = 'expired',
          updated_at = now()
    where status in ('open','triggered')
      and expires_at is not null
      and expires_at < now()
    returning o.*
  )
  select coalesce(count(*), 0) into v_expired from expired;

  -- Release reservations for the rows just expired (still carrying them).
  for v_order in
    select o.*, a.symbol as asset_symbol
    from public.orders o
    join public.assets a on a.id = o.asset_id
    where o.status = 'expired'
      and (o.reserved_kes > 0 or o.reserved_units > 0)
    for update of o skip locked
  loop
    if v_order.reserved_kes > 0 then
      update public.user_wallets
        set balance_kes = public.trade_round(balance_kes + v_order.reserved_kes, 2),
            locked_kes = public.trade_round(greatest(0, locked_kes - v_order.reserved_kes), 2),
            updated_at = now()
        where user_id = v_order.user_id;
    end if;
    if v_order.reserved_units > 0 then
      update public.user_holdings h
        set units = public.trade_round(h.units + v_order.reserved_units, 8),
            updated_at = now()
        from public.assets a
        where a.id = v_order.asset_id
          and h.asset_symbol = a.symbol
          and h.user_id = v_order.user_id;
    end if;
    update public.orders set reserved_kes = 0, reserved_units = 0 where id = v_order.id;
  end loop;

  -- ---- 7b. Triggers + fills --------------------------------------------------
  for v_order in
    select o.*, a.symbol as asset_symbol
    from public.orders o
    join public.assets a on a.id = o.asset_id
    where o.status in ('open','triggered')
      and o.order_type in ('limit','stop_market','stop_limit','take_profit')
    order by o.created_at
    for update of o skip locked
  loop
    v_price := coalesce((p_prices ->> v_order.asset_symbol)::numeric, 0);
    if v_price is null or v_price <= 0 then
      continue;
    end if;

    -- Stage 1: dormant conditional waiting for its trigger.
    if v_order.status = 'open' and v_order.order_type <> 'limit' then
      v_limit_ok :=
        (v_order.order_type = 'stop_market' and
          ((v_order.side = 'buy' and v_price <= v_order.trigger_price) or
           (v_order.side = 'sell' and v_price >= v_order.trigger_price)))
        or (v_order.order_type = 'take_profit' and
          ((v_order.side = 'buy' and v_price >= v_order.trigger_price) or
           (v_order.side = 'sell' and v_price <= v_order.trigger_price)))
        or (v_order.order_type = 'stop_limit' and
          ((v_order.side = 'buy' and v_price <= v_order.trigger_price) or
           (v_order.side = 'sell' and v_price >= v_order.trigger_price)));

      if not v_limit_ok then
        continue;
      end if;

      update public.orders
        set status = 'triggered', activated_at = now(), updated_at = now()
        where id = v_order.id;
      v_triggered := v_triggered + 1;

      -- A stop-limit becomes a resting limit order and waits for its price.
      if v_order.order_type = 'stop_limit' then
        continue;
      end if;

      -- stop_market / take_profit execute immediately at market.
      v_order.status := 'triggered';
    end if;

    -- Stage 2: resting limit orders (native limits and triggered stop-limits)
    -- fill when the authoritative price crosses their limit.
    if v_order.order_type in ('limit','stop_limit') then
      v_limit_ok :=
        (v_order.side = 'buy' and v_price <= v_order.price) or
        (v_order.side = 'sell' and v_price >= v_order.price);
      if not v_limit_ok then
        continue;
      end if;
    end if;

    -- Fill at the authoritative market price (never worse than the limit).
    v_fill_price := v_price;
    v_qty := v_order.quantity - v_order.filled_quantity;
    if v_qty <= 0 then continue; end if;
    v_amount_usd := public.trade_round(v_qty * v_fill_price, 8);
    v_fee_usd := public.trade_round(v_amount_usd * p_fee_percent / 100, 8);
    v_fee_kes := public.trade_round(v_fee_usd * p_fx_rate, 2);

    if v_order.side = 'buy' then
      declare
        v_holding public.user_holdings%rowtype;
      begin
        v_actual_kes := public.trade_round(v_amount_usd * p_fx_rate, 2) + v_fee_kes;
        v_refund := public.trade_round(greatest(0, v_order.reserved_kes - v_actual_kes), 2);

        update public.user_wallets
          set balance_kes = public.trade_round(balance_kes + v_refund, 2),
              locked_kes = public.trade_round(greatest(0, locked_kes - v_order.reserved_kes), 2),
              updated_at = now()
          where user_id = v_order.user_id;

        select * into v_holding from public.user_holdings
        where user_id = v_order.user_id and asset_symbol = v_order.asset_symbol;
        if not found then
          insert into public.user_holdings (user_id, asset_symbol, units, avg_cost_kes, updated_at)
          values (v_order.user_id, v_order.asset_symbol, v_qty,
                  public.trade_round(v_amount_usd * p_fx_rate / v_qty, 4), now());
        else
          update public.user_holdings
            set units = public.trade_round(units + v_qty, 8),
                avg_cost_kes = public.trade_round(
                  (avg_cost_kes * units + v_actual_kes) / (units + v_qty), 4),
                updated_at = now()
            where user_id = v_order.user_id and asset_symbol = v_order.asset_symbol;
        end if;
      end;
    else
      -- Units were reserved at placement; credit revenue net of fee.
      v_revenue_kes := public.trade_round(v_amount_usd * p_fx_rate, 2) - v_fee_kes;
      v_realized := public.trade_round(v_revenue_kes - v_qty * v_order.reserved_avg_cost_kes, 2);

      update public.user_wallets
        set balance_kes = public.trade_round(balance_kes + v_revenue_kes, 2),
            updated_at = now()
        where user_id = v_order.user_id;
    end if;

    update public.orders
      set status = 'filled',
          filled_quantity = v_order.quantity,
          average_fill_price = public.trade_round(v_fill_price, 4),
          fee = v_fee_usd,
          reserved_kes = 0,
          reserved_units = 0,
          realized_pnl_kes = case when v_order.side = 'sell' then v_realized else null end,
          updated_at = now()
      where id = v_order.id;

    insert into public.transactions (
      user_id, asset_id, type, amount, price_at_time,
      fee, amount_kes, order_id, status, reference, notes, processed_at, created_at
    )
    values (
      v_order.user_id, v_order.asset_id, v_order.side, v_qty, public.trade_round(v_fill_price, 4),
      v_fee_usd,
      case when v_order.side = 'buy' then v_actual_kes else v_revenue_kes end,
      v_order.id, 'confirmed', v_order.id::text,
      v_order.order_type || ' fill', now(), now()
    );

    v_filled := v_filled + 1;
  end loop;

  -- ---- 7c. Margin auto-liquidation -------------------------------------------
  for v_pos in
    select p.*, a.symbol as asset_symbol
    from public.user_positions p
    join public.assets a on a.symbol = p.asset_symbol
    where p.status = 'OPEN'
      and p.liquidation_price_usd is not null
    order by p.created_at
    for update of p skip locked
  loop
    v_price := coalesce((p_prices ->> v_pos.asset_symbol)::numeric, 0);
    if v_price is null or v_price <= 0 then continue; end if;

    if (v_pos.direction = 'Long' and v_price <= v_pos.liquidation_price_usd) or
       (v_pos.direction = 'Short' and v_price >= v_pos.liquidation_price_usd) then
      perform public.close_position(v_pos.user_id, v_pos.id, v_price, p_fx_rate, p_fee_percent);
      v_liquidated := v_liquidated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'filled', v_filled,
    'triggered', v_triggered,
    'expired', v_expired,
    'liquidated', v_liquidated
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. PRIVILEGES ON NEW ENGINE RPCs — service role only.
-- ----------------------------------------------------------------------------
revoke execute on function
  public.place_order(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text, timestamptz, text),
  public.cancel_order(uuid, uuid),
  public.process_conditional_orders(jsonb, numeric, numeric)
from public, anon, authenticated;
grant execute on function
  public.place_order(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text, timestamptz, text),
  public.cancel_order(uuid, uuid),
  public.process_conditional_orders(jsonb, numeric, numeric)
to service_role;

-- ----------------------------------------------------------------------------
-- 9. ADMIN-CONTROLLED TRADING SETTINGS (defaults; admin UI writes overrides).
-- ----------------------------------------------------------------------------
insert into public.platform_settings (key, value) values
  ('trading_enabled', 'true'::jsonb),
  ('quick_trade_enabled', 'true'::jsonb),
  ('spot_enabled', 'true'::jsonb),
  ('ftt_enabled', 'false'::jsonb),
  ('min_trade_usd', '1'::jsonb),
  ('max_trade_usd', '50000'::jsonb),
  ('max_leverage', '100'::jsonb)
on conflict (key) do nothing;
