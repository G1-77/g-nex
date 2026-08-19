-- GNEX wallet: deposit account numbers, silent reserve (10%), voluntary locks,
-- withdrawal approval machine, and admin RLS + realtime for the future admin panel.
--
-- Existing migrations are left untouched; this file only adds to remote tables.

-- 1. Per-user unique deposit account number (used as the M-Pesa PayBill
--    BillRefNumber so the admin — and later the Daraja C2B callback — can
--    match any payment to a specific user, from any sending line).
alter table public.profiles add column if not exists deposit_account_number text;

create unique index if not exists profiles_deposit_account_number_key
  on public.profiles (deposit_account_number)
  where deposit_account_number is not null;

-- 2. Wallet balance columns: voluntary lock (user-controlled, 24h unlock) and
--    silent reserve (10% of every deposit, platform-managed).
alter table public.user_wallets add column if not exists locked_kes numeric not null default 0;
alter table public.user_wallets add column if not exists reserve_kes numeric not null default 0;

-- 3. Deposit request metadata: payment channel (paybill | send_to_number),
--    the account number used, the expected amount, and a Daraja-ready
--    reference column (populated by the future C2B callback).
alter table public.deposit_requests add column if not exists payment_channel text;
alter table public.deposit_requests add column if not exists account_number text;
alter table public.deposit_requests add column if not exists expected_amount numeric;
alter table public.deposit_requests add column if not exists mpesa_reference text;

-- 4. Withdrawal approval machine (auto-approve or admin) + 2% charge captured
--    at request time (deducted at payout).
alter table public.withdrawal_requests add column if not exists approved_by text;
alter table public.withdrawal_requests add column if not exists approved_at timestamptz;
alter table public.withdrawal_requests add column if not exists paid_at timestamptz;
alter table public.withdrawal_requests add column if not exists fee_kes numeric not null default 0;

-- 5. Voluntary fund locks (user-initiated; unlock requires a 24h cooling-off).
create table if not exists public.fund_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_kes numeric not null default 0,
  status text not null default 'locked'
    check (status in ('locked', 'unlock_pending', 'released', 'cancelled')),
  created_at timestamptz not null default now(),
  unlock_available_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz
);

alter table public.fund_locks enable row level security;

drop policy if exists "Users read own fund locks" on public.fund_locks;
create policy "Users read own fund locks"
  on public.fund_locks for select
  using (auth.uid() = user_id);

-- 6. Admin read access (future admin panel) via admin_roles.
drop policy if exists "Admins read all deposit requests" on public.deposit_requests;
create policy "Admins read all deposit requests"
  on public.deposit_requests for select
  using (exists (
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid() and ar.role in ('super_admin', 'admin', 'support')
  ));

drop policy if exists "Admins read all withdrawal requests" on public.withdrawal_requests;
create policy "Admins read all withdrawal requests"
  on public.withdrawal_requests for select
  using (exists (
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid() and ar.role in ('super_admin', 'admin', 'support')
  ));

-- 7. Realtime for the admin alert: publish new deposit_requests submissions.
do $$
begin
  alter publication supabase_realtime add table public.deposit_requests;
exception when duplicate_object then null;
end $$;

alter table public.deposit_requests replica identity full;