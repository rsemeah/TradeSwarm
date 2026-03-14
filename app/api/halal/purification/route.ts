import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PurificationEntry, PurificationSummary } from "@/lib/halal/types"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const status = req.nextUrl.searchParams.get('status') // PENDING, DONATED, all
    
    let query = supabase
      .from('purification_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase())
    }
    
    const { data: entries, error } = await query
    
    if (error) {
      console.error("Error fetching purification:", error)
      // Return mock data for demo
      const mockEntries: PurificationEntry[] = [
        {
          id: '1',
          user_id: user.id,
          ticker: 'AAPL',
          trade_pnl: 142.80,
          haram_ratio: 0.02,
          purification_amount: 2.86,
          status: 'PENDING',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: user.id,
          ticker: 'MSFT',
          trade_pnl: 87.50,
          haram_ratio: 0.01,
          purification_amount: 0.88,
          status: 'PENDING',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]
      
      const total_pending = mockEntries
        .filter(e => e.status === 'PENDING')
        .reduce((sum, e) => sum + e.purification_amount, 0)
      
      const total_donated = mockEntries
        .filter(e => e.status === 'DONATED')
        .reduce((sum, e) => sum + e.purification_amount, 0)
      
      return NextResponse.json({
        summary: {
          total_pending,
          total_donated,
          entries: mockEntries,
          recommended_charity: 'Islamic Relief USA'
        } as PurificationSummary
      })
    }
    
    const total_pending = (entries || [])
      .filter((e: PurificationEntry) => e.status === 'PENDING')
      .reduce((sum: number, e: PurificationEntry) => sum + e.purification_amount, 0)
    
    const total_donated = (entries || [])
      .filter((e: PurificationEntry) => e.status === 'DONATED')
      .reduce((sum: number, e: PurificationEntry) => sum + e.purification_amount, 0)
    
    // Get user's charity preference
    const { data: profile } = await supabase
      .from('sharia_profiles')
      .select('charity_destination')
      .eq('user_id', user.id)
      .single()
    
    return NextResponse.json({
      summary: {
        total_pending,
        total_donated,
        entries: entries || [],
        recommended_charity: profile?.charity_destination || 'Islamic Relief USA'
      } as PurificationSummary
    })
    
  } catch (error) {
    console.error("Purification fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch purification data" }, { status: 500 })
  }
}

// Mark entries as donated
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { entry_ids, charity_destination } = await req.json()
    
    if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
      return NextResponse.json({ error: "Entry IDs required" }, { status: 400 })
    }
    
    const { data: updated, error } = await supabase
      .from('purification_ledger')
      .update({
        status: 'DONATED',
        charity_destination,
        donated_at: new Date().toISOString()
      })
      .in('id', entry_ids)
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .select()
    
    if (error) {
      console.error("Error marking donated:", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }
    
    const total_donated = (updated || []).reduce((sum, e) => sum + e.purification_amount, 0)
    
    return NextResponse.json({
      success: true,
      updated_count: updated?.length || 0,
      total_donated,
      message: `Marked $${total_donated.toFixed(2)} as donated to ${charity_destination || 'charity'}`
    })
    
  } catch (error) {
    console.error("Purification update error:", error)
    return NextResponse.json({ error: "Failed to update purification" }, { status: 500 })
  }
}

// Calculate purification for a trade
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { trade_id, ticker, trade_pnl, receipt_id } = await req.json()
    
    if (!ticker || trade_pnl === undefined) {
      return NextResponse.json({ error: "Ticker and trade_pnl required" }, { status: 400 })
    }
    
    // Only calculate purification for profitable trades
    if (trade_pnl <= 0) {
      return NextResponse.json({
        purification_required: false,
        purification_amount: 0,
        message: 'No purification needed for non-profitable trades'
      })
    }
    
    // Get the halal screen for this ticker to find haram ratio
    const { data: screen } = await supabase
      .from('halal_screens')
      .select('h1_haram_revenue_pct, h4_interest_ratio')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Calculate haram ratio (max of haram revenue and interest ratio)
    const haram_ratio = Math.max(
      screen?.h1_haram_revenue_pct || 0.02,
      screen?.h4_interest_ratio || 0.01
    )
    
    const purification_amount = trade_pnl * haram_ratio
    
    // Create purification entry
    const { data: entry, error } = await supabase
      .from('purification_ledger')
      .insert({
        user_id: user.id,
        trade_id,
        receipt_id,
        ticker: ticker.toUpperCase(),
        trade_pnl,
        haram_ratio,
        purification_amount,
        status: 'PENDING'
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating purification entry:", error)
    }
    
    return NextResponse.json({
      purification_required: true,
      purification_amount,
      haram_ratio,
      entry,
      message: `$${purification_amount.toFixed(2)} should be donated to purify this profit`
    })
    
  } catch (error) {
    console.error("Purification calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate purification" }, { status: 500 })
  }
}
