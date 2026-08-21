-- ============================================================================
-- GNEX — Real trader ROI engine (daily-computed, realized-P&L based)
--
-- * orders.realized_pnl_kes stores P&L at fill time for spot sells and margin
--   closes, so historical ROI never drifts when avg-cost changes later.
-- * profiles gains roi_realized_kes / roi_invested_kes / roi_computed_at so the
--   value is materialized once per day (get_user_roi refreshes when stale).
-- * get_user_roi is the single public surface: returns scalars only, no wallet
--   breakdown, safe to expose on profiles / leaderboards.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Track realized P&L on orders at fill time.
-- ----------------------------------------------------------------------------
alter table public.orders add column if not exists realized_pnl_kes numeric(14,2);

-- Re-declare execute_trade so spot sells write realized_pnl_kes on the order.
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
  v_realized numeric;
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

        -- Realized P&L captured at fill time (revenue minus cost basis).
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
    fee, margin_kes, idempotency_key, status, updated_at, realized_pnl_kes
  )
  values (
    v_order_id, p_user, v_asset.id, 'market', v_side, v_mode,
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

-- Re-declare close_position so the close order also carries realized P&L.
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
    fee, margin_kes, idempotency_key, status, updated_at, realized_pnl_kes
  )
  values (
    v_order_id, v_pos.user_id, v_asset.id, 'market', v_close_side, 'margin',
    v_pos.units, public.trade_round(p_close_price_usd, 4), v_pos.units, public.trade_round(p_close_price_usd, 4),
    v_fee_usd, v_pos.margin_kes, ('close:' || v_pos.id::text), 'filled', now(), v_realized
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

-- Backfill any holdings created before the per-unit cost fix (the old first
-- insert stored total KES cost in avg_cost_kes; divide by units to normalize).
update public.user_holdings
set avg_cost_kes = public.trade_round(avg_cost_kes / units, 4)
where units > 0 and avg_cost_kes / units < 100000000;

-- Best-effort backfill for historical spot sells: revenue (net of fee) minus
-- the cost basis recorded at the time (current avg cost where history is gone).
do $$
declare
  r record;
  v_avg numeric;
begin
  for r in
    select o.id, o.user_id, o.asset_id, o.filled_quantity, t.amount_kes as rev_kes
    from public.orders o
    join public.transactions t on t.order_id = o.id and t.type = 'sell'
    where o.side = 'sell' and o.mode = 'spot' and o.status = 'filled'
      and o.realized_pnl_kes is null
  loop
    select avg_cost_kes into v_avg from public.user_holdings
    where user_id = r.user_id
      and asset_symbol = (select symbol from public.assets a where a.id = r.asset_id);
    update public.orders
      set realized_pnl_kes = public.trade_round(
        coalesce(r.rev_kes, 0) - coalesce(v_avg, 0) * r.filled_quantity, 2)
      where id = r.id;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Materialized, daily-refreshed ROI on profiles.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists roi_realized_kes numeric(14,2);
alter table public.profiles add column if not exists roi_invested_kes numeric(14,2);
alter table public.profiles add column if not exists roi_computed_at timestamptz;

create or replace function public.refresh_user_roi(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_realized numeric := 0;
  v_invested numeric := 0;
  v_roi numeric := 0;
begin
  if p_user is null then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); end if;

  select
    coalesce((select sum(realized_pnl_kes) from public.user_positions
      where user_id = p_user and status = 'CLOSED' and closed_at >= now() - interval '30 days'), 0)
    + coalesce((select sum(realized_pnl_kes) from public.orders
      where user_id = p_user and side = 'sell' and mode = 'spot'
        and realized_pnl_kes is not null and created_at >= now() - interval '30 days'), 0)
  into v_realized;

  select coalesce(sum(amount_kes), 0) into v_invested
  from public.deposit_requests
  where user_id = p_user and status = 'confirmed';

  if v_invested > 0 then
    v_roi := public.trade_round(v_realized / v_invested * 100, 2);
  end if;

  update public.profiles
    set monthly_roi = v_roi,
        roi_realized_kes = v_realized,
        roi_invested_kes = v_invested,
        roi_computed_at = now()
    where id = p_user;

  return jsonb_build_object(
    'ok', true,
    'roi_pct', v_roi,
    'realized_kes', v_realized,
    'invested_kes', v_invested,
    'computed_at', now()
  );
end;
$$;

-- Public read surface: returns the cached value, refreshing it when stale
-- (>24h) or when forced. Safe to call for any user — returns scalars only.
create or replace function public.get_user_roi(p_user uuid, p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_prof public.profiles%rowtype;
begin
  if p_user is null then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); end if;

  select * into v_prof from public.profiles where id = p_user;
  if not found then return jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); end if;

  if p_force or v_prof.roi_computed_at is null or v_prof.roi_computed_at < now() - interval '24 hours' then
    return public.refresh_user_roi(p_user);
  end if;

  return jsonb_build_object(
    'ok', true,
    'roi_pct', coalesce(v_prof.monthly_roi, 0),
    'realized_kes', coalesce(v_prof.roi_realized_kes, 0),
    'invested_kes', coalesce(v_prof.roi_invested_kes, 0),
    'computed_at', v_prof.roi_computed_at
  );
end;
$$;

grant execute on function public.get_user_roi(uuid, boolean) to authenticated, anon;
grant execute on function public.refresh_user_roi(uuid) to authenticated, anon;