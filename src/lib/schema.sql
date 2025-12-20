-- Users table (extends Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies for users
create policy "Public profiles are viewable by everyone."
  on public.users for select
  using ( true );

create policy "Users can insert their own profile."
  on public.users for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.users for update
  using ( auth.uid() = id );

-- TLE Cache Table
create table public.tle_cache (
  norad_id text primary key,
  name text not null,
  line1 text not null,
  line2 text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for TLE Cache
alter table public.tle_cache enable row level security;

-- TLE Cache is readable by everyone
create policy "TLE Cache is viewable by everyone."
  on public.tle_cache for select
  using ( true );

-- Only service role can update TLE cache (or authenticated users if you want crowd-sourcing)
-- For now, let's allow authenticated users to insert/update if it's missing (optional)
create policy "Authenticated users can update TLE cache."
  on public.tle_cache for all
  using ( auth.role() = 'authenticated' );


-- Tracked Satellites (Watchlist)
create table public.tracked_satellites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  norad_id text references public.tle_cache(norad_id),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, norad_id)
);

-- Enable RLS
alter table public.tracked_satellites enable row level security;

-- Users can view their own watchlist
create policy "Users can view own watchlist."
  on public.tracked_satellites for select
  using ( auth.uid() = user_id );

-- Users can insert into their own watchlist
create policy "Users can insert into own watchlist."
  on public.tracked_satellites for insert
  with check ( auth.uid() = user_id );

-- Users can delete from their own watchlist
create policy "Users can delete from own watchlist."
  on public.tracked_satellites for delete
  using ( auth.uid() = user_id );
