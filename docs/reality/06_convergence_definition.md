# Convergence Definition (Measurement Spine)

## 1) Replay match-rate threshold
Convergence is defined as **100% match rate across 50 consecutive replays** (`match_rate = 1.0`, window=50).
A deployment is considered failed/non-converged if match rate drops below **95%** in the evaluation window.

## 2) Expectancy range target
Target expectancy range (placeholder): **0.15R–0.40R per trade**.
Status: **TBD** until expectancy tracking is wired into this measurement spine.

## 3) Edge rejection rate targets
Initial operating targets:
- Too strict signal: rejection rate consistently **>70%**.
- Too loose signal: rejection rate consistently **<20%**.
- Healthy initial band: **20%–70%** rejection rate (subject to calibration).

Status: **TBD calibration-backed thresholds** after sufficient replay and paper-trade data.

## 4) Minimum paper-trade sample size before considering live
Minimum baseline: **200 logged paper trades** before considering live deployment.
This value is adjustable through governance once convergence and expectancy remain stable.
