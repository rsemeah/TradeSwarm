import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { HalalGate, GateEvidence } from "@/lib/halal/types"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { screen_id, ticker, strategy_type, notional_amount } = await req.json()
    
    if (!ticker || !strategy_type) {
      return NextResponse.json({ error: "Ticker and strategy_type required" }, { status: 400 })
    }
    
    // Get user's current positions for exposure calculation
    const { data: positions } = await supabase
      .from('trades')
      .select('ticker, current_value')
      .eq('user_id', user.id)
      .eq('outcome', 'open')
    
    // Get user's sharia profile for limits
    const { data: profile } = await supabase
      .from('sharia_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    // Calculate current exposure to this ticker
    const currentExposure = positions
      ?.filter(p => p.ticker === ticker.toUpperCase())
      .reduce((sum, p) => sum + (p.current_value || 0), 0) || 0
    
    // Max exposure per position (default 10% of portfolio)
    const maxExposure = 10000 // Would be dynamic based on portfolio size
    
    // H5: Position Limit Gate
    const h5_pass = (currentExposure + (notional_amount || 0)) <= maxExposure
    const h5_evidence: GateEvidence = {
      source: 'portfolio_calculator',
      value: { 
        current_exposure: currentExposure, 
        proposed_addition: notional_amount || 0,
        total_after: currentExposure + (notional_amount || 0),
        max_exposure: maxExposure 
      },
      timestamp: new Date().toISOString(),
      truth_status: 'VERIFIED'
    }
    
    // H6: Timing Gate (gharar check for 0DTE)
    const is0DTE = strategy_type.includes('0DTE') || strategy_type.includes('0dte')
    const now = new Date()
    const hour = now.getUTCHours() - 5 // EST
    const isMarketHours = hour >= 9.5 && hour < 16 // 9:30 AM - 4:00 PM EST
    const dayOfWeek = now.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    
    // 0DTE requires market hours to avoid overnight gharar (uncertainty)
    const h6_pass = !is0DTE || (isMarketHours && isWeekday)
    const h6_evidence: GateEvidence = {
      source: 'timing_validator',
      value: { 
        is_0dte: is0DTE, 
        is_market_hours: isMarketHours,
        is_weekday: isWeekday,
        current_hour_est: hour,
        reason: is0DTE && !isMarketHours ? 'Cannot enter 0DTE outside market hours (gharar)' : 'Timing acceptable'
      },
      timestamp: new Date().toISOString(),
      truth_status: 'VERIFIED'
    }
    
    // H7: Intent Confirmation (starts as false, user must confirm)
    const h7_pass = false // Will be updated when user confirms
    
    // Overall pass requires H5 and H6 (H7 comes later)
    const gatesReady = h5_pass && h6_pass
    
    const gate: Partial<HalalGate> = {
      user_id: user.id,
      screen_id,
      ticker: ticker.toUpperCase(),
      strategy_type,
      h5_current_exposure: currentExposure,
      h5_max_exposure: maxExposure,
      h5_pass,
      h5_evidence,
      h6_is_0dte: is0DTE,
      h6_market_hours: isMarketHours,
      h6_pass,
      h6_evidence,
      h7_user_confirmed: false,
      h7_pass,
      overall_pass: false, // Will be true only after H7 confirmation
    }
    
    // Save to database
    const { data: savedGate, error } = await supabase
      .from('halal_gates')
      .insert(gate)
      .select()
      .single()
    
    if (error) {
      console.error("Error saving halal gate:", error)
      return NextResponse.json({ 
        gate: { ...gate, id: 'temp-' + Date.now() }, 
        gates_ready: gatesReady 
      })
    }
    
    return NextResponse.json({ 
      gate: savedGate, 
      gates_ready: gatesReady,
      message: gatesReady 
        ? 'H5-H6 passed. Awaiting intent confirmation (H7).' 
        : `Gate check failed: ${!h5_pass ? 'Position limit exceeded (H5)' : 'Timing restriction (H6)'}`
    })
    
  } catch (error) {
    console.error("Halal gate error:", error)
    return NextResponse.json({ error: "Failed to run gate check" }, { status: 500 })
  }
}

// Confirm intent (H7)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { gate_id, understood_risks, accepted_purification, intent_statement } = await req.json()
    
    if (!gate_id) {
      return NextResponse.json({ error: "Gate ID required" }, { status: 400 })
    }
    
    // Verify gate belongs to user and H5-H6 passed
    const { data: gate } = await supabase
      .from('halal_gates')
      .select('*')
      .eq('id', gate_id)
      .eq('user_id', user.id)
      .single()
    
    if (!gate) {
      return NextResponse.json({ error: "Gate not found" }, { status: 404 })
    }
    
    if (!gate.h5_pass || !gate.h6_pass) {
      return NextResponse.json({ error: "H5-H6 must pass before confirmation" }, { status: 400 })
    }
    
    // Update H7 confirmation
    const { data: updatedGate, error } = await supabase
      .from('halal_gates')
      .update({
        h7_user_confirmed: true,
        h7_confirmation_ts: new Date().toISOString(),
        h7_pass: true,
        overall_pass: true
      })
      .eq('id', gate_id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating gate:", error)
      return NextResponse.json({ error: "Failed to confirm" }, { status: 500 })
    }
    
    // Create intent record
    const { data: intent } = await supabase
      .from('halal_intents')
      .insert({
        user_id: user.id,
        gate_id,
        ticker: gate.ticker,
        strategy_type: gate.strategy_type,
        direction: 'LONG', // Could be passed in
        notional_amount: gate.h5_current_exposure,
        understood_risks: understood_risks || false,
        accepted_purification: accepted_purification || false,
        intent_statement,
        status: 'CONFIRMED',
        confirmed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
      })
      .select()
      .single()
    
    return NextResponse.json({ 
      gate: updatedGate, 
      intent,
      message: 'All gates passed (H1-H7). Ready for execution.' 
    })
    
  } catch (error) {
    console.error("Confirm gate error:", error)
    return NextResponse.json({ error: "Failed to confirm intent" }, { status: 500 })
  }
}
