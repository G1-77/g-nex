-- GNEX Admin Centre — fix admin_roles access.
--
-- Every gate (proxy, /admin layout, AuthProvider, useUserIdentity, admin API
-- routes) reads admin_roles with the browser session. The policy
-- "Super admins manage admin roles" embedded an inline subquery against
-- admin_roles inside its own USING/WITH CHECK clause (cmd = ALL, which also
-- gates SELECT), so any read of the table raised:
--
--   ERROR: infinite recursion detected in policy for relation "admin_roles"
--
-- The query then failed, role/permissions resolved to null, and staff were
-- bounced back to "/" with no super_admin indicator anywhere.
--
-- Fix: drop the recursive policy and manage writes through the SECURITY
-- DEFINER helper (is_staff / has_permission / is_super_admin), which bypass
-- RLS and cannot recurse. Read access is already provided by the
-- "Authenticated users can read admin roles" / "admin_roles_read" policies.

alter table public.admin_roles enable row level security;

-- Remove the recursion source (management is covered by the SECURITY DEFINER
-- policy below / the "admin_roles_manage" policy already on the table).
drop policy if exists "Super admins manage admin roles" on public.admin_roles;

-- Ensure a safe, non-recursive management policy exists. Uses only SECURITY
-- DEFINER helpers so it never re-enters admin_roles under RLS.
drop policy if exists "Staff manage admin roles" on public.admin_roles;
create policy "Staff manage admin roles"
  on public.admin_roles for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Keep the read policies explicit and idempotent.
drop policy if exists "Staff read own role" on public.admin_roles;
create policy "Staff read own role"
  on public.admin_roles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all roles" on public.admin_roles;
create policy "Admins read all roles"
  on public.admin_roles for select to authenticated
  using (public.has_permission('admins.manage'));