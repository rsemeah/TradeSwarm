export type RawTradeRow = Record<string, unknown>

export type TradeRow = {
  id: string
  created_at: string
  strategy_id?: string
  confidence?: number
  regime?: string
  realized_pnl: number
  max_risk?: number
  r_multiple?: number
  mode?: "paper" | "live"
  kelly_fraction?: number
  fees?: number
  slippage?: number
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function pickFirst(obj: RawTradeRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) return obj[key]
  }
  return undefined
}

function normalizeMode(value: unknown): "paper" | "live" | undefined {
  if (typeof value !== "string") return undefined
  const v = value.toLowerCase()
  if (["paper", "simulated", "simulate", "watch"].includes(v)) return "paper"
  if (["live", "executed", "execute"].includes(v)) return "live"
  return undefined
}

export function adaptTradeRow(raw: RawTradeRow): TradeRow {
  const realizedPnl = asNumber(pickFirst(raw, ["realized_pnl", "pnl", "profit"])) ?? 0
  const maxRisk = asNumber(pickFirst(raw, ["max_risk", "risk", "max_risk_usd"]))
  const explicitR = asNumber(pickFirst(raw, ["r_multiple", "R_multiple"]))

  const confidenceRaw = asNumber(
    pickFirst(raw, ["confidence", "score", "confidence_score", "engine_score_at_entry", "trust_score", "win_likelihood"]),
  )
  const confidence =
    confidenceRaw === undefined ? undefined : confidenceRaw > 1 ? Math.max(0, Math.min(1, confidenceRaw / 100)) : Math.max(0, Math.min(1, confidenceRaw))

  return {
    id: String(pickFirst(raw, ["id"]) ?? crypto.randomUUID()),
    created_at: String(pickFirst(raw, ["created_at", "entry_date"]) ?? new Date().toISOString()),
    strategy_id: (pickFirst(raw, ["strategy_id", "strategy_type", "strategy"]) as string | undefined) ?? undefined,
    confidence,
    regime: (pickFirst(raw, ["regime", "regime_label", "regime_at_entry", "theme"]) as string | undefined) ?? undefined,
    realized_pnl: realizedPnl,
    max_risk: maxRisk,
    r_multiple: explicitR,
    mode:
      normalizeMode(pickFirst(raw, ["mode", "execution_mode", "status", "action"])) ??
      (String(pickFirst(raw, ["table_source"]) ?? "").includes("v2") ? "live" : undefined),
    kelly_fraction: asNumber(pickFirst(raw, ["kelly_fraction", "size_fraction"])),
    fees: asNumber(pickFirst(raw, ["fees", "fee", "commission"])),
    slippage: asNumber(pickFirst(raw, ["slippage", "slippage_cost"])),
  }
}

export function inferUnknowns(rows: TradeRow[]): string[] {
  const unknowns: string[] = []
  if (!rows.some((r) => r.confidence !== undefined)) unknowns.push("confidence_buckets")
  if (!rows.some((r) => r.regime)) unknowns.push("regime_breakdown")
  if (!rows.some((r) => r.kelly_fraction !== undefined)) unknowns.push("kelly_oversize_during_drawdown")
  if (!rows.some((r) => r.fees !== undefined || r.slippage !== undefined)) unknowns.push("slippage_fees_adjustment")
  if (!rows.some((r) => r.max_risk !== undefined || r.r_multiple !== undefined)) unknowns.push("R_multiple_basis")
  return unknowns
}
