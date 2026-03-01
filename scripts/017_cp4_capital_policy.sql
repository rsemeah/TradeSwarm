create table if not exists capital_policy (
  id uuid primary key default gen_random_uuid(),
  confidence_tiers jsonb not null default '{"high":1.0,"medium":0.7,"low":0.4}'::jsonb,
  kelly_fraction_cap numeric not null default 0.25,
  drift_warn_throttle numeric not null default 0.6,
  drift_alert_block boolean not null default true,
  drawdown_brake_floor numeric not null default 0,
  hard_cap_dollars numeric not null default 500,
  schema_version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_capital_policy_active on capital_policy(active);
