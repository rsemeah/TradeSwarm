-- Expand engine events to include per-stage telemetry and correlation tracking
ALTER TABLE engine_events
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- If a legacy constraint exists for event_type values, drop it so stage constants can be stored.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'engine_events'::regclass
    AND pg_get_constraintdef(oid) ILIKE '%event_type IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE engine_events DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_engine_events_payload_status ON engine_events ((payload->>'status'));
CREATE INDEX IF NOT EXISTS idx_engine_events_payload_correlation ON engine_events ((payload->>'correlationId'));
