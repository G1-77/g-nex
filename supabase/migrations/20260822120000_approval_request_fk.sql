-- admin_action_requests.requested_by / reviewed_by carried bare UUIDs while
-- every sibling staff-attribution column in the financial model carries an
-- explicit foreign key:
--   withdrawal_requests.processed_by -> profiles(id)
--   deposit_requests.reviewed_by    -> profiles(id)
--   transactions.processed_by       -> profiles(id)
--   audit_logs.admin_id             -> profiles(id)
--
-- The admin approvals API embeds requester profiles
-- (app/api/admin/approvals/route.ts), which requires this relationship to
-- exist. Production table verified EMPTY at time of writing, so adding the
-- constraints cannot violate existing rows. Delete semantics intentionally
-- match the sibling columns (default NO ACTION); nullability is unchanged
-- (requested_by stays NOT NULL, reviewed_by stays nullable).

alter table public.admin_action_requests
  add constraint admin_action_requests_requested_by_fkey
  foreign key (requested_by) references public.profiles (id);

alter table public.admin_action_requests
  add constraint admin_action_requests_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles (id);
