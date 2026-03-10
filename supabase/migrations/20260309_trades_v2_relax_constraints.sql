-- Migration: 20260309_trades_v2_relax_constraints
--
-- The engine inserts a trade record at decision time before option details
-- (expiration_date, strikes) are confirmed.  Relax the NOT NULL constraints so
-- the engine can persist the record immediately and the journal/broker layer can
-- patch the remaining fields later.

ALTER TABLE trades_v2
  ALTER COLUMN expiration_date DROP NOT NULL,
  ALTER COLUMN strikes         DROP NOT NULL;
