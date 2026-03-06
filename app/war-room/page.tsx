"use client"

import { useEffect, useState } from "react"
import { 
  Activity, AlertTriangle, BarChart3, 
  Clock, DollarSign, Eye, Flame, 
  Menu, TrendingDown, TrendingUp, X 
} from "lucide-react"
import { Logo } from "@/components/logo"
import { SidebarNav } from "@/components/sidebar-nav"
import { TAG_COLORS, type NavTag } from "@/lib/nav-config"

// Types
interface Position {
  id: string
  ticker: string
  strategy: string
  entry_date: string
  entry_price: number
  current_price: number
  pnl: number
  pnl_pct: number
  contracts: number
  status: "open" | "closing" | "closed"
}

interface Signal {
  id: string
  ticker: string
  verdict: "GO" | "WAIT" | "NO"
  strategy: string
  trust_score: number
  win_likelihood: number
  recommended_amount: number
  timestamp: string
  tags: Array<"BROKER" | "SWARM" | "TRUTHSERUM" | "CALIBRATION">
}

interface PortfolioStats {
  total_value: number
  day_pnl: number
  day_pnl_pct: number
  open_positions: number
  win_rate: number
  mode: "PAPER" | "LIVE"
}

interface MarketContext {
  regime: string
  vix: number
  spy_change: number
  active_themes: string[]
}



export default function WarRoomPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Data states
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [context, setContext] = useState<MarketContext | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch data from existing APIs
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch scan results for signals
        const scanRes = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            catalyst_mode: false, 
            force_refresh: false, 
            account_size: 10000, 
            max_risk: 0.02, 
            hard_cap: 500 
          })
        })
        
        if (scanRes.ok) {
          const scanData = await scanRes.json()
          // Transform scan deals to signals
          const transformedSignals: Signal[] = (scanData.deals || []).slice(0, 5).map((deal: Record<string, unknown>, i: number) => ({
            id: `signal-${i}`,
            ticker: (deal.candidate as Record<string, unknown>)?.ticker || "UNKNOWN",
            verdict: deal.score && (deal.score as Record<string, number>).total >= 70 ? "GO" : (deal.score as Record<string, number>).total >= 50 ? "WAIT" : "NO",
            strategy: (deal.candidate as Record<string, unknown>)?.strategy || "PCS",
            trust_score: (deal.score as Record<string, number>)?.total || 0,
            win_likelihood: ((deal as Record<string, number>).pop || 0.65) * 100,
            recommended_amount: (deal as Record<string, number>).risk_usd || 164,
            timestamp: new Date().toISOString(),
            tags: ["SWARM", "TRUTHSERUM"] as Array<"BROKER" | "SWARM" | "TRUTHSERUM" | "CALIBRATION">
          }))
          setSignals(transformedSignals)
          
          // Set market context from regime
          setContext({
            regime: scanData.regime || "TRENDING",
            vix: 18.5,
            spy_change: 0.45,
            active_themes: ["AI Infrastructure", "Rate Sensitivity", "Earnings Season"]
          })
        }
        
        // Mock portfolio stats (would come from positions API)
        setPortfolio({
          total_value: 10247.30,
          day_pnl: 142.80,
          day_pnl_pct: 1.41,
          open_positions: 3,
          win_rate: 68,
          mode: "PAPER"
        })
        
        // Mock positions (would come from broker API)
        setPositions([
          {
            id: "pos-1",
            ticker: "NVDA",
            strategy: "PCS 115/110",
            entry_date: "2026-03-01",
            entry_price: 0.85,
            current_price: 0.42,
            pnl: 43,
            pnl_pct: 50.6,
            contracts: 1,
            status: "open"
          },
          {
            id: "pos-2",
            ticker: "AAPL",
            strategy: "PCS 170/165",
            entry_date: "2026-03-02",
            entry_price: 0.72,
            current_price: 0.58,
            pnl: 14,
            pnl_pct: 19.4,
            contracts: 1,
            status: "open"
          }
        ])
        
      } catch (error) {
        console.error("[v0] War Room data fetch error:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const verdictColor = (verdict: string) => {
    switch (verdict) {
      case "GO": return "bg-[var(--green-900)] text-[var(--green-400)] border-[var(--green-700)]"
      case "WAIT": return "bg-[var(--gold-600)]/20 text-[var(--gold-300)] border-[var(--gold-600)]"
      case "NO": return "bg-[var(--red-900)] text-[var(--red-400)] border-[var(--red-600)]"
      default: return "bg-[var(--gray-800)] text-[var(--gray-400)] border-[var(--gray-700)]"
    }
  }

  const tagColor = (tag: string) => {
    switch (tag) {
      case "BROKER": return "bg-blue-500/20 text-blue-400"
      case "SWARM": return "bg-green-500/20 text-green-400"
      case "TRUTHSERUM": return "bg-purple-500/20 text-purple-400"
      case "CALIBRATION": return "bg-amber-500/20 text-amber-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  return (
    <div className="flex h-screen bg-[var(--bg-void)] text-[var(--text-primary)]">
      {/* Desktop Sidebar - Fixed 188px */}
      <div className="hidden lg:block">
        <SidebarNav />
      </div>

      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Logo size="xs" />
          <span className="text-sm font-semibold">
            <span className="text-[var(--green-500)]">TRADE</span>
            <span className="text-[var(--gold-400)]">SWARM</span>
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="h-full w-[280px]" onClick={e => e.stopPropagation()}>
            <SidebarNav />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header with Portfolio Summary */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">War Room</h1>
              <p className="text-xs text-[var(--text-muted)]">Dashboard · Signals · Risk Governor</p>
            </div>
            
            {portfolio && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-semibold">${portfolio.total_value.toLocaleString()}</p>
                  <p className={`text-xs font-medium ${portfolio.day_pnl >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                    {portfolio.day_pnl >= 0 ? "+" : ""}{portfolio.day_pnl.toFixed(2)} ({portfolio.day_pnl_pct.toFixed(2)}%)
                  </p>
                </div>
                <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  portfolio.mode === "PAPER" 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-green-500/20 text-green-400"
                }`}>
                  {portfolio.mode === "PAPER" ? <Eye className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                  {portfolio.mode}
                </div>
              </div>
            )}
          </div>

          {/* Market Context */}
          {context && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Regime</p>
                <p className="mt-1 text-lg font-semibold text-[var(--green-400)]">{context.regime}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">VIX</p>
                <p className="mt-1 text-lg font-semibold">{context.vix.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">SPY</p>
                <p className={`mt-1 text-lg font-semibold ${context.spy_change >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                  {context.spy_change >= 0 ? "+" : ""}{context.spy_change.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Active Themes</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{context.active_themes[0]}</p>
              </div>
            </div>
          )}

          {/* Signals Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Signals Feed</h2>
              <span className="text-[10px] text-[var(--text-muted)]">{signals.length} active</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Logo size="lg" />
              </div>
            ) : signals.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">No signals yet. Scanner will run shortly.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {signals.map(signal => (
                  <div 
                    key={signal.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${verdictColor(signal.verdict)}`}>
                            {signal.verdict}
                          </span>
                          <span className="text-lg font-semibold">{signal.ticker}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{signal.strategy}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--text-muted)]">Trust Score</p>
                        <p className="text-xl font-semibold">{signal.trust_score}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      {signal.tags.map(tag => {
                        const colors = TAG_COLORS[tag as NavTag]
                        return (
                          <span
                            key={tag}
                            className="rounded px-1.5 py-0.5 text-[8px] font-medium tracking-wider"
                            style={{
                              backgroundColor: colors?.bg || "#1a1a1a",
                              color: colors?.text || "#888",
                            }}
                          >
                            {tag}
                          </span>
                        )
                      })}
                      <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                        ${signal.recommended_amount} recommended
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Positions */}
          {positions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">Open Positions</h2>
              <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-surface)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">Ticker</th>
                      <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">Strategy</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-muted)]">P&L</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-muted)]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => (
                      <tr key={pos.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="px-4 py-3 font-medium">{pos.ticker}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{pos.strategy}</td>
                        <td className={`px-4 py-3 text-right font-medium ${pos.pnl >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                          {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right ${pos.pnl >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                          {pos.pnl >= 0 ? "+" : ""}{pos.pnl_pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
