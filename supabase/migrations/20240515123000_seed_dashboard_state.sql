-- Ensure each user gets a dashboard_state row on creation and backfill existing users

create or replace function public.create_dashboard_state()
returns trigger as $$
begin
  insert into public.dashboard_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists create_dashboard_state_on_auth_users on auth.users;
create trigger create_dashboard_state_on_auth_users
after insert on auth.users
for each row execute procedure public.create_dashboard_state();

-- Backfill for existing users/profiles
insert into public.dashboard_state (user_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.dashboard_state ds where ds.user_id = p.id
)
on conflict (user_id) do nothing;
