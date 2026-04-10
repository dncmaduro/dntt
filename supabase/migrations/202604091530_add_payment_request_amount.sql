begin;

alter table public.payment_requests
add column if not exists amount numeric(15,2);

comment on column public.payment_requests.amount is
  'So tien de nghi thanh toan cho moi yeu cau.';

commit;
