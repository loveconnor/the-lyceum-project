-- Ensure waitlist_signups works with ON CONFLICT by adding a direct unique constraint on email
alter table public.waitlist_signups
  add constraint waitlist_signups_email_unique unique (email);

-- Keep the lower(email) unique index for case-insensitive protection; remove the next line if you don't want it.
-- Existing index: waitlist_signups_email_key on lower(email)
