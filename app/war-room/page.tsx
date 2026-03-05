"use client"

import { useEffect, useState } from "react"
import { 
  Activity, AlertTriangle, BarChart3, ChevronDown, ChevronRight, 
  Clock, DollarSign, Eye, Flame, LayoutDashboard, LineChart, 
  ListChecks, Menu, Settings, Shield, Target, TrendingDown, TrendingUp, 
  Wallet, X, Zap 
} from "lucide-react"
import { Logo } from "@/components/logo"

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

// Navigation structure
const NAV_GROUPS = [
  { 
    id: "war-room", 
    label: "War Room", 
    icon: LayoutDashboard,
    screens: ["Dashboard", "Signals Feed", "Risk Governor"],
    active: true
  },
  { 
    id: "markets", 
    label: "Markets", 
    icon: LineChart,
    screens: ["Watchlists", "Quotes & Ticker", "Charts", "Options Chain"]
  },
  { 
    id: "trade", 
    label: "Trade", 
    icon: Target,
    screens: ["Trade Ticket", "Orders", "Positions", "Activity"]
  },
  { 
    id: "swarm", 
    label: "Swarm", 
    icon: Zap,
    screens: ["Consensus View", "Strategy Library", "Strategy Detail", "Capital Policy"],
    tag: "EDGE"
  },
  { 
    id: "truth", 
    label: "Truth", 
    icon: Shield,
    screens: ["Receipts Ledger", "Receipt Detail", "Replay Center", "Convergence Dashboard"],
    tag: "TS"
  },
  { 
    id: "outcomes", 
    label: "Outcomes", 
    icon: BarChart3,
    screens: ["Trade Journal", "Performance Analytics", "Experiments"]
  },
  { 
    id: "ops", 
    label: "Ops", 
    icon: Settings,
    screens: ["System Health", "Broker Connections", "Paper → Live Toggle", "Alerts Center"]
  },
  { 
    id: "account", 
    label: "Account", 
    icon: Wallet,
    screens: ["Plan & Billing", "Security", "Notifications", "Bug / Feedback"]
  },
]

export default function WarRoomPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState<string | null>("war-room")
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
      <aside className={`hidden lg:flex flex-col w-[188px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]`}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[var(--border-subtle)] px-4">
          <Logo size="sm" />
          <span className="text-sm font-semibold tracking-tight">
            <span className="text-[var(--green-500)]">TRADE</span>
            <span className="text-[var(--gold-400)]">SWARM</span>
          </span>
        </div>
        
        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  group.active 
                    ? "bg-[var(--green-900)] text-[var(--green-400)]" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <group.icon className="h-4 w-4" />
                  <span>{group.label}</span>
                  {group.tag && (
                    <span className="rounded bg-[var(--green-700)] px-1 py-0.5 text-[9px] font-bold text-[var(--green-400)]">
                      {group.tag}
                    </span>
                  )}
                </div>
                {expandedGroup === group.id ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              
              {expandedGroup === group.id && (
                <div className="ml-6 border-l border-[var(--border-subtle)] py-1">
                  {group.screens.map((screen, i) => (
                    <button
                      key={screen}
                      className={`block w-full px-3 py-1.5 text-left text-[11px] transition-colors ${
                        i === 0 && group.active
                          ? "text-[var(--green-400)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {screen}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        
        {/* Mode Indicator */}
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${
            portfolio?.mode === "PAPER" 
              ? "bg-amber-500/20 text-amber-400" 
              : "bg-green-500/20 text-green-400"
          }`}>
            {portfolio?.mode === "PAPER" ? <Eye className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
            {portfolio?.mode || "PAPER"} MODE
          </div>
        </div>
      </aside>

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
          <aside 
            className="absolute left-0 top-14 bottom-0 w-64 bg-[var(--bg-surface)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="py-2">
              {NAV_GROUPS.map((group) => (
                <button
                  key={group.id}
                  className={`flex w-full items-center gap-2 px-4 py-3 text-sm ${
                    group.active 
                      ? "bg-[var(--green-900)] text-[var(--green-400)]" 
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  <group.icon className="h-4 w-4" />
                  {group.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">War Room</h1>
            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
              Last scan: {new Date().toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {portfolio && (
              <>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-muted)]">Portfolio</p>
                  <p className="font-mono text-sm font-semibold">${portfolio.total_value.toLocaleString()}</p>
                </div>
                <div className={`text-right ${portfolio.day_pnl >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                  <p className="text-xs text-[var(--text-muted)]">Today</p>
                  <p className="font-mono text-sm font-semibold">
                    {portfolio.day_pnl >= 0 ? "+" : ""}{portfolio.day_pnl_pct.toFixed(2)}%
                  </p>
                </div>
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Logo size="lg" />
              <p className="text-sm text-[var(--text-muted)]">Loading War Room...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-3 lg:gap-6 lg:p-6">
            {/* Portfolio Summary Card */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">PORTFOLIO</h2>
                <Wallet className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              
              <div className="mb-4">
                <p className="font-mono text-2xl font-bold">${portfolio?.total_value.toLocaleString()}</p>
                <p className={`text-sm font-medium ${(portfolio?.day_pnl || 0) >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                  {(portfolio?.day_pnl || 0) >= 0 ? "+" : ""}${portfolio?.day_pnl.toFixed(2)} ({portfolio?.day_pnl_pct.toFixed(2)}%)
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Open Positions</p>
                  <p className="font-mono text-lg font-semibold">{portfolio?.open_positions}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Win Rate</p>
                  <p className="font-mono text-lg font-semibold">{portfolio?.win_rate}%</p>
                </div>
              </div>
            </div>

            {/* Market Context Card */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">MARKET CONTEXT</h2>
                <Activity className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              
              <div className="mb-4 flex items-center gap-2">
                <span className={`rounded-lg px-2 py-1 text-xs font-bold ${
                  context?.regime === "TRENDING" 
                    ? "bg-[var(--green-900)] text-[var(--green-400)]"
                    : context?.regime === "HIGH_VOL"
                    ? "bg-[var(--red-900)] text-[var(--red-400)]"
                    : "bg-[var(--gray-800)] text-[var(--gray-400)]"
                }`}>
                  {context?.regime || "UNKNOWN"}
                </span>
                <span className="text-xs text-[var(--text-muted)]">Regime</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">VIX</p>
                  <p className="font-mono text-lg font-semibold">{context?.vix}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">SPY</p>
                  <p className={`font-mono text-lg font-semibold ${(context?.spy_change || 0) >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                    {(context?.spy_change || 0) >= 0 ? "+" : ""}{context?.spy_change}%
                  </p>
                </div>
              </div>
              
              <div>
                <p className="mb-2 text-xs text-[var(--text-muted)]">Active Themes</p>
                <div className="flex flex-wrap gap-1">
                  {context?.active_themes.map((theme) => (
                    <span key={theme} className="rounded bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Status Card */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">RISK GOVERNOR</h2>
                <Shield className="h-4 w-4 text-[var(--green-500)]" />
              </div>
              
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--green-500)]" />
                <span className="text-sm font-medium text-[var(--green-400)]">All Systems Normal</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Daily Loss Limit</span>
                  <span className="font-mono text-[var(--green-400)]">$0 / $200</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Position Exposure</span>
                  <span className="font-mono text-[var(--green-400)]">2.4%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Correlation Risk</span>
                  <span className="font-mono text-[var(--gold-400)]">Medium</span>
                </div>
              </div>
            </div>

            {/* Signals Feed */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">SIGNALS FEED</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{signals.length} candidates</span>
                  <Zap className="h-4 w-4 text-[var(--gold-400)]" />
                </div>
              </div>
              
              <div className="space-y-3">
                {signals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="mb-2 h-8 w-8 text-[var(--text-muted)]" />
                    <p className="text-sm text-[var(--text-muted)]">No signals at the moment</p>
                    <p className="text-xs text-[var(--text-muted)]">Scan will refresh automatically</p>
                  </div>
                ) : (
                  signals.map((signal) => (
                    <div 
                      key={signal.id} 
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`rounded border px-2 py-0.5 text-xs font-bold ${verdictColor(signal.verdict)}`}>
                            {signal.verdict}
                          </span>
                          <span className="font-mono text-sm font-bold">{signal.ticker}</span>
                          <span className="text-xs text-[var(--text-muted)]">{signal.strategy}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--text-muted)]">Trust</p>
                          <p className="font-mono text-sm font-semibold">{signal.trust_score}/100</p>
                        </div>
                      </div>
                      
                      <div className="mb-2 flex items-center gap-1">
                        {signal.tags.map((tag) => (
                          <span key={tag} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${tagColor(tag)}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[var(--text-muted)]">
                          Win: {signal.win_likelihood.toFixed(0)}% · ${signal.recommended_amount}
                        </p>
                        {signal.verdict === "GO" && (
                          <button className="rounded bg-[var(--green-700)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--green-600)]">
                            Execute →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Positions */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">OPEN POSITIONS</h2>
                <ListChecks className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              
              <div className="space-y-3">
                {positions.map((pos) => (
                  <div key={pos.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold">{pos.ticker}</span>
                      <span className={`font-mono text-sm font-semibold ${pos.pnl >= 0 ? "text-[var(--green-400)]" : "text-[var(--red-400)]"}`}>
                        {pos.pnl >= 0 ? "+" : ""}${pos.pnl}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{pos.strategy}</span>
                      <span>{pos.pnl_pct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
