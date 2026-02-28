create table if not exists operator_trade_journal (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades_v2(id) on delete cascade,
  user_id uuid,
  signal_alignment text not null check (signal_alignment in ('agree','disagree','partial')),
  rationale text not null,
  emotional_state text not null,
  created_at timestamptz not null default now(),
  unique (trade_id)
);

create table if not exists system_controls (
  id uuid primary key default gen_random_uuid(),
  control_key text not null unique,
  is_active boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);

insert into system_controls (control_key, is_active, reason)
values ('trade_engine_frozen', false, 'default')
on conflict (control_key) do nothing;

alter table trade_receipts
  add column if not exists idempotency_key text;

create unique index if not exists trade_receipts_idempotency_key_unique
  on trade_receipts(idempotency_key)
  where idempotency_key is not null;
