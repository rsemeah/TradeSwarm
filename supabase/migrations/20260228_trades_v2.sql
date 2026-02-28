create extension if not exists pgcrypto;

create table if not exists trades_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text not null,
  strategy_type text not null,
  entry_date timestamptz not null,
  expiration_date date not null,
  strikes jsonb not null,
  credit_received numeric,
  max_risk numeric,
  engine_score_at_entry int,
  regime_at_entry text,
  proof_snapshot jsonb not null,
  outcome text check (outcome in ('open','win','loss','breakeven')) default 'open',
  exit_price numeric,
  realized_pnl numeric,
  notes text,
  created_at timestamptz default now()
);

create index if not exists trades_v2_user_id_idx on trades_v2 (user_id);
create index if not exists trades_v2_ticker_idx on trades_v2 (ticker);
create index if not exists trades_v2_entry_date_desc_idx on trades_v2 (entry_date desc);

alter table trades_v2 enable row level security;

create policy "trades_v2_select_own"
  on trades_v2
  for select
  using (user_id = auth.uid());

create policy "trades_v2_insert_own"
  on trades_v2
  for insert
  with check (user_id = auth.uid());

create policy "trades_v2_update_own"
  on trades_v2
  for update
  using (user_id = auth.uid());
