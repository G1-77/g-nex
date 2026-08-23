-- GNEX 2.0 Home Intelligence Layer
-- Activity events table + sentiment/opportunity RPCs
-- Brief §13–§16, §31–§33, §51–§52 Phase 2

-- 1) Activity events: public-intent stream for the Home trading-activity widget
--    Only username, avatar, symbol, action, direction, timestamp exposed (brief §14)
--    Retained 7d via trigger pruning.

create table if not exists public.activity_events (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null references public.profiles(id) on delete cascade,
    asset_symbol text not null,
    action text not null check (action in ('position_opened','position_closed','analysis_published')),
    direction text check (direction in ('Long','Short','bullish','bearish')),
    subject_id uuid,
    created_at timestamptz not null default now()
);

create index if not exists activity_events_created_at_desc_idx
    on public.activity_events (created_at desc);
create index if not exists activity_events_asset_created_idx
    on public.activity_events (asset_symbol, created_at desc);

alter table public.activity_events enable row level security;

create policy activity_events_select_auth on public.activity_events
    for select to authenticated using (true);

-- Realtime publication for live Home activity feed
alter publication supabase_realtime add table public.activity_events;

-- 2) Triggers to populate activity_events

-- 2a) user_positions lifecycle → position_opened / position_closed
create or replace function public.log_position_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if (TG_OP = 'INSERT' and NEW.status = 'OPEN') or
       (TG_OP = 'UPDATE' and OLD.status <> 'OPEN' and NEW.status = 'OPEN') then
        insert into public.activity_events (actor_id, asset_symbol, action, direction, subject_id)
        values (NEW.user_id, NEW.asset_symbol, 'position_opened', NEW.direction, NEW.id);
    elsif (TG_OP = 'UPDATE' and OLD.status = 'OPEN' and NEW.status = 'CLOSED') then
        insert into public.activity_events (actor_id, asset_symbol, action, direction, subject_id)
        values (NEW.user_id, NEW.asset_symbol, 'position_closed', NEW.direction, NEW.id);
    end if;

    -- Prune older than 7 days
    delete from public.activity_events
    where created_at < now() - interval '7 days';

    return NEW;
end $$;

drop trigger if exists trigger_log_position_activity on public.user_positions;
create trigger trigger_log_position_activity
after insert or update on public.user_positions
for each row execute function public.log_position_activity();

-- 2b) trade_tags insert → analysis_published (excludes system tags without post_id)
create or replace function public.log_analysis_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if NEW.post_id is not null then
        insert into public.activity_events (actor_id, asset_symbol, action, direction, subject_id)
        select p.user_id, NEW.asset_symbol, 'analysis_published',
               case
                   when NEW.direction in ('bullish','bearish') then NEW.direction
                   when NEW.signal_type = 'Bullish' then 'bullish'
                   when NEW.signal_type = 'Bearish' then 'bearish'
                   else null
               end,
               NEW.post_id
        from public.posts p
        where p.id = NEW.post_id;
    end if;

    -- Prune older than 7 days
    delete from public.activity_events
    where created_at < now() - interval '7 days';

    return NEW;
end $$;

drop trigger if exists trigger_log_analysis_activity on public.trade_tags;
create trigger trigger_log_analysis_activity
after insert on public.trade_tags
for each row execute function public.log_analysis_activity();

-- 3) RPC: get_market_activity(limit) → activity feed for Home
create or replace function public.get_market_activity(p_limit int default 12)
returns table (
    id uuid,
    username text,
    avatar_url text,
    asset_symbol text,
    action text,
    direction text,
    created_at timestamptz
)
language sql security definer set search_path = public as $$
    select
        ae.id,
        pr.username,
        pr.avatar_url,
        ae.asset_symbol,
        ae.action,
        ae.direction,
        ae.created_at
    from public.activity_events ae
    join public.profiles pr on pr.id = ae.actor_id
    order by ae.created_at desc
    limit p_limit;
$$;

grant execute on function public.get_market_activity(int) to authenticated;

-- 4) RPC: get_asset_sentiment(asset_symbol) → bullish/neutral/bearish distribution
--    Methodology (brief §33): deterministic, documented, replaceable.
--    v1 weights: trade_tags explicit signals (direction='bullish'/'bearish' or signal_type='Bullish'/'Bearish') weight 2;
--               user_positions OPEN Long/Short weight 1.
--    Neutral: trade_tags with non-directional signal_type (Accumulation/Scalp/Long-Term) + mentions without directional signal.
--    Percentages rounded; if total_weight = 0 returns null for all buckets.

create or replace function public.get_asset_sentiment(p_asset_symbol text)
returns jsonb
language sql security definer set search_path = public as $$
    with tag_counts as (
        select
            count(*) filter (where
                tt.direction in ('bullish','bearish') or tt.signal_type in ('Bullish','Bearish')
            ) as explicit_signals,
            count(*) filter (where
                tt.direction = 'bullish' or tt.signal_type = 'Bullish'
            ) as bullish_tags,
            count(*) filter (where
                tt.direction = 'bearish' or tt.signal_type = 'Bearish'
            ) as bearish_tags,
            count(*) filter (where
                tt.direction is null and tt.signal_type in ('Accumulation','Scalp','Long-Term')
            ) as neutral_tags
        from public.trade_tags tt
        where tt.asset_symbol = p_asset_symbol
          and tt.created_at > now() - interval '14 days'
    ), pos_counts as (
        select
            count(*) filter (where direction = 'Long') as long_positions,
            count(*) filter (where direction = 'Short') as short_positions
        from public.user_positions
        where asset_symbol = p_asset_symbol
          and status = 'OPEN'
    ), agg as (
        select
            coalesce(tc.bullish_tags, 0) * 2 + coalesce(pc.long_positions, 0) as bullish_weight,
            coalesce(tc.bearish_tags, 0) * 2 + coalesce(pc.short_positions, 0) as bearish_weight,
            coalesce(tc.neutral_tags, 0) * 2 as neutral_weight
        from tag_counts tc
        cross join pos_counts pc
    )
    select jsonb_build_object(
        'bullish', case when (bullish_weight + bearish_weight + neutral_weight) = 0 then null
            else round(bullish_weight::numeric / (bullish_weight + bearish_weight + neutral_weight) * 100) end,
        'bearish', case when (bullish_weight + bearish_weight + neutral_weight) = 0 then null
            else round(bearish_weight::numeric / (bullish_weight + bearish_weight + neutral_weight) * 100) end,
        'neutral', case when (bullish_weight + bearish_weight + neutral_weight) = 0 then null
            else round(neutral_weight::numeric / (bullish_weight + bearish_weight + neutral_weight) * 100) end,
        'total_weight', (bullish_weight + bearish_weight + neutral_weight)
    )
    from agg;
$$;

comment on function public.get_asset_sentiment(text) is
'GNEX 2.0 asset sentiment (v1). Weights: trade_tags explicit bullish/bearish signals ×2, user_positions OPEN Long/Short ×1. Neutral = non-directional trade_tags (Accumulation/Scalp/Long-Term) ×2. Percentages rounded. Replaceable methodology.';

grant execute on function public.get_asset_sentiment(text) to authenticated;

-- 5) RPC: get_market_opportunities(limit) → symbols with discussion counts
create or replace function public.get_market_opportunities(p_limit int default 8)
returns table (
    asset_symbol text,
    discussions bigint,
    bullish_signals bigint,
    bearish_signals bigint
)
language sql security definer set search_path = public as $$
    select
        tt.asset_symbol,
        count(distinct tt.post_id) as discussions,
        count(*) filter (where tt.direction = 'bullish' or tt.signal_type = 'Bullish') as bullish_signals,
        count(*) filter (where tt.direction = 'bearish' or tt.signal_type = 'Bearish') as bearish_signals
    from public.trade_tags tt
    where tt.created_at > now() - interval '7 days'
    group by tt.asset_symbol
    order by discussions desc
    limit p_limit;
$$;

grant execute on function public.get_market_opportunities(int) to authenticated;

-- 6) RPC: get_sentiment_overview(limit) → batched sentiment for top discussed symbols
--    Avoids N per-symbol RPC calls on Home.
create or replace function public.get_sentiment_overview(p_limit int default 6)
returns table (
    asset_symbol text,
    bullish int,
    neutral int,
    bearish int,
    total_weight int
)
language sql security definer set search_path = public as $$
    with top_symbols as (
        select asset_symbol
        from public.trade_tags
        where created_at > now() - interval '14 days'
        group by asset_symbol
        order by count(distinct post_id) desc
        limit p_limit
    ), per_symbol as (
        select
            ts.asset_symbol,
            coalesce(count(*) filter (where tt.direction = 'bullish' or tt.signal_type = 'Bullish'), 0) * 2 +
            coalesce(count(*) filter (where up.direction = 'Long' and up.status = 'OPEN'), 0) as bullish_w,
            coalesce(count(*) filter (where tt.direction = 'bearish' or tt.signal_type = 'Bearish'), 0) * 2 +
            coalesce(count(*) filter (where up.direction = 'Short' and up.status = 'OPEN'), 0) as bearish_w,
            coalesce(count(*) filter (where tt.direction is null and tt.signal_type in ('Accumulation','Scalp','Long-Term')), 0) * 2 as neutral_w
        from top_symbols ts
        left join public.trade_tags tt on tt.asset_symbol = ts.asset_symbol and tt.created_at > now() - interval '14 days'
        left join public.user_positions up on up.asset_symbol = ts.asset_symbol and up.status = 'OPEN'
        group by ts.asset_symbol
    )
    select
        asset_symbol,
        case when (bullish_w + bearish_w + neutral_w) = 0 then null
            else round(bullish_w::numeric / (bullish_w + bearish_w + neutral_w) * 100) end as bullish,
        case when (bullish_w + bearish_w + neutral_w) = 0 then null
            else round(neutral_w::numeric / (bullish_w + bearish_w + neutral_w) * 100) end as neutral,
        case when (bullish_w + bearish_w + neutral_w) = 0 then null
            else round(bearish_w::numeric / (bullish_w + bearish_w + neutral_w) * 100) end as bearish,
        (bullish_w + bearish_w + neutral_w) as total_weight
    from per_symbol;
$$;

comment on function public.get_sentiment_overview(int) is
'Batched sentiment for top-discussed symbols (14d). Same methodology as get_asset_sentiment v1.';

grant execute on function public.get_sentiment_overview(int) to authenticated;

-- 7) Helpful index for trade_tags asset+created_at (opportunities + sentiment)
create index if not exists trade_tags_asset_created_idx
    on public.trade_tags (asset_symbol, created_at desc);