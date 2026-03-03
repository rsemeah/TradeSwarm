-- Create trades table
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  strategy text not null,
  action text not null check (action in ('execute', 'simulate', 'watch', 'skip')),
  status text not null default 'pending' check (status in ('pending', 'executed', 'simulated', 'closed', 'cancelled')),
  entry_price numeric,
  exit_price numeric,
  quantity integer,
  amount numeric,
  pnl numeric,
  growth_score integer,
  trust_score integer,
  rationale text,
  created_at timestamp with time zone default now(),
  closed_at timestamp with time zone
);

-- Enable RLS
alter table public.trades enable row level security;

-- RLS policies
create policy "trades_select_own" on public.trades for select using (auth.uid() = user_id);
create policy "trades_insert_own" on public.trades for insert with check (auth.uid() = user_id);
create policy "trades_update_own" on public.trades for update using (auth.uid() = user_id);
create policy "trades_delete_own" on public.trades for delete using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists trades_user_id_idx on public.trades(user_id);
create index if not exists trades_created_at_idx on public.trades(created_at desc);
