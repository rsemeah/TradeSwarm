-- Migration 013: Scanner tables
-- Creates scan_results and scan_candidates for the full universe scanner.
-- RLS: each user can only read their own scans.

-- ─── scan_results ──────────────────────────────────────────────────────────

create table if not exists scan_results (
  id          uuid primary key default gen_random_uuid(),
  scan_id     text not null unique,
  user_id     uuid not null references auth.users(id) on delete cascade,
  regime      jsonb not null default '{}',
  ranking_summary jsonb not null default '{}',
  ts          timestamptz not null default now()
);

create index if not exists scan_results_user_ts
  on scan_results (user_id, ts desc);

alter table scan_results enable row level security;

create policy "Users can manage their own scans"
  on scan_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── scan_candidates ───────────────────────────────────────────────────────

create table if not exists scan_candidates (
  id            uuid primary key default gen_random_uuid(),
  scan_id       text not null references scan_results(scan_id) on delete cascade,
  candidate_id  text not null,
  ticker        text not null,
  spread_type   text not null check (spread_type in ('PCS', 'CCS', 'CDS')),
  tier          text not null check (tier in ('A', 'B', 'C')),
  expiration    date not null,
  dte           integer not null,
  score_final   numeric(5,4) not null,
  proof_bundle  jsonb not null,
  ts            timestamptz not null default now(),

  unique (scan_id, candidate_id)
);

create index if not exists scan_candidates_scan_id
  on scan_candidates (scan_id, score_final desc);

create index if not exists scan_candidates_ticker
  on scan_candidates (ticker, ts desc);

create index if not exists scan_candidates_proof_gin
  on scan_candidates using gin (proof_bundle);

alter table scan_candidates enable row level security;

-- Inherit security through scan_results join
create policy "Users can read their scan candidates"
  on scan_candidates for select
  using (
    exists (
      select 1 from scan_results sr
      where sr.scan_id = scan_candidates.scan_id
        and sr.user_id = auth.uid()
    )
  );

create policy "Service role can insert scan candidates"
  on scan_candidates for insert
  with check (true);
