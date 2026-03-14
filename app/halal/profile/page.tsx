"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { LoadingLogo } from "@/components/logo"
import type { ShariaProfile, ShariaStandard } from "@/lib/halal/types"
import { Shield, Save, Info } from "lucide-react"

const BLOCKED_SECTORS_OPTIONS = [
  { id: "alcohol", label: "Alcohol", desc: "Breweries, distilleries, wine producers" },
  { id: "tobacco", label: "Tobacco", desc: "Cigarettes, vaping, tobacco products" },
  { id: "gambling", label: "Gambling", desc: "Casinos, betting, lottery" },
  { id: "weapons", label: "Weapons", desc: "Arms manufacturing, defense contractors" },
  { id: "adult_entertainment", label: "Adult Entertainment", desc: "Adult content, nightclubs" },
  { id: "conventional_finance", label: "Conventional Finance", desc: "Interest-based banking, insurance" },
  { id: "pork", label: "Pork Products", desc: "Pork processing, pig farming" },
]

const STANDARD_INFO: Record<ShariaStandard, { name: string; desc: string; ratios: { debt: number; receivables: number; haram: number } }> = {
  AAOIFI: {
    name: "AAOIFI Standard",
    desc: "Accounting and Auditing Organization for Islamic Financial Institutions - Most conservative",
    ratios: { debt: 0.30, receivables: 0.45, haram: 0.05 }
  },
  DJIM: {
    name: "Dow Jones Islamic Market",
    desc: "Widely used index methodology - Moderately conservative",
    ratios: { debt: 0.33, receivables: 0.49, haram: 0.05 }
  },
  CUSTOM: {
    name: "Custom Ratios",
    desc: "Set your own compliance thresholds based on scholarly guidance",
    ratios: { debt: 0.33, receivables: 0.49, haram: 0.05 }
  }
}

export default function ShariaProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [standard, setStandard] = useState<ShariaStandard>("AAOIFI")
  const [maxDebtRatio, setMaxDebtRatio] = useState(0.33)
  const [maxReceivablesRatio, setMaxReceivablesRatio] = useState(0.49)
  const [maxHaramRevenue, setMaxHaramRevenue] = useState(0.05)
  const [blockedSectors, setBlockedSectors] = useState<string[]>(["alcohol", "tobacco", "gambling", "weapons", "adult_entertainment", "conventional_finance"])
  const [requirePurification, setRequirePurification] = useState(true)
  const [charityDestination, setCharityDestination] = useState("Islamic Relief USA")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Apply standard presets
  useEffect(() => {
    if (standard !== "CUSTOM") {
      const info = STANDARD_INFO[standard]
      setMaxDebtRatio(info.ratios.debt)
      setMaxReceivablesRatio(info.ratios.receivables)
      setMaxHaramRevenue(info.ratios.haram)
    }
  }, [standard])

  const toggleSector = (id: string) => {
    setBlockedSectors(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const saveProfile = useCallback(async () => {
    setSaving(true)
    try {
      // Would save to /api/halal/profile
      await new Promise(r => setTimeout(r, 500))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#22c55e]" />
            <h1 className="text-2xl font-semibold text-[#f5f5f5]">Sharia Profile</h1>
          </div>
          <p className="mt-1 text-sm text-[#737373]">
            Configure your compliance standard and screening thresholds
          </p>
        </div>

        {/* Standard Selection */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Compliance Standard</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(STANDARD_INFO) as ShariaStandard[]).map((std) => (
              <button
                key={std}
                onClick={() => setStandard(std)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  standard === std
                    ? 'border-[#22c55e] bg-[#22c55e]/10'
                    : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
              >
                <p className="font-medium text-[#f5f5f5]">{STANDARD_INFO[std].name}</p>
                <p className="mt-1 text-[10px] text-[#737373]">{STANDARD_INFO[std].desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Financial Ratios */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f5f5f5]">Financial Ratio Thresholds</h3>
            {standard !== "CUSTOM" && (
              <span className="rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#737373]">
                Preset by {standard}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Debt Ratio */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-[#a1a1aa]">Max Debt / Market Cap</label>
                <span className="font-mono text-sm text-[#f5f5f5]">{(maxDebtRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.01"
                value={maxDebtRatio}
                onChange={(e) => { setStandard("CUSTOM"); setMaxDebtRatio(Number(e.target.value)) }}
                className="w-full accent-[#22c55e]"
              />
              <p className="mt-1 text-[10px] text-[#737373]">Companies with higher debt ratios fail H2 screen</p>
            </div>
            
            {/* Receivables Ratio */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-[#a1a1aa]">Max Receivables / Assets</label>
                <span className="font-mono text-sm text-[#f5f5f5]">{(maxReceivablesRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.60"
                step="0.01"
                value={maxReceivablesRatio}
                onChange={(e) => { setStandard("CUSTOM"); setMaxReceivablesRatio(Number(e.target.value)) }}
                className="w-full accent-[#22c55e]"
              />
              <p className="mt-1 text-[10px] text-[#737373]">Companies with higher receivables ratios fail H3 screen</p>
            </div>
            
            {/* Haram Revenue */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-[#a1a1aa]">Max Haram Revenue %</label>
                <span className="font-mono text-sm text-[#f5f5f5]">{(maxHaramRevenue * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.01"
                value={maxHaramRevenue}
                onChange={(e) => { setStandard("CUSTOM"); setMaxHaramRevenue(Number(e.target.value)) }}
                className="w-full accent-[#22c55e]"
              />
              <p className="mt-1 text-[10px] text-[#737373]">Revenue from haram activities (interest, alcohol, etc.)</p>
            </div>
          </div>
        </div>

        {/* Blocked Sectors */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Blocked Sectors</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {BLOCKED_SECTORS_OPTIONS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => toggleSector(sector.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  blockedSectors.includes(sector.id)
                    ? 'border-[#ef4444]/50 bg-[#ef4444]/10'
                    : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                  blockedSectors.includes(sector.id)
                    ? 'border-[#ef4444] bg-[#ef4444]'
                    : 'border-[#3a3a3a]'
                }`}>
                  {blockedSectors.includes(sector.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#f5f5f5]">{sector.label}</p>
                  <p className="text-[10px] text-[#737373]">{sector.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Purification Settings */}
        <div className="mb-6 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#f5f5f5]">Purification Settings</h3>
          
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#f5f5f5]">Require Purification Tracking</p>
              <p className="text-[10px] text-[#737373]">Track haram income portions for donation</p>
            </div>
            <button
              onClick={() => setRequirePurification(!requirePurification)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                requirePurification ? 'bg-[#22c55e]' : 'bg-[#3a3a3a]'
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                requirePurification ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>
          
          {requirePurification && (
            <div>
              <label className="mb-2 block text-xs text-[#a1a1aa]">Preferred Charity</label>
              <input
                type="text"
                value={charityDestination}
                onChange={(e) => setCharityDestination(e.target.value)}
                placeholder="e.g., Islamic Relief USA"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-[#f5f5f5] focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
          <div className="text-xs text-[#22c55e]">
            <p className="font-medium">About Halal Screening</p>
            <p className="mt-1 text-[#22c55e]/80">
              These settings apply the AAOIFI or DJIM methodologies for Islamic stock screening. 
              The H1-H4 gates check business activity and financial ratios. 
              Always consult with a qualified Islamic scholar for specific guidance on your trading activities.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#22c55e] py-3 font-semibold text-[#0c0c0c] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  )
}
