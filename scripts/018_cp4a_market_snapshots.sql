create table if not exists market_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_hash text not null unique,
  provider text not null,
  schema_version integer not null default 1,
  as_of timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_market_snapshots_provider_as_of on market_snapshots(provider, as_of desc);
