-- GNEX 2.0 Social Interaction Layer
-- saved_posts, report client insert, comment threading support
-- Brief §27–§32, §52 Phase 3

-- 1) saved_posts: user bookmarks for posts
create table if not exists public.saved_posts (
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null references public.posts(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create index if not exists saved_posts_user_created_idx
    on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

-- Owner can select/insert/delete their own saves
create policy saved_posts_owner_all on public.saved_posts
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- No realtime needed for saves (brief doesn't require it), but could add if wanted

-- 2) reports: allow authenticated users to INSERT (moderation queue already exists)
-- Existing RLS from 20260819200000_admin_centre.sql has select for staff only
-- Need INSERT policy for reporters
drop policy if exists reports_insert_reporter on public.reports;
create policy reports_insert_reporter on public.reports
    for insert to authenticated
    with check (auth.uid() = reporter_id);

-- 3) comments: add reply support (parent_id self-ref)
-- Only if not already present (safe idempotent)
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'comments' and column_name = 'parent_id'
    ) then
        alter table public.comments add column parent_id uuid references public.comments(id) on delete cascade;
        create index if not exists comments_parent_idx on public.comments (parent_id);
    end if;
end $$;

-- 4) RPC: toggle_save_post(post_id) — idempotent upsert/delete
create or replace function public.toggle_save_post(p_post_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_user_id uuid := auth.uid();
    v_result boolean;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    -- Check if already saved
    select exists(
        select 1 from public.saved_posts
        where user_id = v_user_id and post_id = p_post_id
    ) into v_result;

    if v_result then
        delete from public.saved_posts
        where user_id = v_user_id and post_id = p_post_id;
        return jsonb_build_object('saved', false);
    else
        insert into public.saved_posts (user_id, post_id)
        values (v_user_id, p_post_id);
        return jsonb_build_object('saved', true);
    end if;
end $$;

grant execute on function public.toggle_save_post(uuid) to authenticated;

-- 5) RPC: get_saved_posts(limit) — for Saved page
create or replace function public.get_saved_posts(p_limit int default 20)
returns table (
    id uuid,
    content text,
    media_url text,
    likes_count int,
    comments_count int,
    shares_count int,
    asset_symbols text,
    signal_type text,
    created_at timestamptz,
    author_username text,
    author_avatar text,
    author_verified boolean
)
language sql security definer set search_path = public as $$
    select
        p.id,
        p.content,
        p.media_url,
        p.likes_count,
        p.comments_count,
        p.shares_count,
        p."assetSymbols" as asset_symbols,
        p."signalType" as signal_type,
        p.created_at,
        pr.username as author_username,
        pr.avatar_url as author_avatar,
        pr.is_verified as author_verified
    from public.saved_posts sp
    join public.posts p on p.id = sp.post_id
    join public.profiles pr on pr.id = p.user_id
    where sp.user_id = auth.uid()
    order by sp.created_at desc
    limit p_limit;
$$;

grant execute on function public.get_saved_posts(int) to authenticated;

-- 6) RPC: submit_report(content_type, content_id, reason, details) — client report creation
create or replace function public.submit_report(
    p_content_type text,
    p_content_id uuid,
    p_reason text,
    p_details text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    v_user_id uuid := auth.uid();
    v_report_id uuid;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    insert into public.reports (reporter_id, content_type, content_id, reason, details)
    values (v_user_id, p_content_type, p_content_id, p_reason, p_details)
    returning id into v_report_id;

    -- Notification to moderators could be added here (Phase F)

    return v_report_id;
end $$;

grant execute on function public.submit_report(text, uuid, text, text) to authenticated;

-- 7) Comments pagination + thread fetch RPC (for inline comments)
create or replace function public.get_post_comments(p_post_id uuid, p_limit int default 20, p_cursor timestamptz default null)
returns table (
    id uuid,
    post_id uuid,
    user_id uuid,
    content text,
    created_at timestamptz,
    parent_id uuid,
    author_username text,
    author_avatar text,
    author_verified boolean
)
language sql security definer set search_path = public as $$
    select
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        c.parent_id,
        pr.username as author_username,
        pr.avatar_url as author_avatar,
        pr.is_verified as author_verified
    from public.comments c
    join public.profiles pr on pr.id = c.user_id
    where c.post_id = p_post_id
      and (p_cursor is null or c.created_at < p_cursor)
    order by c.created_at asc
    limit p_limit;
$$;

grant execute on function public.get_post_comments(uuid, int, timestamptz) to authenticated;

-- 8) Helpful index for comments by post + created_at
create index if not exists comments_post_created_idx
    on public.comments (post_id, created_at);

-- 9) RPC: create_comment(post_id, content, parent_id) — create comment or reply
create or replace function public.create_comment(
    p_post_id uuid,
    p_content text,
    p_parent_id uuid default null
)
returns table (
    id uuid,
    post_id uuid,
    user_id uuid,
    content text,
    created_at timestamptz,
    parent_id uuid,
    author_username text,
    author_avatar text,
    author_verified boolean
)
language plpgsql security definer set search_path = public as $$
declare
    v_user_id uuid := auth.uid();
    v_comment_id uuid;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_parent_id is not null then
        -- Verify parent comment exists and belongs to same post
        if not exists (
            select 1 from public.comments
            where id = p_parent_id and post_id = p_post_id
        ) then
            raise exception 'Parent comment not found';
        end if;
    end if;

    insert into public.comments (post_id, user_id, content, parent_id)
    values (p_post_id, v_user_id, p_content, p_parent_id)
    returning id into v_comment_id;

    return query
    select
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        c.parent_id,
        pr.username as author_username,
        pr.avatar_url as author_avatar,
        pr.is_verified as author_verified
    from public.comments c
    join public.profiles pr on pr.id = c.user_id
    where c.id = v_comment_id;
end $$;

grant execute on function public.create_comment(uuid, text, uuid) to authenticated;