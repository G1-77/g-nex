-- GNEX wallet: RLS insert policy for withdrawal_requests
--
-- withdrawal_requests has RLS enabled but only ever received SELECT policies
-- (users read own; admins read all). With no INSERT / WITH CHECK policy,
-- authenticated inserts through POST /api/withdrawals fail with
-- "new row violates row-level security policy" — the withdrawal flow was
-- unreachable for every user. This mirrors the deposit fix from
-- 20260819080443_enable_deposit_requests_rls.sql.
--
-- The API route remains the authority on amounts, fees, caps and approval
-- status; this policy only binds rows to their owner and to the two statuses
-- the route can legitimately write at creation time.

alter table public.withdrawal_requests enable row level security;

drop policy if exists "Users create own withdrawal requests" on public.withdrawal_requests;
create policy "Users create own withdrawal requests"
  on public.withdrawal_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and asset_id is null
    and status in ('pending', 'approved')
  );
