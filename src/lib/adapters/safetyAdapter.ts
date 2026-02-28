import { z } from "zod";

import type { FeaturesV1 } from "./truthserumAdapter";

export const SafetyResultSchema = z.object({
  ok: z.boolean(),
  allow_preview: z.boolean(),
  allow_execute: z.boolean(),
  reasons: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  sizing: z
    .object({
      max_contracts: z.number().int().nonnegative(),
      max_risk_usd: z.number().nonnegative(),
    })
    .optional(),
});

export type SafetyResult = z.infer<typeof SafetyResultSchema>;

export type SafetyPolicy = {
  minOpenInterest: number;
  minVolume: number;
  maxSpreadPct: number;
  earningsBlackoutDays: number;
  bankrollUsd: number;
  maxRiskPctPerTrade: number;
  maxContractsCap: number;
};

export const DefaultSafetyPolicy: SafetyPolicy = {
  minOpenInterest: 200,
  minVolume: 50,
  maxSpreadPct: 0.12,
  earningsBlackoutDays: 3,
  bankrollUsd: 10_000,
  maxRiskPctPerTrade: 0.02,
  maxContractsCap: 5,
};

export function evaluateSafety(
  features: FeaturesV1,
  policy: SafetyPolicy = DefaultSafetyPolicy
): SafetyResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const oi = features.open_interest ?? 0;
  const vol = features.volume ?? 0;
  const spreadPct =
    features.spread_pct ??
    (() => {
      const bid = features.bid ?? undefined;
      const ask = features.ask ?? undefined;
      const mid = features.mid;
      if (bid == null || ask == null || mid <= 0) {
        return undefined;
      }
      return (ask - bid) / mid;
    })();

  const ewd = features.earnings_within_days;
  if (ewd != null && ewd <= policy.earningsBlackoutDays) {
    reasons.push("earnings_blackout");
  }

  if (oi < policy.minOpenInterest) {
    reasons.push("low_open_interest");
  }
  if (vol < policy.minVolume) {
    reasons.push("low_volume");
  }

  if (spreadPct != null && spreadPct > policy.maxSpreadPct) {
    reasons.push("spread_too_wide");
  } else if (spreadPct == null) {
    warnings.push("spread_unknown");
  }

  if (features.news_risk === "HIGH") {
    warnings.push("high_news_risk");
  }

  const maxRiskUsd = Math.max(0, policy.bankrollUsd * policy.maxRiskPctPerTrade);
  const costPerContract = Math.max(0, features.mid * 100);
  const maxByRisk = costPerContract > 0 ? Math.floor(maxRiskUsd / costPerContract) : 0;
  const maxContracts = Math.max(0, Math.min(policy.maxContractsCap, maxByRisk));

  const hardBlocked = reasons.length > 0;
  const allow_execute = !hardBlocked && maxContracts >= 1;
  const allow_preview = true;

  return {
    ok: allow_execute,
    allow_preview,
    allow_execute,
    reasons,
    warnings,
    sizing: {
      max_contracts: maxContracts,
      max_risk_usd: maxRiskUsd,
    },
  };
}
