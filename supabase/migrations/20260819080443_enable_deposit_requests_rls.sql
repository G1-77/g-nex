-- GNEX wallet: RLS policies for deposit_requests
-- Enables users to read and insert their own deposit requests.
-- Without an insert (WITH CHECK) policy, authenticated inserts via the anon
-- key fail with "new row violates row-level security policy".

alter table public.deposit_requests enable row level security;

drop policy if exists "Users read own deposit requests" on public.deposit_requests;
create policy "Users read own deposit requests"
  on public.deposit_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own deposit requests" on public.deposit_requests;
create policy "Users insert own deposit requests"
  on public.deposit_requests for insert
  with check (auth.uid() = user_id);