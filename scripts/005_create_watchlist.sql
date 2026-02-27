-- Create watchlist table
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  theme text,
  notes text,
  created_at timestamp with time zone default now(),
  unique(user_id, ticker)
);

-- Enable RLS
alter table public.watchlist enable row level security;

-- RLS policies
create policy "watchlist_select_own" on public.watchlist for select using (auth.uid() = user_id);
create policy "watchlist_insert_own" on public.watchlist for insert with check (auth.uid() = user_id);
create policy "watchlist_update_own" on public.watchlist for delete using (auth.uid() = user_id);
create policy "watchlist_delete_own" on public.watchlist for delete using (auth.uid() = user_id);

-- Create index
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);
