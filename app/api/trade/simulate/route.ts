import { createClient } from "@/lib/supabase/server"
import { runTradeSwarm } from "@/lib/engine"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Simulations always allowed (no daily limit)
    // Record the simulated trade
    const tradeRecord = {
      user_id: user.id,
      ticker: trade.ticker,
      strategy: trade.strategy || "options_spread",
      action: "simulate",
      amount: trade.amountDollars || 0,
      trust_score: trade.trustScore,
      status: trade.status,
      is_paper: true, // Simulations are always paper
      reasoning: trade.bullets?.why || "",
      ai_consensus: aiConsensus || null,
      regime_data: regime || null,
      risk_data: risk || null,
    }

    const { data: insertedTrade, error: insertError } = await supabase
      .from("trades")
      .insert(tradeRecord)
      .select()
      .single()

    if (insertError) {
      console.error("Trade simulate error:", insertError)
      return Response.json({ error: "Failed to record simulation" }, { status: 500 })
    }

    // Create simulation receipt
    const executedAt = new Date().toISOString()
    const receiptRecord = {
      trade_id: insertedTrade.id,
      user_id: user.id,
      ticker: trade.ticker,
      action: "simulate",
      amount: trade.amountDollars,
      trust_score: trade.trustScore,
      executed_at: executedAt,
      schema_version: schemaVersion ?? 2,
      engine_version: engineVersion ?? "v2-canonical",
      market_context: marketContext ?? {
        ticker: trade.ticker,
        action: "simulate",
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
        route: "/api/trade/simulate",
        source: "trade-simulate-api",
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

    await supabase.from("trade_receipts").insert(receiptRecord)

    // Simulations don't count toward real trade limits but track them
    const { data: stats } = await supabase
      .from("portfolio_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    await supabase.from("portfolio_stats").upsert({
      user_id: user.id,
      simulations_completed: (stats?.simulations_completed || 0) + 1,
      updated_at: new Date().toISOString(),
    const { proofBundle: canonicalProofBundle, persisted } = await runTradeSwarm({
      mode: "simulate",
      ticker: ticker || trade?.ticker,
      theme,
      marketContext,
      trade,
      existingProofBundle: proofBundle,
      userId: user.id,
    })

    return Response.json({
      success: true,
      trade: persisted?.trade,
      receipt: persisted?.receipt,
      message: `Simulated: ${canonicalProofBundle.decision.ticker} for $${canonicalProofBundle.decision.recommendedAmount ?? 0}`,
      isSimulation: true,
      proofBundle: canonicalProofBundle,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
