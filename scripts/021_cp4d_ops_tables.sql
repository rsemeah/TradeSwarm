create table if not exists system_health (
  id uuid primary key default gen_random_uuid(),
  check_type text not null,
  health_state text not null,
  detail jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists maintenance_events (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null,
  summary jsonb,
  ran_at timestamptz not null default now()
);

create table if not exists incident_log (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  triggered_by text,
  metrics_snapshot jsonb,
  recommended_action text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
