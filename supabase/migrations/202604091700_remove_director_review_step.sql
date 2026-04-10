begin;

-- Collapse the old director review step into the accountant approval step.
update public.payment_requests
set
  status = 'director_approved',
  director_note = null,
  director_approved_by = null,
  director_approved_at = null,
  updated_at = now()
where status = 'pending_director';

update public.payment_requests
set
  status = 'accounting_rejected',
  accounting_note = coalesce(accounting_note, director_note),
  accounting_confirmed_by = coalesce(accounting_confirmed_by, director_approved_by),
  accounting_confirmed_at = coalesce(accounting_confirmed_at, director_approved_at),
  director_note = null,
  director_approved_by = null,
  director_approved_at = null,
  updated_at = now()
where status = 'director_rejected';

commit;
