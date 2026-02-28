import { createClient } from "@/lib/supabase/server"
import { isValidProofSnapshot } from "@/lib/journal/proofSnapshot"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await req.json()
    const {
      ticker,
      strategy_type,
      strikes,
      credit_received,
      max_risk,
      engine_score_at_entry,
      regime_at_entry,
      proof_snapshot,
    } = payload

    if (!ticker || !strategy_type || !strikes || !proof_snapshot) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidProofSnapshot(proof_snapshot)) {
      return Response.json({ error: "Invalid proof_snapshot schema" }, { status: 400 })
    }

    // Assumption: expiration date is encoded in strikes payload since it is strategy-leg specific.
    const expirationSource = strikes.expiration_date ?? strikes.expiration ?? strikes.expiry
    if (!expirationSource) {
      return Response.json({ error: "strikes.expiration_date is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("trades_v2")
      .insert({
        user_id: user.id,
        ticker,
        strategy_type,
        entry_date: new Date().toISOString(),
        expiration_date: expirationSource,
        strikes,
        credit_received,
        max_risk,
        engine_score_at_entry,
        regime_at_entry,
        proof_snapshot,
        outcome: "open",
      })
      .select("id")
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ trade_id: data.id })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
