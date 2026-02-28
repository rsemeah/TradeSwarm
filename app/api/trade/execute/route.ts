import { createClient } from "@/lib/supabase/server"
import { evaluateDegradedMode, recordStageEvent } from "@/lib/engine/events"
import { runTradeSwarm } from "@/lib/engine"

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized", reasonCode: "UNAUTHORIZED", correlationId }, { status: 401 })
    }

    const { trade, aiConsensus, regime, risk, degradedMode } = await req.json()

    if (!trade) {
      return Response.json({ error: "Trade data is required", reasonCode: "MISSING_TRADE", correlationId }, { status: 400 })
    }

    const degradedDecision = evaluateDegradedMode(
      degradedMode?.warnings?.map((warning: string) => warning.replace("Engine degraded: ", "")) ||
        (degradedMode?.reasonCode ? [degradedMode.reasonCode] : [])
    )

    if (degradedDecision.executeBlocked || degradedMode?.executeBlocked) {
      return Response.json(
        {
          success: false,
          error: "Execution blocked due to critical engine stage failure",
          reasonCode: "EXECUTE_BLOCKED_CRITICAL_STAGE",
          correlationId,
          degradedMode: {
            ...degradedDecision,
            policy: { preview: "allowed_with_warnings", execute: "fail_closed" },
          },
        },
        { status: 409 }
      )
    }

    const { data: preferences } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single()
    const {
      trade,
      aiConsensus,
      regime,
      risk,
      marketContext,
      deliberation,
      scoring,
      modelVersions,
      provenance,
      engineTimeline,
      engineVersion,
      schemaVersion,
    } = await req.json()
    const { ticker, theme, marketContext, trade, proofBundle } = await req.json()

    if (!proofBundle && !ticker && !trade?.ticker) {
      return Response.json({ error: "Ticker or proofBundle is required" }, { status: 400 })
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const safetyMode = preferences?.safety_mode || "training_wheels"
    const maxTradesPerDay = safetyMode === "training_wheels" ? 1 : safetyMode === "normal" ? 3 : 10

    const today = new Date().toISOString().split("T")[0]
    const { count: tradesToday } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)

    if ((tradesToday || 0) >= maxTradesPerDay) {
      return Response.json(
        {
          error: `Daily limit reached (${maxTradesPerDay} trades in ${safetyMode} mode)`,
          reasonCode: "DAILY_LIMIT_REACHED",
          correlationId,
        },
        { status: 400 }
      )
    }

    const tradeRecord = {
      user_id: user.id,
      ticker: trade.ticker,
      strategy: trade.strategy || "options_spread",
      action: "execute",
      amount: trade.amountDollars || 0,
      trust_score: trade.trustScore,
      status: trade.status,
      is_paper: safetyMode === "training_wheels",
      reasoning: trade.bullets?.why || "",
      ai_consensus: aiConsensus || null,
      regime_data: regime || null,
      risk_data: risk || null,
    }

    const { data: insertedTrade, error: insertError } = await supabase.from("trades").insert(tradeRecord).select().single()

    if (insertError) {
      console.error("Trade execute error:", insertError)
      return Response.json({ error: "Failed to execute trade", reasonCode: "TRADE_INSERT_FAILED", correlationId }, { status: 500 })
    }

    const receiptWriteStart = Date.now()
    // Create receipt
    const executedAt = new Date().toISOString()
    const receiptRecord = {
      trade_id: insertedTrade.id,
      user_id: user.id,
      ticker: trade.ticker,
      action: "execute",
      amount: trade.amountDollars,
      trust_score: trade.trustScore,
      executed_at: executedAt,
      schema_version: schemaVersion ?? 2,
      engine_version: engineVersion ?? "v2-canonical",
      market_context: marketContext ?? {
        ticker: trade.ticker,
        action: "execute",
        amount: trade.amountDollars,
        status: trade.status,
        strategy: trade.strategy || "options_spread",
      },
      regime: regime ?? null,
      risk: risk ?? null,
      deliberation: deliberation ?? {
        ai_consensus: aiConsensus ?? null,
      },
      scoring: scoring ?? {
        trust_score: trade.trustScore ?? null,
      },
      model_versions: modelVersions ?? {
        engine: engineVersion ?? "v2-canonical",
      },
      provenance: provenance ?? {
        route: "/api/trade/execute",
        source: "trade-execute-api",
      },
      engine_timeline: engineTimeline ?? {
        executed_at: executedAt,
        created_at: executedAt,
      },
      ai_consensus: aiConsensus,
      regime_snapshot: regime,
      risk_snapshot: risk,
      scoring: trade.scoring || null,
      executed_at: new Date().toISOString(),
    }

    const { error: receiptError } = await supabase.from("trade_receipts").insert(receiptRecord)

    await recordStageEvent(supabase, {
      stage: "RECEIPT_WRITTEN",
      status: receiptError ? "failed" : "success",
      correlationId,
      userId: user.id,
      ticker: trade.ticker,
      durationMs: Date.now() - receiptWriteStart,
      reasonCode: receiptError ? "RECEIPT_WRITE_FAILED" : undefined,
    })

    const { data: stats } = await supabase.from("portfolio_stats").select("*").eq("user_id", user.id).single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      paper_trades_completed: (stats?.paper_trades_completed || 0) + 1,
      total_trades: (stats?.total_trades || 0) + 1,
      updated_at: new Date().toISOString(),
    const { proofBundle: canonicalProofBundle, persisted } = await runTradeSwarm({
      mode: "execute",
      ticker: ticker || trade?.ticker,
      theme,
      marketContext,
      trade,
      existingProofBundle: proofBundle,
      userId: user.id,
    })

    return Response.json({
      success: true,
      reasonCode: receiptError ? "RECEIPT_WRITE_FAILED" : null,
      correlationId,
      trade: insertedTrade,
      receipt: receiptRecord,
      degradedMode: {
        ...degradedDecision,
        policy: { preview: "allowed_with_warnings", execute: "allowed" },
      },
      message: `Executed: ${trade.ticker} for $${trade.amountDollars}`,
      trade: persisted?.trade,
      receipt: persisted?.receipt,
      message: `Executed: ${canonicalProofBundle.decision.ticker} for $${canonicalProofBundle.decision.recommendedAmount ?? 0}`,
      proofBundle: canonicalProofBundle,
    })
  } catch (error) {
    console.error("Execute error:", error)
    return Response.json({ error: String(error), reasonCode: "EXECUTE_FAILED", correlationId }, { status: 500 })
  }
}
