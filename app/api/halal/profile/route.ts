import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ShariaProfile } from "@/lib/halal/types"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { data: profile, error } = await supabase
      .from('sharia_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error fetching profile:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }
    
    // Return default profile if none exists
    if (!profile) {
      return NextResponse.json({
        profile: {
          user_id: user.id,
          standard: 'AAOIFI',
          max_debt_ratio: 0.33,
          max_receivables_ratio: 0.49,
          max_haram_revenue_ratio: 0.05,
          allowed_sectors: ['technology', 'healthcare', 'industrials', 'consumer_goods'],
          blocked_sectors: ['alcohol', 'tobacco', 'gambling', 'weapons', 'adult_entertainment', 'conventional_finance'],
          require_purification: true,
          charity_destination: 'Islamic Relief USA'
        } as Partial<ShariaProfile>
      })
    }
    
    return NextResponse.json({ profile })
    
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    const {
      standard,
      max_debt_ratio,
      max_receivables_ratio,
      max_haram_revenue_ratio,
      allowed_sectors,
      blocked_sectors,
      require_purification,
      charity_destination
    } = body
    
    const profileData = {
      user_id: user.id,
      standard: standard || 'AAOIFI',
      max_debt_ratio: max_debt_ratio ?? 0.33,
      max_receivables_ratio: max_receivables_ratio ?? 0.49,
      max_haram_revenue_ratio: max_haram_revenue_ratio ?? 0.05,
      allowed_sectors: allowed_sectors || ['technology', 'healthcare', 'industrials', 'consumer_goods'],
      blocked_sectors: blocked_sectors || ['alcohol', 'tobacco', 'gambling', 'weapons', 'adult_entertainment', 'conventional_finance'],
      require_purification: require_purification ?? true,
      charity_destination: charity_destination || 'Islamic Relief USA',
      updated_at: new Date().toISOString()
    }
    
    // Upsert profile
    const { data: profile, error } = await supabase
      .from('sharia_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single()
    
    if (error) {
      console.error("Error saving profile:", error)
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
    }
    
    return NextResponse.json({ profile, message: "Profile saved successfully" })
    
  } catch (error) {
    console.error("Profile save error:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
