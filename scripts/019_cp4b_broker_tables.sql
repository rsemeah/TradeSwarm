create table if not exists broker_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  mode text not null,
  meta jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists broker_orders (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references trades_v2(id),
  broker_acct uuid references broker_accounts(id),
  intent jsonb not null,
  status text not null,
  receipt jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_broker_orders_trade_id on broker_orders(trade_id);
create index if not exists idx_broker_orders_status on broker_orders(status);
