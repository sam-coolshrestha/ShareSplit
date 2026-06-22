-- Run this migration in the Supabase SQL Editor for an existing ShareSplit database.

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  invited_user_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (group_id, invited_user_id)
);

alter table public.group_invites enable row level security;

drop policy if exists "Users can view their own invites" on public.group_invites;
create policy "Users can view their own invites"
  on public.group_invites for select
  to authenticated
  using (auth.uid() = invited_user_id or auth.uid() = invited_by);

drop policy if exists "Admins can create invites" on public.group_invites;
create policy "Admins can create invites"
  on public.group_invites for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and public.is_group_admin(group_id)
  );

drop policy if exists "Invited users can update their invite" on public.group_invites;
create policy "Invited users can update their invite"
  on public.group_invites for update
  to authenticated
  using (auth.uid() = invited_user_id)
  with check (auth.uid() = invited_user_id);

drop policy if exists "Members can view groups" on public.groups;
create policy "Members can view groups"
  on public.groups for select
  to authenticated
  using (
    public.is_group_member(id)
    or exists (
      select 1
      from public.group_invites
      where group_id = groups.id
        and invited_user_id = auth.uid()
        and status = 'pending'
    )
  );

create or replace function public.invite_user_to_group(
  target_group_id uuid,
  invited_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  invite_id uuid;
begin
  if not public.is_group_admin(target_group_id) then
    raise exception 'Only group admins can invite members';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(invited_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No ShareSplit account exists for that email';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You are already a member of this group';
  end if;

  if exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
  ) then
    raise exception 'That user is already a group member';
  end if;

  insert into public.group_invites (group_id, invited_by, invited_user_id, status)
  values (target_group_id, auth.uid(), target_user_id, 'pending')
  on conflict (group_id, invited_user_id)
  do update set
    invited_by = excluded.invited_by,
    status = 'pending',
    created_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.accept_group_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.group_invites%rowtype;
begin
  select *
  into invite_record
  from public.group_invites
  where id = target_invite_id
  for update;

  if invite_record.id is null
    or invite_record.invited_user_id <> auth.uid()
    or invite_record.status <> 'pending' then
    raise exception 'Invite is not available';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invite_record.group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  update public.group_invites
  set status = 'accepted'
  where id = target_invite_id;
end;
$$;

create or replace function public.decline_group_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_invites
  set status = 'declined'
  where id = target_invite_id
    and invited_user_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Invite is not available';
  end if;
end;
$$;

create or replace function public.create_group_with_admin_membership(
  group_name text,
  group_description text,
  group_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a group';
  end if;

  insert into public.groups (name, description, currency, created_by)
  values (
    trim(group_name),
    nullif(trim(group_description), ''),
    group_currency,
    auth.uid()
  )
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'admin')
  on conflict (group_id, user_id) do nothing;

  return new_group_id;
end;
$$;

revoke all on function public.invite_user_to_group(uuid, text) from public;
revoke all on function public.accept_group_invite(uuid) from public;
revoke all on function public.decline_group_invite(uuid) from public;
revoke all on function public.create_group_with_admin_membership(text, text, text) from public;
grant execute on function public.invite_user_to_group(uuid, text) to authenticated;
grant execute on function public.accept_group_invite(uuid) to authenticated;
grant execute on function public.decline_group_invite(uuid) to authenticated;
grant execute on function public.create_group_with_admin_membership(text, text, text) to authenticated;
