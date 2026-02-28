import crypto from "crypto";
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "truthserum-stub",
    model: { name: "deterministic-stub", version: "0.1.0" },
    time_utc: new Date().toISOString(),
  });
});

app.post("/v1/score", (req, res) => {
  const features = req.body?.features_v1;
  if (!features || !features.symbol || !features.asof_utc) {
    return res.status(400).json({
      ok: false,
      score: 0,
      reasons: ["missing_features_v1"],
      warnings: [],
    });
  }

  const oi = Number(features.open_interest ?? 0);
  const vol = Number(features.volume ?? 0);
  const spread = features.spread_pct != null ? Number(features.spread_pct) : null;
  const earningsWithinDays =
    features.earnings_within_days != null ? Number(features.earnings_within_days) : null;

  let score = 0.5;
  const reasons = [];
  const warnings = [];

  if (oi >= 500) {
    score += 0.15;
  } else if (oi < 200) {
    score -= 0.15;
  }

  if (vol >= 200) {
    score += 0.1;
  } else if (vol < 50) {
    score -= 0.1;
  }

  if (spread != null) {
    if (spread <= 0.06) {
      score += 0.1;
    }
    if (spread > 0.12) {
      score -= 0.2;
    }
  } else {
    warnings.push("spread_unknown");
  }

  if (earningsWithinDays != null && earningsWithinDays <= 3) {
    score -= 0.25;
    reasons.push("earnings_blackout");
  }

  if (features.news_risk === "HIGH") {
    score -= 0.1;
  }

  score = Math.max(0, Math.min(1, score));

  const determinismHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(features))
    .digest("hex");

  return res.json({
    ok: score >= 0.55,
    score,
    reasons,
    warnings,
    model: { name: "deterministic-stub", version: "0.1.0" },
    determinism_hash: determinismHash,
  });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`truthserum-stub on :${port}`);
});
