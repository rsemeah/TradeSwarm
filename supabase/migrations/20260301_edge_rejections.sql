create table if not exists edge_rejections (
  id uuid primary key default gen_random_uuid(),
  trade_id text null,
  schema_version text not null,
  engine_version text not null,
  input_hash text not null,
  market_snapshot_hash text not null,
  rejection_reason text not null,
  threshold_used jsonb not null,
  trade_candidate jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists edge_rejections_reason_idx on edge_rejections (rejection_reason);
create index if not exists edge_rejections_created_at_idx on edge_rejections (created_at desc);
