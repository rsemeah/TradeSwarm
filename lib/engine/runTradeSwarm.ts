import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { detectRegime, regimeToContext } from "./regime"
import { simulateRisk, riskToContext } from "./risk"
import { requireAnyRuntimeEnv } from "@/lib/env/server-runtime"
import { deriveSeedFromString, simulateRisk, riskToContext } from "./risk"

const DecisionSchema = z.object({
  ticker: z.string(),
  status: z.enum(["GO", "WAIT", "NO"]),
  trustScore: z.number().min(0).max(100),
  winLikelihoodPct: z.number().min(0).max(100).nullable(),
  recommendedAmount: z.number().nullable(),
  bullets: z.object({
    why: z.string(),
    risk: z.string(),
    amount: z.string(),
  }),
  reasoning: z.string(),
})

const SwarmConsensusSchema = z.object({
  finalDecision: z.enum(["GO", "WAIT", "NO"]),
  confidenceScore: z.number().min(0).max(100),
  consensus: z.string(),
  dissent: z.string().nullable(),
})


function preflightCheck(
  regime: Awaited<ReturnType<typeof detectRegime>>,
  risk: ReturnType<typeof simulateRisk>,
  trustScore: number
): { pass: boolean; reason: string } {
  if (risk.riskLevel === "extreme") {
    return { pass: false, reason: "Risk level too high for current market conditions" }
  }

  if (regime.trend === "bearish" && trustScore < 60) {
    return { pass: false, reason: "Low confidence in bearish market - wait for better setup" }
  }

  if (regime.volatility === "high" && regime.momentum === "weak") {
    return { pass: false, reason: "Choppy market conditions - sitting out" }
  }

  return { pass: true, reason: "Preflight checks passed" }
}


function normalizeStrategy(strategy?: string): "bullish_spread" | "bearish_spread" | "iron_condor" | undefined {
  if (strategy === "bullish_spread" || strategy === "bearish_spread" || strategy === "iron_condor") {
    return strategy
  }
  return undefined
}

export type RunTradeSwarmMode = "analyze" | "preview" | "simulate" | "execute"

interface RunTradeSwarmParams {
  mode: RunTradeSwarmMode
  ticker?: string
  theme?: string
  marketContext?: string
  useSwarm?: boolean
  trade?: {
    ticker: string
    strategy?: string
    amountDollars?: number
  }
  existingProofBundle?: TradeSwarmProofBundle
  userId?: string
}

interface PersistedResult {
  trade: Record<string, unknown>
  receipt: Record<string, unknown>
}

export interface TradeSwarmProofBundle {
  version: "v1"
  mode: RunTradeSwarmMode
  timestamp: string
  stages: Array<{
    stage:
      | "preflight"
      | "market_context_fetch"
      | "regime_snapshot"
      | "risk_snapshot"
      | "deliberation_arbitration"
      | "scoring_snapshot"
      | "receipt_payload_assembly"
      | "optional_persistence"
    data: Record<string, unknown>
  }>
  decision: z.infer<typeof DecisionSchema>
  consensus: z.infer<typeof SwarmConsensusSchema> | null
  modelResults: Array<{
    model: string
    status: "GO" | "WAIT" | "NO"
    trustScore: number
    reasoning: string
  }>
  regime: Awaited<ReturnType<typeof detectRegime>>
  risk: ReturnType<typeof simulateRisk>
  preflight: { pass: boolean; reason: string }
  meta: {
    marketContext: string
    riskContext: string
    modelPlan: string[]
    balance: number
    safetyMode: string
  }
}

async function analyzeWithModel(model: string, ticker: string, theme: string, context: string) {
  const result = await generateText({
    model,
    system: `You are a trading analyst AI. Analyze options trade setups with a focus on risk management.
Be conservative - only recommend GO when conditions are clearly favorable.
For personal paper trading practice.`,
    prompt: `Analyze this potential trade:
Ticker: ${ticker}
Theme/Sector: ${theme}
Market Context: ${context}

Provide status, trust score, win likelihood, recommended amount, WHY/RISK/AMOUNT bullets, and concise reasoning.`,
    output: Output.object({ schema: DecisionSchema }),
  })

  return result.output
}

async function getSwarmConsensus(
  analyses: Array<{ model: string; analysis: z.infer<typeof DecisionSchema> }>
) {
  const analysisText = analyses
    .map(
      (a) =>
        `${a.model}: Status=${a.analysis.status}, Trust=${a.analysis.trustScore}, Reasoning=${a.analysis.reasoning}`
    )
    .join("\n")

  const consensusModel = process.env.AI_GATEWAY_API_KEY
    ? "openai/gpt-4o-mini"
    : "groq/llama-3.3-70b-versatile"

  const result = await generateText({
    model: consensusModel,
    system: "You synthesize multiple AI trading analyses into one conservative final consensus.",
    prompt: `Given these analyses, provide final decision, confidence score, consensus summary, and dissent.\n\n${analysisText}`,
    output: Output.object({ schema: SwarmConsensusSchema }),
  })

  return result.output
}

export async function runTradeSwarm(params: RunTradeSwarmParams): Promise<{
  proofBundle: TradeSwarmProofBundle
  persisted: PersistedResult | null
}> {
  const startedAt = new Date().toISOString()

  if (params.existingProofBundle) {
    const persisted =
      params.mode === "simulate" || params.mode === "execute"
        ? await persistProofBundle(params.mode, params.existingProofBundle, params.userId)
        : null

    return {
      proofBundle: params.existingProofBundle,
      persisted,
    }
  }

  const ticker = params.trade?.ticker || params.ticker
  if (!ticker) {
    throw new Error("Ticker is required")
  }

  let preferences: Record<string, unknown> | null = null
  let portfolioStats: Record<string, unknown> | null = null

  if (params.userId) {
    const supabase = await createClient()
    const result = await Promise.all([
      supabase.from("user_preferences").select("*").eq("user_id", params.userId).single(),
      supabase.from("portfolio_stats").select("*").eq("user_id", params.userId).single(),
    ])
    preferences = result[0].data as Record<string, unknown> | null
    portfolioStats = result[1].data as Record<string, unknown> | null
  }

  const balance = Number(portfolioStats?.balance || 10000)
  const safetyMode = String(preferences?.safety_mode || "training_wheels")
  const estimatedAmount = params.trade?.amountDollars || balance * 0.015
  const useSwarm = params.mode === "preview" ? false : (params.useSwarm ?? true)

  const stages: TradeSwarmProofBundle["stages"] = []

  stages.push({
    stage: "preflight",
    data: {
      ticker,
      requestedMode: params.mode,
      estimatedAmount,
      hasUser: Boolean(params.userId),
    },
  })

  const marketContext = params.marketContext || "Normal market conditions"
  stages.push({
    stage: "market_context_fetch",
    data: { theme: params.theme || "General", marketContext },
  })

  const regime = await detectRegime(ticker)
  stages.push({
    stage: "regime_snapshot",
    data: regime as unknown as Record<string, unknown>,
  })

  const baseTrustScore = 50
  const riskSeed = deriveSeedFromString(requestId)
  const risk = simulateRisk({
    ticker,
    amount: estimatedAmount,
    balance,
    trustScore: baseTrustScore,
    regime,
    seed: riskSeed,
    strategy: normalizeStrategy(params.trade?.strategy),
  })
  stages.push({
    stage: "risk_snapshot",
    data: risk as unknown as Record<string, unknown>,
  })

  const combinedContext = `${marketContext}\n${regimeToContext(regime)}\n${riskToContext(risk)}`

  const hasOpenAI = !!process.env.AI_GATEWAY_API_KEY || !!process.env.OPENAI_API_KEY
  requireAnyRuntimeEnv("runTradeSwarm", ["GROQ_API_KEY", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY"])
  const modelPlan = useSwarm && hasOpenAI
    ? ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini"]
    : ["groq/llama-3.3-70b-versatile"]

  const settled = await Promise.allSettled(
    modelPlan.map(async (model) => ({ model, analysis: await analyzeWithModel(model, ticker, params.theme || "General", combinedContext) }))
  )

  const successfulAnalyses = settled
    .filter((r): r is PromiseFulfilledResult<{ model: string; analysis: z.infer<typeof DecisionSchema> }> => r.status === "fulfilled")
    .map((r) => r.value)

  if (successfulAnalyses.length === 0) {
    throw new Error("All models failed to analyze")
  }

  let consensus: z.infer<typeof SwarmConsensusSchema> | null = null
  let decision = successfulAnalyses[0].analysis

  if (successfulAnalyses.length > 1 && useSwarm) {
    consensus = await getSwarmConsensus(successfulAnalyses)
    const matching = successfulAnalyses.find((a) => a.analysis.status === consensus?.finalDecision)
    decision = matching?.analysis || decision
    decision = { ...decision, ticker, trustScore: consensus.confidenceScore }
  }

  decision = { ...decision, ticker }

  const preflight = preflightCheck(regime, risk, decision.trustScore)

  if (safetyMode === "training_wheels" && decision.recommendedAmount) {
    decision = {
      ...decision,
      recommendedAmount: Math.min(decision.recommendedAmount, balance * 0.015),
    }
  }

  stages.push({
    stage: "deliberation_arbitration",
    data: {
      useSwarm,
      modelPlan,
      modelsCompleted: successfulAnalyses.map((a) => a.model),
      consensus,
    },
  })

  stages.push({
    stage: "scoring_snapshot",
    data: {
      status: decision.status,
      trustScore: decision.trustScore,
      winLikelihoodPct: decision.winLikelihoodPct,
      recommendedAmount: decision.recommendedAmount,
      preflight,
    },
  })

  const proofBundle: TradeSwarmProofBundle = {
    version: "v1",
    mode: params.mode,
    timestamp: startedAt,
    stages,
    decision,
    consensus,
    modelResults: successfulAnalyses.map((r) => ({
      model: r.model,
      status: r.analysis.status,
      trustScore: r.analysis.trustScore,
      reasoning: r.analysis.reasoning,
    })),
    regime,
    risk,
    preflight,
    meta: {
      marketContext,
      riskContext: riskToContext(risk),
      modelPlan,
      balance,
      safetyMode,
    },
  }

  stages.push({
    stage: "receipt_payload_assembly",
    data: {
      version: proofBundle.version,
      mode: proofBundle.mode,
      modelCount: proofBundle.modelResults.length,
    },
  })

  const persisted =
    params.mode === "simulate" || params.mode === "execute"
      ? await persistProofBundle(params.mode, proofBundle, params.userId)
      : null

  stages.push({
    stage: "optional_persistence",
    data: {
      persisted: Boolean(persisted),
      action: params.mode,
    },
  })

  return { proofBundle, persisted }
}

async function persistProofBundle(
  mode: "simulate" | "execute",
  proofBundle: TradeSwarmProofBundle,
  userId?: string
): Promise<PersistedResult | null> {
  if (!userId) {
    return null
  }

  const supabase = await createClient()

  const tradeRecord = {
    user_id: userId,
    ticker: proofBundle.decision.ticker,
    strategy: "options_spread",
    action: mode,
    amount: proofBundle.decision.recommendedAmount || 0,
    trust_score: proofBundle.decision.trustScore,
    status: proofBundle.decision.status,
    is_paper: mode === "simulate" || proofBundle.meta.safetyMode === "training_wheels",
    reasoning: proofBundle.decision.bullets.why,
    ai_consensus: proofBundle,
    regime_data: proofBundle.regime,
    risk_data: proofBundle.risk,
  }

  const { data: insertedTrade, error } = await supabase
    .from("trades")
    .insert(tradeRecord)
    .select()
    .single()

  if (error) {
    throw new Error(mode === "simulate" ? "Failed to record simulation" : "Failed to execute trade")
  }

  const receiptRecord = {
    trade_id: insertedTrade.id,
    user_id: userId,
    ticker: proofBundle.decision.ticker,
    action: mode,
    amount: proofBundle.decision.recommendedAmount,
    trust_score: proofBundle.decision.trustScore,
    ai_consensus: proofBundle,
    regime_snapshot: proofBundle.regime,
    risk_snapshot: proofBundle.risk,
    executed_at: new Date().toISOString(),
  }

  await supabase.from("trade_receipts").insert(receiptRecord)

  const { data: stats } = await supabase
    .from("portfolio_stats")
    .select("*")
    .eq("user_id", userId)
    .single()

  await supabase.from("portfolio_stats").upsert({
    user_id: userId,
    simulations_completed: mode === "simulate" ? (stats?.simulations_completed || 0) + 1 : (stats?.simulations_completed || 0),
    paper_trades_completed: mode === "execute" ? (stats?.paper_trades_completed || 0) + 1 : (stats?.paper_trades_completed || 0),
    total_trades: mode === "execute" ? (stats?.total_trades || 0) + 1 : (stats?.total_trades || 0),
    updated_at: new Date().toISOString(),
  })

  return {
    trade: insertedTrade,
    receipt: receiptRecord,
  }
}
