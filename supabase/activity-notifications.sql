create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  link_href text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_is_read
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.insert_notification(
  target_user_id uuid,
  target_actor_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  target_link_href text,
  target_entity_type text,
  target_entity_id uuid,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    link_href,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_user_id,
    target_actor_id,
    notification_type,
    notification_title,
    notification_body,
    target_link_href,
    target_entity_type,
    target_entity_id,
    coalesce(target_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set is_read = true
  where id = target_notification_id
    and user_id = auth.uid();
$$;

create or replace function public.mark_notification_unread(target_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set is_read = false
  where id = target_notification_id
    and user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set is_read = true
  where user_id = auth.uid()
    and is_read = false;
$$;

create or replace function public.create_reminder_notification(
  target_user_id uuid,
  target_expense_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  expense_record public.expenses%rowtype;
  reminder_id uuid;
begin
  select *
  into expense_record
  from public.expenses
  where id = target_expense_id;

  if expense_record.id is null then
    raise exception 'Expense not found';
  end if;

  if expense_record.paid_by <> auth.uid() then
    raise exception 'Only the payer can send reminders';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot remind yourself';
  end if;

  reminder_id := public.insert_notification(
    target_user_id,
    auth.uid(),
    'reminder_sent',
    'Payment reminder',
    'You still have a pending share on a shared expense.',
    coalesce(
      case
        when expense_record.group_id is not null then '/groups/' || expense_record.group_id::text
        when expense_record.friendship_id is not null then '/friends/' || expense_record.friendship_id::text
        else '/dashboard'
      end,
      '/dashboard'
    ),
    'expense',
    target_expense_id,
    jsonb_build_object('expense_id', target_expense_id)
  );

  return reminder_id;
end;
$$;

create or replace function public.notify_group_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.insert_notification(
    new.created_by,
    new.created_by,
    'group_created',
    'Group created',
    'Your group "' || new.name || '" is ready.',
    '/groups/' || new.id::text,
    'group',
    new.id,
    jsonb_build_object('group_name', new.name)
  );

  return new;
end;
$$;

create or replace function public.notify_friendship_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.insert_notification(
    new.user_a,
    auth.uid(),
    'friend_added',
    'Friend added',
    'A new friendship is now active in ShareSplit.',
    '/friends/' || new.id::text,
    'friendship',
    new.id,
    '{}'::jsonb
  );

  perform public.insert_notification(
    new.user_b,
    auth.uid(),
    'friend_added',
    'Friend added',
    'A new friendship is now active in ShareSplit.',
    '/friends/' || new.id::text,
    'friendship',
    new.id,
    '{}'::jsonb
  );

  return new;
end;
$$;

create or replace function public.notify_group_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_name text;
begin
  select name into group_name from public.groups where id = new.group_id;

  perform public.insert_notification(
    new.user_id,
    auth.uid(),
    'added_to_group',
    'Added to group',
    'You were added to "' || coalesce(group_name, 'a group') || '".',
    '/groups/' || new.group_id::text,
    'group',
    new.group_id,
    jsonb_build_object('group_id', new.group_id)
  );

  return new;
end;
$$;

create or replace function public.notify_expense_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  split_record record;
  notification_type text;
  notification_title text;
  link_href text;
begin
  notification_type := case
    when tg_op = 'UPDATE' and new.is_deleted = true then 'expense_deleted'
    when tg_op = 'UPDATE' then 'expense_updated'
    else 'expense_added'
  end;

  notification_title := case notification_type
    when 'expense_deleted' then 'Expense deleted'
    when 'expense_updated' then 'Expense updated'
    else 'Expense added'
  end;

  link_href := case
    when new.group_id is not null then '/groups/' || new.group_id::text
    when new.friendship_id is not null then '/friends/' || new.friendship_id::text
    else '/dashboard'
  end;

  for split_record in
    select user_id, amount
    from public.expense_splits
    where expense_id = new.id
  loop
    perform public.insert_notification(
      split_record.user_id,
      new.created_by,
      notification_type,
      notification_title,
      new.description,
      link_href,
      'expense',
      new.id,
      jsonb_build_object('share_amount', split_record.amount)
    );

    if split_record.user_id <> new.paid_by then
      perform public.insert_notification(
        split_record.user_id,
        new.created_by,
        'balance_update',
        'Balance updated',
        'Your balance changed for "' || new.description || '".',
        link_href,
        'expense',
        new.id,
        jsonb_build_object('share_amount', split_record.amount)
      );
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.notify_settlement_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_href text;
begin
  link_href := case
    when new.group_id is not null then '/groups/' || new.group_id::text
    when new.friendship_id is not null then '/friends/' || new.friendship_id::text
    else '/dashboard'
  end;

  perform public.insert_notification(
    new.payer_id,
    new.created_by,
    'settlement_completed',
    'Settlement completed',
    'A payment was recorded to settle a shared balance.',
    link_href,
    'settlement',
    new.id,
    jsonb_build_object('amount', new.amount)
  );

  perform public.insert_notification(
    new.payee_id,
    new.created_by,
    'settlement_completed',
    'Settlement completed',
    'A payment was recorded to settle a shared balance.',
    link_href,
    'settlement',
    new.id,
    jsonb_build_object('amount', new.amount)
  );

  return new;
end;
$$;

drop trigger if exists notify_group_created_trigger on public.groups;
create trigger notify_group_created_trigger
  after insert on public.groups
  for each row execute function public.notify_group_created();

drop trigger if exists notify_friendship_created_trigger on public.friendships;
create trigger notify_friendship_created_trigger
  after insert on public.friendships
  for each row execute function public.notify_friendship_created();

drop trigger if exists notify_group_member_added_trigger on public.group_members;
create trigger notify_group_member_added_trigger
  after insert on public.group_members
  for each row execute function public.notify_group_member_added();

drop trigger if exists notify_expense_change_trigger on public.expenses;
create trigger notify_expense_change_trigger
  after insert or update on public.expenses
  for each row execute function public.notify_expense_change();

drop trigger if exists notify_settlement_created_trigger on public.settlements;
create trigger notify_settlement_created_trigger
  after insert on public.settlements
  for each row execute function public.notify_settlement_created();

revoke all on function public.insert_notification(uuid, uuid, text, text, text, text, text, uuid, jsonb) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_notification_unread(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.create_reminder_notification(uuid, uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_notification_unread(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.create_reminder_notification(uuid, uuid) to authenticated;
