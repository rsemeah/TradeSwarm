CREATE OR REPLACE VIEW replay_convergence_metrics AS
WITH recent AS (
  SELECT match, mismatch_classification, created_at
  FROM trade_replay_reports
  ORDER BY created_at DESC
  LIMIT 1000
),
counts AS (
  SELECT COUNT(*)::INT AS total,
         COUNT(*) FILTER (WHERE match)::INT AS matches,
         MAX(created_at) AS last_run_at
  FROM recent
),
mismatches AS (
  SELECT COALESCE(jsonb_object_agg(mismatch_classification, mismatch_count), '{}'::jsonb) AS by_classification
  FROM (
    SELECT mismatch_classification, COUNT(*)::INT AS mismatch_count
    FROM recent
    WHERE match = FALSE
    GROUP BY mismatch_classification
    ORDER BY mismatch_classification
  ) grouped
)
SELECT
  counts.total,
  counts.matches,
  CASE
    WHEN counts.total = 0 THEN 0::DOUBLE PRECISION
    ELSE counts.matches::DOUBLE PRECISION / counts.total::DOUBLE PRECISION
  END AS match_rate,
  mismatches.by_classification AS mismatches_by_classification,
  counts.last_run_at
FROM counts
CROSS JOIN mismatches;
