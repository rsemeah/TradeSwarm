/**
 * AI Deliberation Module
 *
 * Flow:
 *   Round 1 — all available providers analyze in parallel
 *   Arbitration — triggered when models disagree (consensusStrength < 1.0)
 *                 Arbitrator synthesizes and casts deciding vote (conservative bias)
 *
 * On total failure: throws so the orchestrator can fail-closed.
 */

import { generateText, Output } from "ai"
import { z } from "zod"
import type {
  ModelOutput,
  DeliberationRound,
  TradeDecision,
  MarketContext,
  ProofRegimeSnapshot,
  ProofRiskSnapshot,
} from "@/lib/types/proof"

// ─── Zod schema for model output ──────────────────────────────────────────────

const VerdictSchema = z.object({
  decision: z.enum(["GO", "WAIT", "NO"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  winLikelihoodPct: z.number().min(0).max(100).nullable(),
  recommendedAmount: z.number().nullable(),
  bullets: z.object({
    why: z.string(),
    risk: z.string(),
    amount: z.string(),
  }),
})

type VerdictOutput = z.infer<typeof VerdictSchema>

// ─── Prompt builders ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  regime: ProofRegimeSnapshot,
  risk: ProofRiskSnapshot,
  balance: number,
  safetyMode: string
): string {
  return `You are a trading analyst AI for TradeSwarm (paper trading practice app).
Balance: $${balance}
Safety mode: ${safetyMode}${safetyMode === "training_wheels" ? " — conservative, max 1.5% position" : ""}

Market Regime: ${regime.trend} trend, ${regime.volatility} volatility, ${regime.momentum} momentum.
Regime confidence: ${(regime.confidence * 100).toFixed(0)}%

Risk level: ${risk.riskLevel}. Max loss estimate: $${Math.abs(risk.pct10).toFixed(0)}. Expected return: $${risk.expectedReturn.toFixed(0)}.

Be honest and conservative. Only GO when conditions are clearly favorable.
Return confidence scores that reflect actual certainty — never inflate.`.trim()
}

function buildUserPrompt(ctx: MarketContext, balance: number): string {
  const q = ctx.quote
  const ch = ctx.chain
  return `Analyze this options trade setup:

Ticker: ${ctx.ticker}
Theme: ${ctx.theme || "General"}
Context: ${ctx.userContext || "Standard conditions"}

${
  q
    ? `Quote: $${q.price} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent}%)
Volume: ${(q.volume / 1_000).toFixed(0)}K vs avg ${(q.avgVolume / 1_000).toFixed(0)}K
SMA50: $${q.sma50} | SMA200: $${q.sma200}`
    : "Quote: unavailable"
}
${
  ch
    ? `Options: P/C ratio ${ch.putCallRatio ?? "N/A"}, nearest expirations: ${ch.expirations.slice(0, 3).join(", ")}`
    : "Options chain: unavailable"
}

Balance: $${balance}

Provide: decision (GO/WAIT/NO), confidence (0-100), win likelihood, recommended amount, and clear bullets.`.trim()
}

// ─── Single model call ─────────────────────────────────────────────────────────

async function callModel(params: {
  model: string
  system: string
  prompt: string
}): Promise<{ output: VerdictOutput | null; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const result = await generateText({
      model: params.model,
      system: params.system,
      prompt: params.prompt,
      output: Output.object({ schema: VerdictSchema }),
    })
    return { output: result.output, latencyMs: Date.now() - start }
  } catch (err) {
    return { output: null, latencyMs: Date.now() - start, error: String(err) }
  }
}

// ─── Plurality vote ───────────────────────────────────────────────────────────

function pluralityVote(
  outputs: ModelOutput[]
): { decision: TradeDecision; strength: number } {
  const counts: Partial<Record<TradeDecision, number>> = {}
  for (const o of outputs) {
    counts[o.decision] = (counts[o.decision] ?? 0) + 1
  }
  const [topDecision, topCount] = Object.entries(counts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0] as [TradeDecision, number]

  return { decision: topDecision, strength: topCount / outputs.length }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function runDeliberation(params: {
  marketContext: MarketContext
  regime: ProofRegimeSnapshot
  risk: ProofRiskSnapshot
  balance: number
  safetyMode: string
}): Promise<{
  rounds: DeliberationRound[]
  warnings: string[]
  primaryBullets?: { why: string; risk: string; amount: string }
  primaryRecommendedAmount?: number | null
}> {
  const { marketContext, regime, risk, balance, safetyMode } = params
  const warnings: string[] = []
  const ts = new Date().toISOString()

  const system = buildSystemPrompt(regime, risk, balance, safetyMode)
  const prompt = buildUserPrompt(marketContext, balance)

  // Determine models
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY)
  const modelDefs: { model: string; provider: string; version: string }[] = [
    { model: "groq/llama-3.3-70b-versatile", provider: "groq", version: "llama-3.3-70b" },
    ...(hasOpenAI
      ? [{ model: "openai/gpt-4o-mini", provider: "openai", version: "gpt-4o-mini" }]
      : []),
  ]

  // ── Round 1 ────────────────────────────────────────────────────────────────
  const r1Start = Date.now()
  const r1Raw = await Promise.all(
    modelDefs.map(async ({ model, provider, version }) => {
      const res = await callModel({ model, system, prompt })
      return { provider, version, res }
    })
  )

  const round1Outputs: ModelOutput[] = []
  for (const { provider, version, res } of r1Raw) {
    if (res.output) {
      round1Outputs.push({
        provider,
        modelVersion: version,
        decision: res.output.decision,
        confidence: res.output.confidence,
        reasoning: res.output.reasoning,
        winLikelihoodPct: res.output.winLikelihoodPct,
        recommendedAmount: res.output.recommendedAmount,
        bullets: res.output.bullets,
        latencyMs: res.latencyMs,
        ts: new Date().toISOString(),
      })
    } else {
      warnings.push(`${provider} failed: ${res.error}`)
    }
  }

  if (round1Outputs.length === 0) {
    throw new Error("All AI models failed in Round 1 — cannot deliberate")
  }

  const { decision: r1Decision, strength: r1Strength } = pluralityVote(round1Outputs)
  const round1: DeliberationRound = {
    roundId: 1,
    stage: "ROUND1",
    outputs: round1Outputs,
    outcome: {
      decision: r1Decision,
      reason: `${round1Outputs.length} model(s) voted; plurality: ${r1Decision}`,
      consensusStrength: Math.round(r1Strength * 100) / 100,
    },
    ts,
  }

  const rounds: DeliberationRound[] = [round1]
  let finalDecision: TradeDecision = r1Decision
  let primaryOutput = round1Outputs.find((o) => o.decision === r1Decision) ?? round1Outputs[0]

  // ── Arbitration (when split) ───────────────────────────────────────────────
  if (round1Outputs.length > 1 && r1Strength < 1.0) {
    const analysisBlock = round1Outputs
      .map((o) => `${o.provider}: ${o.decision} (confidence ${o.confidence}) — ${o.reasoning}`)
      .join("\n")

    const arbModel = hasOpenAI ? "openai/gpt-4o-mini" : "groq/llama-3.3-70b-versatile"
    const arbVersion = hasOpenAI ? "gpt-4o-mini" : "llama-3.3-70b"

    const arbResult = await callModel({
      model: arbModel,
      system:
        "You are an arbitrator synthesizing trading AI analyses. Conservative bias: prefer WAIT over GO on genuine disagreement.",
      prompt: `Synthesize these analyses into a final verdict:\n\n${analysisBlock}\n\nRegime: ${regime.trend} ${regime.volatility} ${regime.momentum}\nRisk level: ${risk.riskLevel}\n\nProvide the final decision. Confidence should reflect actual certainty.`,
    })

    if (arbResult.output) {
      const arbOutput: ModelOutput = {
        provider: "arbitrator",
        modelVersion: arbVersion,
        decision: arbResult.output.decision,
        confidence: arbResult.output.confidence,
        reasoning: arbResult.output.reasoning,
        winLikelihoodPct: arbResult.output.winLikelihoodPct,
        recommendedAmount: arbResult.output.recommendedAmount,
        bullets: arbResult.output.bullets,
        latencyMs: arbResult.latencyMs,
        ts: new Date().toISOString(),
      }

      rounds.push({
        roundId: 2,
        stage: "ARBITRATION",
        outputs: [arbOutput],
        outcome: {
          decision: arbResult.output.decision,
          reason: `Arbitration resolved ${r1Strength < 0.6 ? "split" : "majority"} vote`,
          consensusStrength: Math.round((arbResult.output.confidence / 100) * 100) / 100,
        },
        ts: new Date().toISOString(),
      })

      finalDecision = arbResult.output.decision
      primaryOutput = arbOutput
    } else {
      warnings.push(`Arbitration failed (${arbResult.error}), using Round 1 plurality`)
    }
  }

  return {
    rounds,
    warnings,
    primaryBullets: primaryOutput.bullets,
    primaryRecommendedAmount: primaryOutput.recommendedAmount,
  }
}
