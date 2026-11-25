create table if not exists public.private_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  amount numeric,
  description text,
  payment_date date,
  sub_category_id uuid references public.sub_categories(id) on delete set null,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_payment_requests_created_at_idx
  on public.private_payment_requests (created_at desc);
create index if not exists private_payment_requests_payment_date_idx
  on public.private_payment_requests (payment_date desc);
create index if not exists private_payment_requests_sub_category_id_idx
  on public.private_payment_requests (sub_category_id);

create table if not exists public.private_payment_request_attachments (
  id uuid primary key default gen_random_uuid(),
  private_payment_request_id uuid not null references public.private_payment_requests(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  file_path text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create index if not exists private_payment_request_attachments_request_id_idx
  on public.private_payment_request_attachments (private_payment_request_id);

create table if not exists public.private_payment_request_logs (
  id uuid primary key default gen_random_uuid(),
  private_payment_request_id uuid not null references public.private_payment_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists private_payment_request_logs_request_id_idx
  on public.private_payment_request_logs (private_payment_request_id, created_at desc);

alter table public.private_payment_requests enable row level security;
alter table public.private_payment_request_attachments enable row level security;
alter table public.private_payment_request_logs enable row level security;

create or replace function public.is_private_dntt_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('accountant', 'director')
  );
$$;

create or replace function public.is_private_dntt_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'director'
  );
$$;

drop policy if exists "private dntt reviewers can view requests"
  on public.private_payment_requests;
create policy "private dntt reviewers can view requests"
  on public.private_payment_requests
  for select to authenticated
  using (public.is_private_dntt_reviewer());

drop policy if exists "private dntt directors can create requests"
  on public.private_payment_requests;
create policy "private dntt directors can create requests"
  on public.private_payment_requests
  for insert to authenticated
  with check (public.is_private_dntt_director() and user_id = auth.uid());

drop policy if exists "private dntt reviewers can view attachments"
  on public.private_payment_request_attachments;
create policy "private dntt reviewers can view attachments"
  on public.private_payment_request_attachments
  for select to authenticated
  using (public.is_private_dntt_reviewer());

drop policy if exists "private dntt directors can create attachments"
  on public.private_payment_request_attachments;
create policy "private dntt directors can create attachments"
  on public.private_payment_request_attachments
  for insert to authenticated
  with check (
    public.is_private_dntt_director()
    and created_by = auth.uid()
    and exists (
      select 1
      from public.private_payment_requests request
      where request.id = private_payment_request_id
        and request.user_id = auth.uid()
    )
  );

drop policy if exists "private dntt reviewers can view logs"
  on public.private_payment_request_logs;
create policy "private dntt reviewers can view logs"
  on public.private_payment_request_logs
  for select to authenticated
  using (public.is_private_dntt_reviewer());

drop policy if exists "private dntt directors can create logs"
  on public.private_payment_request_logs;
create policy "private dntt directors can create logs"
  on public.private_payment_request_logs
  for insert to authenticated
  with check (
    public.is_private_dntt_director()
    and actor_id = auth.uid()
    and exists (
      select 1
      from public.private_payment_requests request
      where request.id = private_payment_request_id
        and request.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('private-payment-request-files', 'private-payment-request-files', false)
on conflict (id) do nothing;

drop policy if exists "private dntt directors can upload files"
  on storage.objects;
create policy "private dntt directors can upload files"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'private-payment-request-files'
    and public.is_private_dntt_director()
    and owner_id = auth.uid()::text
  );

drop policy if exists "private dntt reviewers can view files"
  on storage.objects;
create policy "private dntt reviewers can view files"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-payment-request-files'
    and public.is_private_dntt_reviewer()
  );

drop policy if exists "private dntt directors can delete own files"
  on storage.objects;
create policy "private dntt directors can delete own files"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'private-payment-request-files'
    and owner_id = auth.uid()::text
  );
