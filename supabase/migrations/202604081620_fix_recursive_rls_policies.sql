begin;

-- Resolve recursive profile policy evaluation by moving role lookups into
-- SECURITY DEFINER helpers that do not rely on table-level RLS.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create or replace function public.current_user_is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('accountant', 'director'), false);
$$;

revoke all on function public.current_user_is_reviewer() from public;
grant execute on function public.current_user_is_reviewer() to authenticated;

create or replace function public.current_user_can_access_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payment_requests as pr
    where pr.id = target_request_id
      and (
        pr.user_id = auth.uid()
        or public.current_user_is_reviewer()
      )
  );
$$;

revoke all on function public.current_user_can_access_request(uuid) from public;
grant execute on function public.current_user_can_access_request(uuid) to authenticated;

create or replace function public.profiles_restrict_user_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.role() <> 'service_role' then
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot be changed';
    end if;

    if new.role is distinct from old.role then
      raise exception 'Profile role cannot be changed';
    end if;

    if new.created_at is distinct from old.created_at then
      raise exception 'Profile created_at cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'payment_requests',
        'payment_request_attachments',
        'payment_request_logs',
        'notifications'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_request_attachments enable row level security;
alter table public.payment_request_logs enable row level security;
alter table public.notifications enable row level security;

drop trigger if exists profiles_restrict_user_updates on public.profiles;
create trigger profiles_restrict_user_updates
before update on public.profiles
for each row
execute function public.profiles_restrict_user_updates();

create policy "profiles_authenticated_select"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "payment_requests_select_accessible"
on public.payment_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_reviewer()
);

create policy "payment_requests_insert_employee"
on public.payment_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_user_role() = 'employee'
);

create policy "payment_requests_update_accessible"
on public.payment_requests
for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_reviewer()
)
with check (
  user_id = auth.uid()
  or public.current_user_is_reviewer()
);

create policy "payment_requests_delete_owner"
on public.payment_requests
for delete
to authenticated
using (user_id = auth.uid());

create policy "payment_request_attachments_select_accessible"
on public.payment_request_attachments
for select
to authenticated
using (public.current_user_can_access_request(payment_request_id));

create policy "payment_request_attachments_insert_owner"
on public.payment_request_attachments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.payment_requests as pr
    where pr.id = payment_request_id
      and pr.user_id = auth.uid()
  )
);

create policy "payment_request_attachments_delete_owner"
on public.payment_request_attachments
for delete
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1
    from public.payment_requests as pr
    where pr.id = payment_request_id
      and pr.user_id = auth.uid()
  )
);

create policy "payment_request_logs_select_accessible"
on public.payment_request_logs
for select
to authenticated
using (public.current_user_can_access_request(payment_request_id));

create policy "payment_request_logs_insert_accessible_actor"
on public.payment_request_logs
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.current_user_can_access_request(payment_request_id)
);

create policy "notifications_select_self"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_insert_for_accessible_request"
on public.notifications
for insert
to authenticated
with check (
  entity_type = 'payment_request'
  and entity_id is not null
  and public.current_user_can_access_request(entity_id)
);

create policy "notifications_update_self"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
