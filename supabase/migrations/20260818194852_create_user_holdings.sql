-- GNEX wallet: savings-style portfolio holdings
-- A user's units of each asset (0.0021 BTC, 0.5g XAU, ...) with an average
-- KES cost basis per unit for growth-vs-inflation computation.

create table if not exists public.user_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_symbol text not null check (asset_symbol in ('BTC', 'ETH', 'SOL', 'XRP', 'USDT', 'XAU')),
  units numeric not null default 0,
  avg_cost_kes numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, asset_symbol)
);

alter table public.user_holdings enable row level security;

drop policy if exists "Users read own holdings" on public.user_holdings;
create policy "Users read own holdings"
  on public.user_holdings for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own holdings" on public.user_holdings;
create policy "Users insert own holdings"
  on public.user_holdings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own holdings" on public.user_holdings;
create policy "Users update own holdings"
  on public.user_holdings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
