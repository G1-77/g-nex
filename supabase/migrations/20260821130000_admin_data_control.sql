-- ============================================================================
-- GNEX — Admin data control (delete everything, audit-guarded)
--
-- * data.delete permission (super_admin by default) gates every destructive
--   action in the admin API.
-- * SECURITY DEFINER delete RPCs keep FK-safe ordering + integrity inside a
--   single transaction; routes enforce permissions and write the audit log.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. data.delete permission.
-- ----------------------------------------------------------------------------
insert into public.admin_permissions (code, name, description) values
  ('data.delete', 'Data — Delete', 'Permanently delete financial records, content, and accounts.')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description;

-- Grant the new permission to super_admins (stored arrays are jsonb).
update public.admin_roles
set permissions = coalesce(permissions, '[]'::jsonb) || jsonb_build_array('data.delete')
where role = 'super_admin'
  and not coalesce(permissions, '[]'::jsonb) ? 'data.delete';

-- ----------------------------------------------------------------------------
-- 2. Delete RPCs (service-role call sites only).
-- ----------------------------------------------------------------------------

-- Delete a market order and its ledger transactions.
create or replace function public.admin_delete_order(p_order_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_tx int := 0;
begin
  if p_order_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND'); end if;

  delete from public.transactions where order_id = p_order_id;
  get diagnostics v_tx = row_count;

  delete from public.orders where id = p_order_id;

  return jsonb_build_object('ok', true, 'order_id', p_order_id, 'deleted_transactions', v_tx);
end;
$$;

-- Delete a single ledger transaction.
create or replace function public.admin_delete_transaction(p_tx_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if p_tx_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  delete from public.transactions where id = p_tx_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'TRANSACTION_NOT_FOUND'); end if;

  return jsonb_build_object('ok', true, 'tx_id', p_tx_id);
end;
$$;

-- Delete a position; an OPEN position's locked margin is released back to the
-- available balance so funds are never stranded by a manual removal.
create or replace function public.admin_delete_position(p_position_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_pos public.user_positions%rowtype;
begin
  if p_position_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  select * into v_pos from public.user_positions where id = p_position_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'POSITION_NOT_FOUND'); end if;

  if v_pos.status = 'OPEN' and v_pos.margin_kes > 0 then
    update public.user_wallets
      set balance_kes = public.trade_round(balance_kes + v_pos.margin_kes, 2),
          locked_kes = public.trade_round(greatest(0, locked_kes - v_pos.margin_kes), 2),
          updated_at = now()
      where user_id = v_pos.user_id;
  end if;

  delete from public.user_positions where id = p_position_id;

  return jsonb_build_object('ok', true, 'position_id', p_position_id, 'released_kes', v_pos.margin_kes);
end;
$$;

-- Delete a holdings row (composite key user+asset).
create or replace function public.admin_delete_holding(p_user uuid, p_asset_symbol text, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if p_user is null or p_asset_symbol is null or p_admin is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS');
  end if;

  delete from public.user_holdings where user_id = p_user and asset_symbol = upper(p_asset_symbol);
  if not found then return jsonb_build_object('ok', false, 'error', 'HOLDING_NOT_FOUND'); end if;

  return jsonb_build_object('ok', true, 'user_id', p_user, 'asset_symbol', upper(p_asset_symbol));
end;
$$;

-- Delete a deposit request (funding records carry no ledger transaction).
create or replace function public.admin_delete_deposit(p_deposit_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if p_deposit_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  delete from public.deposit_requests where id = p_deposit_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'DEPOSIT_NOT_FOUND'); end if;

  return jsonb_build_object('ok', true, 'deposit_id', p_deposit_id);
end;
$$;

-- Delete a withdrawal request plus any ledger row created for it.
create or replace function public.admin_delete_withdrawal(p_withdrawal_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_wr public.withdrawal_requests%rowtype;
begin
  if p_withdrawal_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  select * into v_wr from public.withdrawal_requests where id = p_withdrawal_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'WITHDRAWAL_NOT_FOUND'); end if;

  delete from public.transactions
  where user_id = v_wr.user_id and type = 'withdrawal'
    and amount = v_wr.amount
    and created_at >= v_wr.created_at - interval '5 minutes';

  delete from public.withdrawal_requests where id = p_withdrawal_id;

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id);
end;
$$;

-- Delete a post and everything attached to it.
create or replace function public.admin_delete_post(p_post_id uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_post public.posts%rowtype;
  v_counts jsonb;
begin
  if p_post_id is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  select * into v_post from public.posts where id = p_post_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'POST_NOT_FOUND'); end if;

  delete from public.comments where post_id = p_post_id;
  delete from public.likes where post_id = p_post_id;
  delete from public.post_likes where post_id = p_post_id;
  delete from public.trade_tags where post_id = p_post_id;
  delete from public.editorial_picks where post_id = p_post_id;
  delete from public.reports where content_id = p_post_id::text and content_type = 'post';
  delete from public.posts where id = p_post_id;

  v_counts := jsonb_build_object('deleted', true);

  return jsonb_build_object('ok', true, 'post_id', p_post_id, 'summary', v_counts);
end;
$$;

-- Wipe a user's trading history: transactions, orders, positions, holdings,
-- and reset the wallet to a clean zero state. Keeps funding records.
create or replace function public.admin_wipe_user_financials(p_user uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_orders int := 0;
  v_tx int := 0;
  v_positions int := 0;
  v_holdings int := 0;
begin
  if p_user is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;

  delete from public.transactions where user_id = p_user;
  get diagnostics v_tx = row_count;
  delete from public.orders where user_id = p_user;
  get diagnostics v_orders = row_count;
  delete from public.user_positions where user_id = p_user;
  get diagnostics v_positions = row_count;
  delete from public.user_holdings where user_id = p_user;
  get diagnostics v_holdings = row_count;

  update public.user_wallets
    set balance_kes = 0, locked_kes = 0, reserve_kes = 0, escrow_kes = 0,
        updated_at = now()
    where user_id = p_user;

  return jsonb_build_object(
    'ok', true, 'user_id', p_user,
    'deleted_orders', v_orders,
    'deleted_transactions', v_tx,
    'deleted_positions', v_positions,
    'deleted_holdings', v_holdings
  );
end;
$$;

-- Full account deletion in FK-safe dependency order. Guards against deleting
-- yourself or a super_admin. The calling route deletes auth.users afterwards
-- via the auth admin API (profiles.id has no FK to auth.users).
create or replace function public.admin_delete_user(p_user uuid, p_admin uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_counts jsonb;
begin
  if p_user is null or p_admin is null then return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMS'); end if;
  if p_user = p_admin then return jsonb_build_object('ok', false, 'error', 'CANNOT_DELETE_SELF'); end if;

  select role::text into v_role from public.admin_roles where user_id = p_user;
  if v_role = 'super_admin' then return jsonb_build_object('ok', false, 'error', 'CANNOT_DELETE_SUPER_ADMIN'); end if;

  -- Social content authored by the user (children cascade via posts).
  delete from public.notifications where recipient_id = p_user or notifier_id = p_user;
  delete from public.messages where sender_id = p_user or recipient_id = p_user;
  delete from public.comments where user_id = p_user;
  delete from public.likes where user_id = p_user;
  delete from public.post_likes where user_id = p_user;
  delete from public.follows where follower_id = p_user or following_id = p_user;
  delete from public.post_likes where post_id in (select id from public.posts where user_id = p_user);
  delete from public.reports where reporter_id = p_user
    or (content_type = 'post' and content_id in (select id::text from public.posts where user_id = p_user));
  delete from public.trade_tags where post_id in (select id from public.posts where user_id = p_user);
  delete from public.editorial_picks where post_id in (select id from public.posts where user_id = p_user);
  delete from public.posts where user_id = p_user;
  delete from public.user_suspensions where user_id = p_user;

  -- Trading data (transactions before orders — FK blocks the reverse).
  delete from public.transactions where user_id = p_user;
  delete from public.orders where user_id = p_user;
  delete from public.user_positions where user_id = p_user;
  delete from public.user_holdings where user_id = p_user;
  delete from public.user_wallets where user_id = p_user;
  delete from public.fund_locks where user_id = p_user;
  delete from public.deposit_requests where user_id = p_user;
  delete from public.withdrawal_requests where user_id = p_user;
  delete from public.price_alerts where user_id = p_user;
  delete from public.watchlist where user_id = p_user;
  delete from public.user_watchlists where user_id = p_user;
  delete from public.trader_reputation where user_id = p_user;

  -- References FROM other rows pointing at this user (anonymize, keep history).
  update public.audit_logs set admin_id = null where admin_id = p_user;
  update public.reports set resolved_by = null where resolved_by = p_user;
  update public.deposit_requests set reviewed_by = null where reviewed_by = p_user;
  update public.withdrawal_requests set processed_by = null where processed_by = p_user;
  update public.transactions set processed_by = null where processed_by = p_user;
  update public.user_suspensions set lifted_by = null where lifted_by = p_user;
  update public.user_suspensions set suspended_by = null where suspended_by = p_user;
  update public.announcements set created_by = null where created_by = p_user;
  update public.platform_settings set updated_by = null where updated_by = p_user;
  update public.admin_roles set granted_by = null where granted_by = p_user;
  update public.editorial_picks set picked_by = null where picked_by = p_user;

  -- Admin role + profile (auth.users deleted by the route via auth admin API).
  delete from public.admin_roles where user_id = p_user;
  delete from public.profiles where id = p_user;

  v_counts := jsonb_build_object('deleted', true);

  return jsonb_build_object('ok', true, 'user_id', p_user, 'summary', v_counts);
end;
$$;