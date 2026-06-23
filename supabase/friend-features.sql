create or replace function public.create_friendship_by_email(invited_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  target_user_id uuid;
  lower_user_id uuid;
  higher_user_id uuid;
  friendship_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in to add a friend';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(invited_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No ShareSplit account exists for that email';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot add yourself as a friend';
  end if;

  if current_user_id < target_user_id then
    lower_user_id := current_user_id;
    higher_user_id := target_user_id;
  else
    lower_user_id := target_user_id;
    higher_user_id := current_user_id;
  end if;

  insert into public.friendships (user_a, user_b)
  values (lower_user_id, higher_user_id)
  on conflict (user_a, user_b) do update
  set user_a = excluded.user_a
  returning id into friendship_id;

  return friendship_id;
end;
$$;

revoke all on function public.create_friendship_by_email(text) from public;
grant execute on function public.create_friendship_by_email(text) to authenticated;
