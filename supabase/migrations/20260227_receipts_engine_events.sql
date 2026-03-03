create extension if not exists pgcrypto;

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  symbol text not null,
  asof_utc timestamptz not null,
  request_id text,
  idempotency_key text,
  determinism_hash text,
  engine_version text,
  config_hash text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  degraded boolean not null default false
);

create index if not exists receipts_created_at_idx on receipts (created_at desc);
create index if not exists receipts_symbol_asof_idx on receipts (symbol, asof_utc desc);
create index if not exists receipts_idempotency_idx on receipts (idempotency_key);

create table if not exists engine_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  symbol text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  ttl_expires_at timestamptz
);

create index if not exists engine_events_created_at_idx on engine_events (created_at desc);
create index if not exists engine_events_session_idx on engine_events (session_id, created_at desc);
