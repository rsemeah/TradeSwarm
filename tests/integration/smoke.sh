#!/usr/bin/env bash
set -euo pipefail

echo "Checking TruthSerum health..."
curl -sS http://localhost:8787/health | grep -q '"ok":true'

echo "Posting deterministic score..."
curl -sS -X POST http://localhost:8787/v1/score \
  -H "Content-Type: application/json" \
  -d '{
    "features_v1": {
      "symbol":"AAPL",
      "asof_utc":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
      "spot":180,
      "dte":7,
      "strike":180,
      "option_type":"CALL",
      "mid":1.23,
      "open_interest":900,
      "volume":400,
      "spread_pct":0.05
    }
  }' | grep -q '"score"'

echo "OK"
