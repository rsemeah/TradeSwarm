create table if not exists replay_convergence (
  id uuid primary key default gen_random_uuid(),
  trade_id text not null,
  run_id text not null,
  schema_version text not null,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  match boolean not null,
  divergence_field text null,
  divergence_path text null,
  created_at timestamptz not null default now()
);

create index if not exists replay_convergence_trade_id_created_at_idx on replay_convergence (trade_id, created_at desc);
create index if not exists replay_convergence_input_hash_idx on replay_convergence (input_hash);
create index if not exists replay_convergence_match_idx on replay_convergence (match);
