begin;

drop policy if exists "payment_bill_files_insert_accessible" on storage.objects;
drop policy if exists "payment_bill_files_select_accessible" on storage.objects;
drop policy if exists "payment_bill_files_delete_accessible" on storage.objects;

create policy "payment_bill_files_insert_accessible"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-request-files'
  and name like 'payment-bills/%'
  and exists (
    select 1
    from public.payment_requests pr
    where pr.id::text = split_part(name, '/', 2)
      and public.current_user_can_access_request(pr.id)
  )
);

create policy "payment_bill_files_select_accessible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-request-files'
  and name like 'payment-bills/%'
  and exists (
    select 1
    from public.payment_requests pr
    where pr.id::text = split_part(name, '/', 2)
      and public.current_user_can_access_request(pr.id)
  )
);

create policy "payment_bill_files_delete_accessible"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-request-files'
  and name like 'payment-bills/%'
  and exists (
    select 1
    from public.payment_requests pr
    where pr.id::text = split_part(name, '/', 2)
      and public.current_user_can_access_request(pr.id)
  )
);

commit;