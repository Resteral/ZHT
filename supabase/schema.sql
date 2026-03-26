
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  balance numeric default 0.00 not null check (balance >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;

create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

-- TRANSACTIONS TABLE
-- Create types safely
do $$ begin
    create type transaction_type as enum ('deposit', 'withdrawal', 'wager_lock', 'wager_payout', 'refund');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type transaction_status as enum ('pending', 'completed', 'failed');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type payment_provider as enum ('stripe', 'crypto', 'platform');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  amount numeric not null,
  type transaction_type not null,
  provider payment_provider not null,
  status transaction_status default 'pending' not null,
  external_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions." on public.transactions
  for select using (auth.uid() = user_id);

-- MATCHES TABLE (Create table first)
do $$ begin
    create type match_status as enum ('open', 'in_progress', 'completed', 'disputed', 'cancelled');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.matches (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.users(id) not null,
  wager_amount numeric not null check (wager_amount >= 0),
  team_size int not null check (team_size between 1 and 6),
  status match_status default 'open' not null,
  winner_team_id int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.matches enable row level security;

-- MATCH PARTICIPANTS TABLE (Create table next)
create table if not exists public.match_participants (
  match_id uuid references public.matches(id) not null,
  user_id uuid references public.users(id) not null,
  team_id int not null check (team_id in (1, 2)),
  status text default 'joined',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (match_id, user_id)
);

alter table public.match_participants enable row level security;

-- NOW ADD POLICIES FOR MATCHES (Since participant table exists)
create policy "Matches are viewable by everyone." on public.matches
  for select using (true);

create policy "Authenticated users can create matches." on public.matches
  for insert with check (auth.role() = 'authenticated');

create policy "Participants can update match status." on public.matches
  for update using (
    exists (
      select 1 from public.match_participants
      where match_id = matches.id and user_id = auth.uid()
    )
  );

-- POLICIES FOR PARTICIPANTS
create policy "Participants are viewable by everyone." on public.match_participants
  for select using (true);

create policy "Users can join matches." on public.match_participants
  for insert with check (auth.uid() = user_id);

-- Trigger definition
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new; 
end;
$$ language 'plpgsql';

drop trigger if exists update_matches_modtime on public.matches;
create trigger update_matches_modtime
    before update on public.matches
    for each row execute procedure update_modified_column();

-- ATOMIC BALANCE INCREMENT
create or replace function increment_balance(user_id uuid, amount numeric)
returns void as $$
begin
  update public.users
  set balance = balance + amount
  where id = user_id;
end;
$$ language plpgsql;
