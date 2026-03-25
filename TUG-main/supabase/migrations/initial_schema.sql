-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table (Extends Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  balance numeric default 0 check (balance >= 0),
  created_at timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- Matches Table
create type match_status as enum ('open', 'starting', 'in_progress', 'completed', 'disputed', 'cancelled');

create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.users(id) not null,
  game_mode text not null,
  entry_fee numeric not null check (entry_fee >= 0),
  team_size int not null default 1,
  status match_status default 'open',
  winner_team int,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;
create policy "Anyone can view matches" on public.matches for select using (true);
create policy "Authenticated users can create matches" on public.matches for insert with check (auth.role() = 'authenticated');

-- Match Participants Table
create type participant_status as enum ('pending', 'ready');

create table public.match_participants (
  match_id uuid references public.matches(id) not null,
  user_id uuid references public.users(id) not null,
  team int not null,
  status participant_status default 'pending',
  joined_at timestamptz default now(),
  primary key (match_id, user_id)
);

alter table public.match_participants enable row level security;
create policy "Anyone can view participants" on public.match_participants for select using (true);
create policy "Users can join matches" on public.match_participants for insert with check (auth.uid() = user_id);

-- Transactions Table
create type transaction_type as enum ('deposit', 'withdrawal', 'wager_entry', 'wager_payout', 'refund');
create type transaction_status as enum ('pending', 'completed', 'failed');

create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  amount numeric not null,
  type transaction_type not null,
  status transaction_status default 'pending',
  provider text, -- 'stripe', 'crypto', 'platform'
  external_id text,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Users can view their own transactions" on public.transactions for select using (auth.uid() = user_id);
