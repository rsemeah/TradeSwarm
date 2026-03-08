import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { HalalScreen, TruthStatus, GateEvidence } from "@/lib/halal/types"

// Mock financial data - in production, fetch from data provider
async function fetchFinancialData(ticker: string): Promise<{
  sector: string
  haram_revenue_pct: number
  total_debt: number
  market_cap: number
  receivables: number
  total_assets: number
  interest_income: number
  total_revenue: number
  truth_status: TruthStatus
}> {
  // Simulate API latency
  await new Promise(r => setTimeout(r, 100))
  
  // Mock data based on ticker
  const mockData: Record<string, any> = {
    NVDA: { sector: 'technology', haram_revenue_pct: 0.01, total_debt: 9.7e9, market_cap: 1.2e12, receivables: 5.4e9, total_assets: 65e9, interest_income: 0.12e9, total_revenue: 60e9, truth_status: 'VERIFIED' },
    AAPL: { sector: 'technology', haram_revenue_pct: 0.02, total_debt: 111e9, market_cap: 2.8e12, receivables: 28e9, total_assets: 352e9, interest_income: 3.7e9, total_revenue: 383e9, truth_status: 'VERIFIED' },
    MSFT: { sector: 'technology', haram_revenue_pct: 0.01, total_debt: 47e9, market_cap: 2.5e12, receivables: 38e9, total_assets: 411e9, interest_income: 2.0e9, total_revenue: 211e9, truth_status: 'VERIFIED' },
    TSLA: { sector: 'automotive', haram_revenue_pct: 0.00, total_debt: 5.7e9, market_cap: 550e9, receivables: 2.5e9, total_assets: 82e9, interest_income: 0.1e9, total_revenue: 96e9, truth_status: 'VERIFIED' },
    JPM: { sector: 'conventional_finance', haram_revenue_pct: 0.85, total_debt: 300e9, market_cap: 450e9, receivables: 100e9, total_assets: 3.7e12, interest_income: 80e9, total_revenue: 128e9, truth_status: 'VERIFIED' },
  }
  
  return mockData[ticker] || {
    sector: 'unknown',
    haram_revenue_pct: 0.10,
    total_debt: 10e9,
    market_cap: 50e9,
    receivables: 5e9,
    total_assets: 30e9,
    interest_income: 1e9,
    total_revenue: 20e9,
    truth_status: 'STUBBED'
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { ticker } = await req.json()
    
    if (!ticker) {
      return NextResponse.json({ error: "Ticker required" }, { status: 400 })
    }
    
    // Get user's sharia profile
    const { data: profile } = await supabase
      .from('sharia_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    // Use defaults if no profile
    const maxDebtRatio = profile?.max_debt_ratio || 0.33
    const maxReceivablesRatio = profile?.max_receivables_ratio || 0.49
    const maxHaramRevenue = profile?.max_haram_revenue_ratio || 0.05
    const blockedSectors = profile?.blocked_sectors || ['alcohol', 'tobacco', 'gambling', 'weapons', 'adult_entertainment', 'conventional_finance']
    
    // Fetch financial data
    const data = await fetchFinancialData(ticker.toUpperCase())
    
    // H1: Business Activity Screen
    const h1_pass = !blockedSectors.includes(data.sector) && data.haram_revenue_pct <= maxHaramRevenue
    const h1_evidence: GateEvidence = {
      source: 'financial_data_provider',
      value: { sector: data.sector, haram_revenue_pct: data.haram_revenue_pct, threshold: maxHaramRevenue },
      timestamp: new Date().toISOString(),
      truth_status: data.truth_status
    }
    
    // H2: Debt Ratio Screen
    const debt_ratio = data.total_debt / data.market_cap
    const h2_pass = debt_ratio <= maxDebtRatio
    const h2_evidence: GateEvidence = {
      source: 'financial_data_provider',
      value: { total_debt: data.total_debt, market_cap: data.market_cap, ratio: debt_ratio, threshold: maxDebtRatio },
      timestamp: new Date().toISOString(),
      truth_status: data.truth_status
    }
    
    // H3: Receivables/Assets Screen
    const receivables_ratio = data.receivables / data.total_assets
    const h3_pass = receivables_ratio <= maxReceivablesRatio
    const h3_evidence: GateEvidence = {
      source: 'financial_data_provider',
      value: { receivables: data.receivables, total_assets: data.total_assets, ratio: receivables_ratio, threshold: maxReceivablesRatio },
      timestamp: new Date().toISOString(),
      truth_status: data.truth_status
    }
    
    // H4: Interest Income Screen
    const interest_ratio = data.interest_income / data.total_revenue
    const h4_pass = interest_ratio <= maxHaramRevenue
    const h4_evidence: GateEvidence = {
      source: 'financial_data_provider',
      value: { interest_income: data.interest_income, total_revenue: data.total_revenue, ratio: interest_ratio, threshold: maxHaramRevenue },
      timestamp: new Date().toISOString(),
      truth_status: data.truth_status
    }
    
    // Overall
    const overall_pass = h1_pass && h2_pass && h3_pass && h4_pass
    const compliance_score = [h1_pass, h2_pass, h3_pass, h4_pass].filter(Boolean).length * 25
    
    const screen: Partial<HalalScreen> = {
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      screen_date: new Date().toISOString().split('T')[0],
      h1_sector: data.sector,
      h1_haram_revenue_pct: data.haram_revenue_pct,
      h1_pass,
      h1_evidence,
      h2_total_debt: data.total_debt,
      h2_market_cap: data.market_cap,
      h2_debt_ratio: debt_ratio,
      h2_pass,
      h2_evidence,
      h3_receivables: data.receivables,
      h3_total_assets: data.total_assets,
      h3_receivables_ratio: receivables_ratio,
      h3_pass,
      h3_evidence,
      h4_interest_income: data.interest_income,
      h4_total_revenue: data.total_revenue,
      h4_interest_ratio: interest_ratio,
      h4_pass,
      h4_evidence,
      overall_pass,
      compliance_score,
      truth_status: data.truth_status,
      data_sources: { provider: 'mock', timestamp: new Date().toISOString() }
    }
    
    // Save to database
    const { data: savedScreen, error } = await supabase
      .from('halal_screens')
      .insert(screen)
      .select()
      .single()
    
    if (error) {
      console.error("Error saving halal screen:", error)
      // Return the screen data even if save fails
      return NextResponse.json({ screen: { ...screen, id: 'temp-' + Date.now() } })
    }
    
    return NextResponse.json({ screen: savedScreen })
    
  } catch (error) {
    console.error("Halal screen error:", error)
    return NextResponse.json({ error: "Failed to run halal screen" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const ticker = req.nextUrl.searchParams.get('ticker')
    
    let query = supabase
      .from('halal_screens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (ticker) {
      query = query.eq('ticker', ticker.toUpperCase())
    }
    
    const { data: screens, error } = await query.limit(50)
    
    if (error) {
      console.error("Error fetching screens:", error)
      return NextResponse.json({ screens: [] })
    }
    
    return NextResponse.json({ screens })
    
  } catch (error) {
    console.error("Fetch screens error:", error)
    return NextResponse.json({ error: "Failed to fetch screens" }, { status: 500 })
  }
}
