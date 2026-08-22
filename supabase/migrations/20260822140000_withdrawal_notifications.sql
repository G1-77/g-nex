-- =============================================================================
-- WITHDRAWAL NOTIFICATION EXTENSIONS
-- =============================================================================
-- Extend the withdrawal notification trigger to cover all new status transitions
-- =============================================================================

-- Drop and recreate the trigger function with extended status coverage
drop trigger if exists trg_withdrawal on public.withdrawal_requests;

create or replace function public.notify_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Request submitted (pending)
  if new.status = 'pending' and old.status <> 'pending' then
    perform create_notification(
      new.user_id,
      'withdrawal_requested',
      'Withdrawal request submitted',
      jsonb_build_object('amount', new.amount, 'status', 'pending')
    );
  end if;

  -- Approved by admin
  if new.status = 'approved' and old.status <> 'approved' then
    perform create_notification(
      new.user_id,
      'withdrawal_approved',
      'Withdrawal approved',
      jsonb_build_object('amount', new.amount, 'status', 'approved', 'approved_by', new.approved_by)
    );
  end if;

  -- Processing started
  if new.status = 'processing' and old.status <> 'processing' then
    perform create_notification(
      new.user_id,
      'withdrawal_processing',
      'Withdrawal processing',
      jsonb_build_object('amount', new.amount, 'status', 'processing')
    );
  end if;

  -- Sent / Completed
  if new.status = 'sent' and old.status <> 'sent' then
    perform create_notification(
      new.user_id,
      'withdrawal_sent',
      'Your withdrawal has been sent',
      jsonb_build_object('amount', new.amount, 'status', 'sent')
    );
  end if;

  -- Rejected
  if new.status = 'rejected' and old.status <> 'rejected' then
    perform create_notification(
      new.user_id,
      'withdrawal_rejected',
      'Withdrawal rejected',
      jsonb_build_object('amount', new.amount, 'status', 'rejected', 'reason', new.admin_notes)
    );
  end if;

  -- Failed (execution failed)
  if new.status = 'failed' and old.status <> 'failed' then
    perform create_notification(
      new.user_id,
      'withdrawal_failed',
      'Withdrawal failed — funds refunded',
      jsonb_build_object('amount', new.amount, 'status', 'failed', 'reason', new.failure_reason)
    );
  end if;

  -- Cancelled by user
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform create_notification(
      new.user_id,
      'withdrawal_cancelled',
      'Withdrawal cancelled',
      jsonb_build_object('amount', new.amount, 'status', 'cancelled')
    );
  end if;

  return new;
end;
$$;

-- Recreate the trigger
create trigger trg_withdrawal
  after update on public.withdrawal_requests
  for each row execute function public.notify_withdrawal();

-- Re-grant execute on create_notification to service_role (it was revoked in lockdown)
grant execute on function public.create_notification(uuid, text, text, jsonb) to service_role;

-- =============================================================================
-- Note: The RPC lockdown in 20260822000000_trading_ecosystem.sql revoked execute
-- on create_notification from public/anon/authenticated. It's only needed by
-- service_role and the SECURITY DEFINER trigger above.
-- =============================================================================