begin;

create or replace function public.insert_payment_request_log(
  target_request_id uuid,
  target_actor_id uuid,
  target_action text,
  target_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_actor_id is distinct from auth.uid() then
    raise exception 'Actor must match authenticated user';
  end if;

  if not public.current_user_can_access_request(target_request_id) then
    raise exception 'Not allowed to write logs for this request';
  end if;

  insert into public.payment_request_logs (
    payment_request_id,
    actor_id,
    action,
    meta
  )
  values (
    target_request_id,
    target_actor_id,
    target_action,
    target_meta
  );
end;
$$;

revoke all on function public.insert_payment_request_log(uuid, uuid, text, jsonb) from public;
grant execute on function public.insert_payment_request_log(uuid, uuid, text, jsonb) to authenticated;

commit;
