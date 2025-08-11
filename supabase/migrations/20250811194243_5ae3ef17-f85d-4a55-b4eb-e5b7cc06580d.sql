-- Create a secure function to mark all existing incoming messages as read up to a cutoff (default now)
create or replace function public.reset_inbox_globally(p_cutoff timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_is_manager boolean := false;
  v_updated integer := 0;
begin
  -- Ensure caller is authenticated
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  -- Check role (admin or manager)
  select exists (
    select 1 from public.user_roles
    where user_id = v_user and role in ('admin','manager')
  ) into v_is_manager;

  if not v_is_manager then
    return jsonb_build_object('success', false, 'error', 'Admin or manager role required');
  end if;

  -- Mark all unread incoming messages up to cutoff as read
  update public.conversations
  set read_at = p_cutoff,
      updated_at = now()
  where direction = 'in'
    and read_at is null
    and sent_at <= p_cutoff;

  get diagnostics v_updated = ROW_COUNT;

  return jsonb_build_object('success', true, 'updated', v_updated, 'cutoff', p_cutoff);
end;
$$;

-- Allow authenticated users to call it (function enforces role checks internally)
grant execute on function public.reset_inbox_globally(timestamptz) to authenticated;