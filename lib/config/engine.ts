export const ENGINE_INTEGRATION = {
  mode: "services+adapters",
  truthSerum: {
    failClosedOnExecute: true,
    allowPreviewDegraded: true,
    timeoutMs: Number(process.env.TRUTH_SERUM_TIMEOUT_MS ?? 500),
  },
  robEngine: {
    featureFlag: process.env.FEATURE_ROB_ENGINE === "1",
    primaryFallback: "local_regime_v1",
  },
} as const

export const SAFETY_THRESHOLDS = {
  maxSpreadPct: Number(process.env.SAFETY_MAX_SPREAD_PCT ?? 1.0),
  minUnderlyingVolume24h: Number(process.env.SAFETY_MIN_UNDERLYING_VOLUME_24H ?? 100_000),
  minOptionVolume24h: Number(process.env.SAFETY_MIN_OPTION_VOLUME_24H ?? 100),
  minOptionOpenInterest: Number(process.env.SAFETY_MIN_OPTION_OI ?? 200),
  maxSizeCapPctOfBankroll: Number(process.env.SAFETY_MAX_SIZE_CAP_PCT ?? 5),
  maxNotionalPerTradeUsd: Number(process.env.SAFETY_MAX_NOTIONAL_USD ?? 25_000),
  earningsBlackoutDaysBefore: Number(process.env.SAFETY_EARNINGS_BLACKOUT_BEFORE_DAYS ?? 2),
  earningsBlackoutDaysAfter: Number(process.env.SAFETY_EARNINGS_BLACKOUT_AFTER_DAYS ?? 1),
  maxEstimatedSlippagePct: Number(process.env.SAFETY_MAX_SLIPPAGE_PCT ?? 0.5),
} as const
