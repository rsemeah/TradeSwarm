-- Create portfolio stats table for tracking daily performance
create table if not exists public.portfolio_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  balance numeric not null default 10000,
  day_pnl numeric default 0,
  week_pnl numeric default 0,
  total_trades integer default 0,
  winning_trades integer default 0,
  losing_trades integer default 0,
  max_drawdown numeric default 0,
  paper_trades integer default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

-- Enable RLS
alter table public.portfolio_stats enable row level security;

-- RLS policies
create policy "portfolio_stats_select_own" on public.portfolio_stats for select using (auth.uid() = user_id);
create policy "portfolio_stats_insert_own" on public.portfolio_stats for insert with check (auth.uid() = user_id);
create policy "portfolio_stats_update_own" on public.portfolio_stats for update using (auth.uid() = user_id);

-- Create indexes
create index if not exists portfolio_stats_user_id_idx on public.portfolio_stats(user_id);
create index if not exists portfolio_stats_date_idx on public.portfolio_stats(date desc);

-- Function to initialize portfolio stats for new user
create or replace function public.init_portfolio_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portfolio_stats (user_id, balance)
  values (new.user_id, 10000)
  on conflict (user_id, date) do nothing;

  return new;
end;
$$;

drop trigger if exists on_preferences_created on public.user_preferences;

create trigger on_preferences_created
  after insert on public.user_preferences
  for each row
  execute function public.init_portfolio_stats();
