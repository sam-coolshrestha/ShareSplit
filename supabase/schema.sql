-- ShareSplit database schema

create extension if not exists pgcrypto;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id),
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

-- GROUP MEMBERS
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- FRIENDSHIPS
-- user_a must sort before user_b so each friendship has one canonical row.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

-- EXPENSES
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  paid_by uuid not null references public.profiles(id),
  group_id uuid references public.groups(id) on delete cascade,
  friendship_id uuid references public.friendships(id) on delete cascade,
  split_type text not null check (split_type in ('equal', 'percentage', 'exact', 'itemized')),
  date date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  check (
    (group_id is not null and friendship_id is null)
    or (group_id is null and friendship_id is not null)
  )
);

-- EXPENSE SPLITS
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  amount numeric(12, 2) not null check (amount >= 0),
  is_settled boolean not null default false,
  unique (expense_id, user_id)
);

-- EXPENSE ITEMS
create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0)
);

-- ITEM CLAIMS
create table public.item_claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.expense_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  unique (item_id, user_id)
);

-- SETTLEMENTS
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.profiles(id),
  payee_id uuid not null references public.profiles(id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  group_id uuid references public.groups(id) on delete cascade,
  friendship_id uuid references public.friendships(id) on delete cascade,
  note text,
  settled_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  check (payer_id <> payee_id),
  check (
    (group_id is not null and friendship_id is null)
    or (group_id is null and friendship_id is not null)
  )
);

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'User'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS HELPERS
-- Security-definer helpers prevent recursive policies on group_members.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_friendship_participant(target_friendship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where id = target_friendship_id
      and auth.uid() in (user_a, user_b)
  );
$$;

create or replace function public.can_access_context(
  target_group_id uuid,
  target_friendship_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_group_id is not null
      then public.is_group_member(target_group_id)
    when target_friendship_id is not null
      then public.is_friendship_participant(target_friendship_id)
    else false
  end;
$$;

create or replace function public.can_access_expense(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.expenses
    where id = target_expense_id
      and public.can_access_context(group_id, friendship_id)
  );
$$;

create or replace function public.can_manage_expense(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.expenses
    where id = target_expense_id
      and created_by = auth.uid()
      and public.can_access_context(group_id, friendship_id)
  );
$$;

create or replace function public.can_access_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.expense_items
    where id = target_item_id
      and public.can_access_expense(expense_id)
  );
$$;

create or replace function public.can_manage_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.expense_items
    where id = target_item_id
      and public.can_manage_expense(expense_id)
  );
$$;

-- ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.friendships enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.expense_items enable row level security;
alter table public.item_claims enable row level security;
alter table public.settlements enable row level security;

-- PROFILE POLICIES
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- GROUP POLICIES
create policy "Members can view groups"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "Users can create groups"
  on public.groups for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Admins can update groups"
  on public.groups for update
  to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

create policy "Admins can delete groups"
  on public.groups for delete
  to authenticated
  using (public.is_group_admin(id));

-- GROUP MEMBER POLICIES
create policy "Members can view group members"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Creators and admins can add group members"
  on public.group_members for insert
  to authenticated
  with check (
    public.is_group_admin(group_id)
    or exists (
      select 1
      from public.groups
      where id = group_id
        and created_by = auth.uid()
    )
  );

create policy "Admins can update group members"
  on public.group_members for update
  to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

create policy "Admins and members can remove group membership"
  on public.group_members for delete
  to authenticated
  using (public.is_group_admin(group_id) or user_id = auth.uid());

-- FRIENDSHIP POLICIES
create policy "Participants can view friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (user_a, user_b));

create policy "Users can create their friendships"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() in (user_a, user_b));

create policy "Participants can delete friendships"
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (user_a, user_b));

-- EXPENSE POLICIES
create policy "Context members can view expenses"
  on public.expenses for select
  to authenticated
  using (public.can_access_context(group_id, friendship_id));

create policy "Context members can create expenses"
  on public.expenses for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );

create policy "Expense creators can update expenses"
  on public.expenses for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  )
  with check (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );

create policy "Expense creators can delete expenses"
  on public.expenses for delete
  to authenticated
  using (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );

-- EXPENSE SPLIT POLICIES
create policy "Context members can view expense splits"
  on public.expense_splits for select
  to authenticated
  using (public.can_access_expense(expense_id));

create policy "Expense creators can add expense splits"
  on public.expense_splits for insert
  to authenticated
  with check (public.can_manage_expense(expense_id));

create policy "Expense creators can update expense splits"
  on public.expense_splits for update
  to authenticated
  using (public.can_manage_expense(expense_id))
  with check (public.can_manage_expense(expense_id));

create policy "Expense creators can delete expense splits"
  on public.expense_splits for delete
  to authenticated
  using (public.can_manage_expense(expense_id));

-- EXPENSE ITEM POLICIES
create policy "Context members can view expense items"
  on public.expense_items for select
  to authenticated
  using (public.can_access_expense(expense_id));

create policy "Expense creators can add expense items"
  on public.expense_items for insert
  to authenticated
  with check (public.can_manage_expense(expense_id));

create policy "Expense creators can update expense items"
  on public.expense_items for update
  to authenticated
  using (public.can_manage_expense(expense_id))
  with check (public.can_manage_expense(expense_id));

create policy "Expense creators can delete expense items"
  on public.expense_items for delete
  to authenticated
  using (public.can_manage_expense(expense_id));

-- ITEM CLAIM POLICIES
create policy "Context members can view item claims"
  on public.item_claims for select
  to authenticated
  using (public.can_access_item(item_id));

create policy "Expense creators can add item claims"
  on public.item_claims for insert
  to authenticated
  with check (public.can_manage_item(item_id));

create policy "Expense creators can update item claims"
  on public.item_claims for update
  to authenticated
  using (public.can_manage_item(item_id))
  with check (public.can_manage_item(item_id));

create policy "Expense creators can delete item claims"
  on public.item_claims for delete
  to authenticated
  using (public.can_manage_item(item_id));

-- SETTLEMENT POLICIES
create policy "Context members can view settlements"
  on public.settlements for select
  to authenticated
  using (public.can_access_context(group_id, friendship_id));

create policy "Context members can create settlements"
  on public.settlements for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );

create policy "Settlement creators can update settlements"
  on public.settlements for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  )
  with check (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );

create policy "Settlement creators can delete settlements"
  on public.settlements for delete
  to authenticated
  using (
    created_by = auth.uid()
    and public.can_access_context(group_id, friendship_id)
  );
