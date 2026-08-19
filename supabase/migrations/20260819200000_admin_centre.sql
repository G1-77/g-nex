-- GNEX Admin Centre — Phase 1 foundation plus schema for Phases 3-6.
--
-- Builds on the existing remote schema: admin_roles already carries the
-- per-user `permissions` jsonb and `granted_by`; audit_logs, platform_settings,
-- transactions and orders already exist. This migration only extends what is
-- missing and fixes two status CHECK constraints that are stricter than the
-- wallet/API status machines the code actually writes.

-- ============================================================================
-- 0. Fix money-movement status machines to match the application code.
--    (The remote constraints reject 'pending_verification' / 'approved' / 'paid'
--    which the wallet APIs write.)
-- ============================================================================

alter table public.deposit_requests
  drop constraint if exists deposit_requests_status_check;

alter table public.deposit_requests
  add constraint deposit_requests_status_check
  check (status in ('pending', 'pending_verification', 'confirmed', 'rejected', 'reversed'));

alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_status_check;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_check
  check (status in ('pending', 'approved', 'processing', 'sent', 'paid', 'failed', 'rejected'));

-- ============================================================================
-- 1. Centralized authorization helpers (single source for RLS + RPCs).
--    Permissions live on admin_roles.permissions (jsonb array of codes).
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles ar
    cross join lateral jsonb_array_elements_text(ar.permissions) p
    where ar.user_id = auth.uid() and p = p_permission
  );
$$;

-- Explicit-user variant so administrative RPCs can self-authorize when called
-- with a service-role client (auth.uid() is null in that context).
create or replace function public.has_permission_for(p_user uuid, p_permission text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles ar
    cross join lateral jsonb_array_elements_text(ar.permissions) p
    where ar.user_id = p_user and p = p_permission
  );
$$;

-- ============================================================================
-- 2. Permission catalog (source of truth for the permission matrix UI).
-- ============================================================================

create table if not exists public.admin_permissions (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.admin_permissions enable row level security;

insert into public.admin_permissions (code, name, description) values
  ('users.read',            'Users — View',            'View the user directory and member profiles.'),
  ('users.manage',          'Users — Manage',          'Suspend/unsuspend accounts and manage verification state.'),
  ('deposits.read',         'Deposits — View',         'View deposit requests and payment references.'),
  ('deposits.approve',      'Deposits — Approve',      'Approve or reject pending deposits.'),
  ('withdrawals.read',      'Withdrawals — View',      'View withdrawal requests and payout details.'),
  ('withdrawals.process',   'Withdrawals — Process',   'Process or reject payout requests.'),
  ('transactions.read',     'Transactions — View',     'Search the financial transactions ledger.'),
  ('orders.read',           'Orders — View',           'View market orders across the platform.'),
  ('community.moderate',    'Community — Moderate',    'Moderate community content and interactions.'),
  ('community.report_review','Community — Reports',    'Review and resolve user-submitted reports.'),
  ('content.manage',        'Content — Manage',        'Manage editorial picks and moderate posts.'),
  ('content.publish',       'Content — Publish',       'Publish editorial and pinned content.'),
  ('market.manage',         'Market — Manage',         'Manage supported assets and market settings.'),
  ('admins.manage',         'Administration — Admins', 'Grant and revoke admin access, assign roles.'),
  ('permissions.manage',    'Administration — Permissions', 'Modify the role/permission matrix.'),
  ('settings.manage',       'System — Settings',       'Manage platform settings and maintenance mode.'),
  ('audit.read',            'System — Audit',          'Read the append-only audit log.')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description;

-- ============================================================================
-- 3. Trader reputation (community status). Deliberately separate from admin
--    roles: profiles stay identity/profile data; this table carries the
--    community business logic. Users can never self-assign — only the scoring
--    engine (service role / SECURITY DEFINER) writes.
-- ============================================================================

create table if not exists public.trader_reputation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'new_trader'
    check (status in ('new_trader', 'active_trader', 'community_analyst', 'verified_trader', 'top_trader')),
  score numeric(10,2) not null default 0,
  criteria jsonb not null default '{}'::jsonb,
  computed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.trader_reputation enable row level security;

drop policy if exists "Reputation readable by everyone" on public.trader_reputation;
create policy "Reputation readable by everyone"
  on public.trader_reputation for select
  using (true);

-- ============================================================================
-- 4. Community reports (report queue).
-- ============================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null
    check (content_type in ('post', 'comment', 'profile', 'setup')),
  content_id text not null,
  reason text not null,
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'actioned', 'dismissed')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Moderators read all reports" on public.reports;
create policy "Moderators read all reports"
  on public.reports for select
  using (public.has_permission('community.report_review') or public.has_permission('community.moderate'));

drop policy if exists "Moderators resolve reports" on public.reports;
create policy "Moderators resolve reports"
  on public.reports for update
  using (public.has_permission('community.report_review') or public.has_permission('community.moderate'));

-- ============================================================================
-- 5. Editorial picks.
-- ============================================================================

create table if not exists public.editorial_picks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  picked_by uuid not null references public.profiles(id),
  reason text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.editorial_picks enable row level security;

drop policy if exists "Editorial picks readable" on public.editorial_picks;
create policy "Editorial picks readable"
  on public.editorial_picks for select
  using (true);

drop policy if exists "Editors manage picks" on public.editorial_picks;
create policy "Editors manage picks"
  on public.editorial_picks for all
  using (public.has_permission('content.manage') or public.has_permission('content.publish'));

-- ============================================================================
-- 6. User suspensions (reason + history; toggles profiles.is_active).
-- ============================================================================

create table if not exists public.user_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  suspended_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references public.profiles(id)
);

alter table public.user_suspensions enable row level security;

drop policy if exists "Staff manage suspensions" on public.user_suspensions;
create policy "Staff manage suspensions"
  on public.user_suspensions for all
  using (public.has_permission('users.manage'));

-- ============================================================================
-- 7. Append-only audit log read access.
--    audit_logs exists (RLS enabled, no policies). Staff with audit.read may
--    SELECT; inserts happen only via the service-role admin routes — there are
--    intentionally NO insert/update/delete policies, making it append-only.
-- ============================================================================

drop policy if exists "Staff read audit logs" on public.audit_logs;
create policy "Staff read audit logs"
  on public.audit_logs for select
  using (public.has_permission('audit.read'));

-- ============================================================================
-- 8. Platform settings access. SELECT for authenticated (public config such as
--    supported assets/providers); writes require settings.manage.
-- ============================================================================

drop policy if exists "Settings readable by authenticated users" on public.platform_settings;
create policy "Settings readable by authenticated users"
  on public.platform_settings for select to authenticated
  using (true);

drop policy if exists "Super admin manages settings" on public.platform_settings;
create policy "Super admin manages settings"
  on public.platform_settings for all
  using (public.has_permission('settings.manage'));

-- ============================================================================
-- 9. Creator control over own content (post edit/delete + tag management).
-- ============================================================================

alter table public.posts add column if not exists updated_at timestamptz;

drop policy if exists "Owners update own posts" on public.posts;
create policy "Owners update own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners delete own posts" on public.posts;
create policy "Owners delete own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Staff moderate posts" on public.posts;
create policy "Staff moderate posts"
  on public.posts for update
  using (public.has_permission('content.manage') or public.has_permission('community.moderate'));

drop policy if exists "Owners update own trade tags" on public.trade_tags;
create policy "Owners update own trade tags"
  on public.trade_tags for update to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = trade_tags.post_id and p.user_id = auth.uid()
  ));

drop policy if exists "Owners delete own trade tags" on public.trade_tags;
create policy "Owners delete own trade tags"
  on public.trade_tags for delete to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = trade_tags.post_id and p.user_id = auth.uid()
  ));

-- ============================================================================
-- 10. Admin transactions ledger view: one searchable surface over trades,
--     deposits and withdrawals (preserves the existing wallet/order tables —
--     this is read-only and writes nothing).
-- ============================================================================

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
  t.amount,
  t.status,
  t.created_at,
  t.reference,
  null::text,
  p3.username,
  a2.symbol
from public.transactions t
left join public.profiles p3 on p3.id = t.user_id
left join public.assets a2 on a2.id = t.asset_id;

-- ============================================================================
-- 11. Administrative operational RPCs (atomic, SECURITY DEFINER, service-role
--     only call sites — never reachable from the browser). Each returns a jsonb
--     result; the calling API route enforces permissions and writes the audit.
-- ============================================================================

-- Confirm a provisional deposit (finalize the 90/10 provisional credit).
create or replace function public.admin_confirm_deposit(
  p_deposit_id uuid,
  p_admin uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_deposit public.deposit_requests%rowtype;
begin
  select * into v_deposit from public.deposit_requests where id = p_deposit_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Deposit not found');
  end if;
  if v_deposit.status <> 'pending_verification' then
    return jsonb_build_object('ok', false, 'error', 'Deposit is not awaiting verification');
  end if;

  update public.deposit_requests
    set status = 'confirmed',
        reviewed_by = p_admin,
        reviewed_at = now(),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_deposit_id;

  return jsonb_build_object('ok', true, 'deposit_id', p_deposit_id);
end;
$$;

-- Reject a provisional deposit AND reverse the provisional 90/10 credit.
create or replace function public.admin_reject_deposit(
  p_deposit_id uuid,
  p_admin uuid,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_deposit public.deposit_requests%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_balance numeric;
  v_reserve numeric;
begin
  select * into v_deposit from public.deposit_requests where id = p_deposit_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Deposit not found');
  end if;
  if v_deposit.status <> 'pending_verification' then
    return jsonb_build_object('ok', false, 'error', 'Deposit is not awaiting verification');
  end if;

  v_balance := round((v_deposit.amount_kes * 0.9)::numeric, 2);
  v_reserve := round((v_deposit.amount_kes * 0.1)::numeric, 2);

  select * into v_wallet from public.user_wallets where user_id = v_deposit.user_id;
  if found then
    update public.user_wallets
      set balance_kes = greatest(0, balance_kes - v_balance),
          reserve_kes = greatest(0, reserve_kes - v_reserve)
      where user_id = v_deposit.user_id;
  end if;

  update public.deposit_requests
    set status = 'rejected',
        reviewed_by = p_admin,
        reviewed_at = now(),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_deposit_id;

  return jsonb_build_object(
    'ok', true,
    'deposit_id', p_deposit_id,
    'reversed_balance', v_balance,
    'reversed_reserve', v_reserve
  );
end;
$$;

-- Process a withdrawal: debit the wallet balance and mark the payout sent.
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
  v_debit numeric;
begin
  select * into v_wd from public.withdrawal_requests where id = p_withdrawal_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal not found');
  end if;
  if v_wd.status not in ('pending', 'approved') then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal is not actionable');
  end if;

  v_debit := coalesce(v_wd.amount_kes, v_wd.amount, 0);

  update public.user_wallets
    set balance_kes = greatest(0, balance_kes - v_debit)
    where user_id = v_wd.user_id;

  update public.withdrawal_requests
    set status = 'sent',
        processed_by = p_admin,
        processed_at = now(),
        paid_at = coalesce(paid_at, now()),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_withdrawal_id;

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'debited', v_debit);
end;
$$;

-- Reject a withdrawal (no debit — money was never reserved at request time).
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
begin
  select * into v_wd from public.withdrawal_requests where id = p_withdrawal_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal not found');
  end if;
  if v_wd.status not in ('pending', 'approved', 'processing') then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal is not actionable');
  end if;

  update public.withdrawal_requests
    set status = 'rejected',
        processed_by = p_admin,
        processed_at = now(),
        admin_notes = coalesce(p_note, admin_notes)
    where id = p_withdrawal_id;

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id);
end;
$$;

-- ============================================================================
-- 12. Trader reputation engine. Computes a 0-100 score from real signals:
--     validated performance (closed positions + monthly ROI), setup consistency
--     (tagged setups + distinct days), engagement (followers + likes received),
--     account history (age + confirmed deposits) and moderation quality
--     (actioned reports). Never assignable by users or admins directly.
-- ============================================================================

create or replace function public.compute_trader_reputation(p_user uuid)
returns public.trader_reputation
language plpgsql security definer set search_path = public
as $$
declare
  v_roi numeric := 0;
  v_age_days numeric := 0;
  v_closed int := 0;
  v_setups int := 0;
  v_days int := 0;
  v_followers int := 0;
  v_likes_received int := 0;
  v_deposits int := 0;
  v_moderation int := 0;
  v_performance numeric := 0;
  v_consistency numeric := 0;
  v_engagement numeric := 0;
  v_history numeric := 0;
  v_score numeric := 0;
  v_status text := 'new_trader';
  v_criteria jsonb;
  v_row public.trader_reputation%rowtype;
begin
  select coalesce(monthly_roi, 0),
         coalesce(extract(epoch from (now() - created_at)) / 86400, 0)
  into v_roi, v_age_days
  from public.profiles
  where id = p_user;

  select count(*) into v_closed
  from public.user_positions
  where user_id = p_user and status = 'CLOSED';

  select count(*), count(distinct date_trunc('day', p.created_at))
  into v_setups, v_days
  from public.posts p
  where p.user_id = p_user
    and exists (select 1 from public.trade_tags t where t.post_id = p.id);

  select count(*) into v_followers
  from public.follows
  where following_id = p_user;

  select count(*) into v_likes_received
  from public.likes l
  join public.posts p on p.id = l.post_id
  where p.user_id = p_user;

  select count(*) into v_deposits
  from public.deposit_requests
  where user_id = p_user and status in ('confirmed');

  select count(*) into v_moderation
  from public.reports
  where status = 'actioned'
    and content_id in (select id::text from public.posts where user_id = p_user);

  v_performance := least(30, greatest(0, v_roi)) + least(10, v_closed * 2);
  v_consistency := least(15, round(v_setups * 1.5 + v_days * 1.0));
  v_engagement  := least(20, round(ln(1 + v_followers) * 5 + ln(1 + v_likes_received) * 2));
  v_history     := least(15, round(v_age_days / 30.0 * 2 + least(5, v_deposits)));
  v_moderation  := least(10, v_moderation * 5);

  v_score := round(greatest(0, least(100,
    v_performance + v_consistency + v_engagement + v_history - v_moderation)), 2);

  v_status := case
    when v_score >= 80 then 'top_trader'
    when v_score >= 60 then 'verified_trader'
    when v_score >= 40 then 'community_analyst'
    when v_score >= 20 then 'active_trader'
    else 'new_trader'
  end;

  v_criteria := jsonb_build_object(
    'performance', v_performance,
    'consistency', v_consistency,
    'engagement', v_engagement,
    'history', v_history,
    'moderation_penalty', v_moderation,
    'signals', jsonb_build_object(
      'closed_positions', v_closed,
      'setups', v_setups,
      'followers', v_followers,
      'confirmed_deposits', v_deposits
    )
  );

  insert into public.trader_reputation (user_id, status, score, criteria, computed_at, updated_at)
  values (p_user, v_status, v_score, v_criteria, now(), now())
  on conflict (user_id) do update
    set status = excluded.status,
        score = excluded.score,
        criteria = excluded.criteria,
        computed_at = excluded.computed_at,
        updated_at = now();

  select * into v_row from public.trader_reputation where user_id = p_user;
  return v_row;
end;
$$;

create or replace function public.recompute_all_reputations()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in select id from public.profiles loop
    perform public.compute_trader_reputation(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;