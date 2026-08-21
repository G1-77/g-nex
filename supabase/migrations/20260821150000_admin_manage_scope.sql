-- ============================================================================
-- GNEX — Scoped admin-role management for admins
--
-- Admins may now manage staff strictly below their own rank (support/editor):
-- grant roles, promote/demote between those roles, and remove admin access.
-- super_admin keeps full control (anyone except themselves). Self-actions
-- stay blocked for everyone, and the last super_admin can never be demoted
-- or removed (enforced in the API layer).
--
-- No new permission code: `admins.manage` already exists in the catalog.
-- This migration only extends it to existing admin role rows; fresh grants
-- pick it up from ROLE_DEFAULT_PERMISSIONS at insert time.
-- ============================================================================

update public.admin_roles
set permissions = coalesce(permissions, '[]'::jsonb) || '["admins.manage"]'::jsonb
where role = 'admin'
  and not coalesce(permissions, '[]'::jsonb) ? 'admins.manage';
