alter table capital_policy
  add column if not exists daily_loss_limit_total numeric default 500,
  add column if not exists max_trades_per_day integer default 10,
  add column if not exists feed_staleness_max_sec integer default 120,
  add column if not exists kill_switch_active boolean default false;
