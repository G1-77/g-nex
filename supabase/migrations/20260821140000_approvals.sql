-- ============================================================================
-- GNEX — Approval workflow for destructive/edit actions
--
-- * super_admin acts instantly on every edit/delete.
-- * Everyone below super_admin queues an `admin_action_requests` row that must
--   be approved by a strictly higher rank (admin needs super_admin,
--   support/editor need admin or above).
-- * New permissions:
--     data.edit         — request/perform record edits (admin + super_admin)
--     approvals.review  — see and review the approval queue (admin + super_admin)
--   data.delete is additionally granted to admins: they may now REQUEST
--   deletes; execution still requires a super_admin approval.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Permission catalog updates.
-- ----------------------------------------------------------------------------
insert into public.admin_permissions (code, name, description) values
  ('data.edit', 'Data — Edit', 'Edit platform records. Non super_admin edits require approval from a higher rank.'),
  ('approvals.review', 'Approvals — Review', 'Review and approve or reject requested admin actions from lower ranks.')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description;

-- Grant the new permissions to super_admins.
update public.admin_roles
set permissions = coalesce(permissions, '[]'::jsonb) || '["data.edit", "approvals.review"]'::jsonb
where role = 'super_admin'
  and (not coalesce(permissions, '[]'::jsonb) ? 'data.edit'
    or not coalesce(permissions, '[]'::jsonb) ? 'approvals.review');

-- Admins may edit, review lower-rank requests, and request deletes.
update public.admin_roles
set permissions = coalesce(permissions, '[]'::jsonb) || '["data.edit", "approvals.review", "data.delete"]'::jsonb
where role = 'admin'
  and (not coalesce(permissions, '[]'::jsonb) ? 'data.edit'
    or not coalesce(permissions, '[]'::jsonb) ? 'approvals.review'
    or not coalesce(permissions, '[]'::jsonb) ? 'data.delete');

-- ----------------------------------------------------------------------------
-- 2. Action request queue.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_action_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  requester_role public.admin_role_type not null,
  action_type text not null check (action_type in ('edit', 'delete', 'wipe', 'withdrawal_process')),
  target_table text not null,
  target_id text not null,
  label text not null,
  payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'executed', 'failed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  executed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_action_requests_status
  on public.admin_action_requests (status, created_at desc);

alter table public.admin_action_requests enable row level security;

-- Staff can read the queue; requesters can file their own requests.
-- No update/delete policies: reviews flow exclusively through the service-role
-- API so a requester can never approve their own action client-side.
create policy "staff_read_action_requests"
  on public.admin_action_requests for select
  to authenticated
  using (public.is_staff());

create policy "staff_insert_own_action_requests"
  on public.admin_action_requests for insert
  to authenticated
  with check (requested_by = auth.uid());
