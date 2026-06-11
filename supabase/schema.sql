-- PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- GROUPS
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) not null,
  currency text default 'INR' not null,
  created_at timestamptz default now() not null
);
alter table public.groups enable row level security;

-- GROUP MEMBERS
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);
alter table public.group_members enable row level security;

-- RLS: group members can see their own groups
create policy "Members can view their groups" on public.groups for select
  using (exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid()));
create policy "Members can view group members" on public.group_members for select
  using (exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()));

-- FRIENDSHIPS (1-on-1 debt tracking)
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_a uuid references public.profiles(id) not null,
  user_b uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  unique(user_a, user_b),
  check (user_a  0),
  currency text default 'INR' not null,
  paid_by uuid references public.profiles(id) not null,
  group_id uuid references public.groups(id) on delete cascade,
  friendship_id uuid references public.friendships(id) on delete cascade,
  split_type text not null check (split_type in ('equal', 'percentage', 'exact', 'itemized')),
  date date default current_date not null,
  notes text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  is_deleted boolean default false not null,
  check (
    (group_id is not null and friendship_id is null) or
    (group_id is null and friendship_id is not null)
  )
);
alter table public.expenses enable row level security;

-- EXPENSES
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  paid_by uuid references public.profiles(id) not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text default 'INR' not null,
  split_type text not null check (split_type in ('equal', 'percentage', 'exact', 'itemized')),
  date date default current_date not null,
  notes text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  is_deleted boolean default false not null
);
alter table public.expenses enable row level security;

-- EXPENSE SPLITS
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  is_settled boolean default false not null,
  unique(expense_id, user_id)
);
alter table public.expense_splits enable row level security;

-- EXPENSE ITEMS (for itemized split)
create table public.expense_items (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0)
);
alter table public.expense_items enable row level security;

create table public.item_claims (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.expense_items(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  share_amount numeric(12,2) not null,  -- how much of this item this user owes
  unique(item_id, user_id)
);
alter table public.item_claims enable row level security;

-- SETTLEMENTS
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  payer_id uuid references public.profiles(id) not null,   -- person paying
  payee_id uuid references public.profiles(id) not null,   -- person receiving
  amount numeric(12,2) not null check (amount > 0),
  currency text default 'INR' not null,
  group_id uuid references public.groups(id) on delete cascade,
  friendship_id uuid references public.friendships(id) on delete cascade,
  note text,
  settled_at timestamptz default now() not null,
  created_by uuid references public.profiles(id) not null
);
alter table public.settlements enable row level security;
