-- Home Experience milestone
-- 1) promotions: admin-managed content for the reusable Home promotion carousel
-- 2) assets catalogue seed for the expanded tradable universe
--    (DOGE, TRUMP, USDC, ACE join BTC/ETH/SOL/XRP/USDT/XAU)
-- 3) user_holdings symbol CHECK extension to match

-- ---------------------------------------------------------------------------
-- 1) promotions
--    Presentation lives in React; this table owns WHAT is promoted, WHEN it
--    runs and WHERE it links. Ordering uses display_order only (single
--    mechanism). RLS is enabled with no policies: clients never read this
--    table directly — GET /api/promotions applies enabled/time eligibility
--    server-side via the service role, admin CRUD flows through
--    /api/admin/promotions with content.manage + audit.
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null default '',
    image_url text,
    icon_url text,
    cta_text text not null default 'Learn more',
    destination_type text not null default 'route'
        check (destination_type in ('route', 'url', 'product', 'none')),
    destination_url text,
    product_id text,
    enabled boolean not null default false,
    display_order integer not null default 0,
    start_at timestamptz,
    end_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint promotions_time_window_check
        check (start_at is null or end_at is null or start_at <= end_at)
);

create index if not exists promotions_enabled_order_idx
    on public.promotions (display_order asc)
    where enabled;

alter table public.promotions enable row level security;

-- updated_at maintenance
create or replace function public.touch_promotion_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

drop trigger if exists promotions_touch_updated_at on public.promotions;
create trigger promotions_touch_updated_at
    before update on public.promotions
    for each row execute function public.touch_promotion_updated_at();

-- Seed: GNEX Prediction entry-point campaign (idempotent).
-- /prediction is an honest placeholder route until the product launches.
insert into public.promotions (title, description, cta_text, destination_type, destination_url, product_id, enabled, display_order)
select 'Play & Predict',
       'Think you can call the next move? Explore GNEX Prediction.',
       'Explore Prediction',
       'product',
       null,
       'prediction',
       true,
       0
where not exists (
    select 1 from public.promotions where product_id = 'prediction'
);

-- ---------------------------------------------------------------------------
-- 2) assets catalogue — insert missing instruments only (never clobbers
--    operator-maintained rows). execute_trade resolves tradability here.
-- ---------------------------------------------------------------------------
insert into public.assets (symbol, name, type, coingecko_id, is_active)
values
    ('BTC',   'Bitcoin',        'crypto', 'bitcoin',        true),
    ('ETH',   'Ethereum',       'crypto', 'ethereum',       true),
    ('SOL',   'Solana',         'crypto', 'solana',         true),
    ('XRP',   'Ripple',         'crypto', 'ripple',         true),
    ('USDT',  'Tether',         'crypto', 'tether',         true),
    ('XAU',   'Spot Gold',      'gold',   null,             true),
    ('DOGE',  'Dogecoin',       'crypto', 'dogecoin',       true),
    ('TRUMP', 'OFFICIAL TRUMP', 'crypto', 'official-trump', true),
    ('USDC',  'USD Coin',       'crypto', 'usd-coin',       true),
    ('ACE',   'Fusionist',      'crypto', 'fusionist',      true)
on conflict (symbol) do nothing;

-- ---------------------------------------------------------------------------
-- 3) user_holdings: widen the allowed symbols to the expanded universe.
-- ---------------------------------------------------------------------------
alter table public.user_holdings drop constraint if exists user_holdings_asset_symbol_check;
alter table public.user_holdings add constraint user_holdings_asset_symbol_check
    check (asset_symbol in ('BTC','ETH','SOL','XRP','USDT','XAU','DOGE','TRUMP','USDC','ACE'));
