"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { TabId, TradeCandidate } from "@/lib/types"
import { TabBar } from "@/components/tab-bar"
import { RadarScreen } from "@/components/screens/radar-screen"
import { TradesScreen } from "@/components/screens/trades-screen"
import { MoneyScreen } from "@/components/screens/money-screen"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { TradeProvider } from "@/lib/trade-context"
import { LoadingLogo, HeaderLogo } from "@/components/logo"
import { mockCandidates, mockRadarData, mockThemes, mockPortfolio } from "@/lib/mock-data"
import { TradeCard } from "@/components/trade-card"
import { formatCurrency } from "@/lib/utils"

type NavGroup = "war-room" | "markets" | "trade" | "swarm" | "truth" | "outcomes" | "ops" | "account"
type FeedViewMode = "signals" | "watchlist" | "positions"

// Nav icons
const NavIcon = ({ group, className = "h-4 w-4" }: { group: NavGroup; className?: string }) => {
  const icons: Record<NavGroup, React.ReactNode> = {
    "war-room": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />,
    "markets": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />,
    "trade": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />,
    "swarm": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />,
    "truth": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
    "outcomes": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />,
    "ops": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.7 5.7a2.125 2.125 0 01-3-3l5.7-5.7m3-3l3.18-3.18a2.125 2.125 0 013 3L14.42 12.17m-3-3l3 3" />,
    "account": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />,
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[group]}
    </svg>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("radar")
  const [aiCandidate, setAiCandidate] = useState<TradeCandidate | null>(null)
  const [activeNav, setActiveNav] = useState<NavGroup>("war-room")
  const [viewMode, setViewMode] = useState<FeedViewMode>("signals")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const isDemoMode = searchParams.get("demo") === "1" || searchParams.get("demo") === "true"

  const candidates = useMemo(
    () =>
      aiCandidate
        ? [aiCandidate, ...mockCandidates.filter((candidate) => candidate.ticker !== aiCandidate.ticker)]
        : mockCandidates,
    [aiCandidate]
  )

  const handleNavigateToTrades = (candidate?: TradeCandidate) => {
    if (candidate) {
      setAiCandidate(candidate)
    }
    setActiveTab("trades")
    setActiveNav("trade")
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingLogo />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navGroups: { id: NavGroup; label: string; tag?: "edge" | "critical" }[] = [
    { id: "war-room", label: "War Room" },
    { id: "markets", label: "Markets" },
    { id: "trade", label: "Trade" },
    { id: "swarm", label: "Swarm", tag: "edge" },
    { id: "truth", label: "Truth" },
    { id: "outcomes", label: "Outcomes" },
    { id: "ops", label: "Ops" },
    { id: "account", label: "Account" },
  ]

  const statusBadgeColor = (status: string) => {
    if (status === "GO") return "bg-[#22c55e] text-[#0c0c0c]"
    if (status === "WAIT") return "bg-[#c9a227] text-[#0c0c0c]"
    return "bg-[#ef4444] text-white"
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Sidebar - Navigation */}
        <aside className={`flex flex-col border-r border-[#1f1f1f] bg-[#0c0c0c] transition-all ${sidebarCollapsed ? "w-16" : "w-56"}`}>
          {/* Logo */}
          <div className="flex h-14 items-center justify-between border-b border-[#1f1f1f] px-4">
            {!sidebarCollapsed && <HeaderLogo />}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="rounded p-1.5 text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* Nav Groups */}
          <nav className="flex-1 overflow-y-auto py-3">
            <div className="space-y-1 px-2">
              {navGroups.slice(0, 6).map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveNav(group.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeNav === group.id
                      ? "bg-[#1a5c3a]/20 text-[#22c55e]"
                      : "text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
                  }`}
                >
                  <NavIcon group={group.id} />
                  {!sidebarCollapsed && (
                    <>
                      <span>{group.label}</span>
                      {group.tag === "edge" && (
                        <span className="ml-auto rounded bg-[#22c55e]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#22c55e]">
                          EDGE
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="my-3 border-t border-[#1f1f1f]" />

            {/* System section */}
            {!sidebarCollapsed && (
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">System</p>
            )}
            <div className="space-y-1 px-2">
              {navGroups.slice(6).map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveNav(group.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeNav === group.id
                      ? "bg-[#1a5c3a]/20 text-[#22c55e]"
                      : "text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
                  }`}
                >
                  <NavIcon group={group.id} />
                  {!sidebarCollapsed && <span>{group.label}</span>}
                </button>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-[#1f1f1f] p-3">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c9a227]/20 text-xs font-bold text-[#c9a227]">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="truncate text-sm text-[#f5f5f5]">{user?.email?.split("@")[0]}</p>
                  <p className="text-[10px] text-[#737373]">Paper Mode</p>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Top Bar */}
          <header className="flex h-14 items-center justify-between border-b border-[#1f1f1f] bg-[#0c0c0c] px-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Portfolio</p>
                <p className="font-mono text-lg font-bold text-[#f5f5f5]">{formatCurrency(mockPortfolio.balance)}</p>
              </div>
              <div className="h-8 w-px bg-[#1f1f1f]" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#737373]">Today</p>
                <p className="font-mono text-sm font-semibold text-[#22c55e]">+{formatCurrency(mockPortfolio.dayPnl)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDemoMode && (
                <span className="rounded border border-[#737373]/30 bg-[#1a1a1a] px-2 py-1 font-mono text-[10px] font-medium text-[#737373]">
                  DEMO
                </span>
              )}
              <div className="flex items-center gap-2 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" />
                <span className="font-mono text-xs font-medium text-[#f59e0b]">PAPER</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#737373]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                Live
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex flex-1 overflow-hidden">
            {/* Feed Panel */}
            <div className="flex flex-1 flex-col border-r border-[#1f1f1f]">
              {/* Feed Header */}
              <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
                <h1 className="text-sm font-semibold text-[#f5f5f5]">
                  {activeNav === "war-room" && "Signals Feed"}
                  {activeNav === "markets" && "Watchlist"}
                  {activeNav === "trade" && "Trade Ticket"}
                  {activeNav === "swarm" && "Consensus View"}
                  {activeNav === "truth" && "Receipts Ledger"}
                  {activeNav === "outcomes" && "Trade Journal"}
                  {activeNav === "ops" && "System Health"}
                  {activeNav === "account" && "Settings"}
                </h1>
                <div className="flex gap-1 rounded-lg border border-[#1f1f1f] bg-[#141414] p-1">
                  {(["signals", "watchlist", "positions"] as FeedViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        viewMode === mode
                          ? "bg-[#1a5c3a]/30 text-[#22c55e]"
                          : "text-[#737373] hover:text-[#f5f5f5]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.ticker}
                      className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4 transition-colors hover:border-[#c9a227]/30"
                    >
                      {/* Card Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeColor(candidate.status)}`}>
                              {candidate.status}
                            </span>
                            <span className="font-mono text-lg font-bold text-[#f5f5f5]">{candidate.ticker}</span>
                          </div>
                          <p className="mt-1 text-xs text-[#737373]">{candidate.strategy}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#737373]">Trust Score</p>
                          <p className="font-mono text-xl font-bold text-[#f5f5f5]">
                            {candidate.trustScore}<span className="text-sm text-[#737373]">/100</span>
                          </p>
                        </div>
                      </div>

                      {/* Bullets */}
                      <div className="mb-4 space-y-1.5 text-xs">
                        <p className="text-[#737373]"><span className="text-[#f5f5f5]">WHY:</span> {candidate.bullets.why}</p>
                        <p className="text-[#737373]"><span className="text-[#f5f5f5]">RISK:</span> {candidate.bullets.risk}</p>
                        <p className="text-[#737373]"><span className="text-[#f5f5f5]">SIZE:</span> {candidate.bullets.amount}</p>
                      </div>

                      {/* Amount */}
                      {candidate.amountDollars && (
                        <div className="mb-4 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] p-3 text-center">
                          <p className="font-mono text-2xl font-bold text-[#f5f5f5]">${candidate.amountDollars}</p>
                          <p className="text-[10px] text-[#737373]">Recommended position</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {candidate.status === "GO" ? (
                          <>
                            <button className="flex-1 rounded-lg bg-[#c9a227] py-2.5 text-sm font-semibold text-[#0c0c0c] transition-colors hover:bg-[#d4af37]">
                              Execute Trade
                            </button>
                            <button className="rounded-lg border border-[#1f1f1f] px-4 py-2.5 text-sm font-medium text-[#737373] transition-colors hover:bg-[#1a1a1a] hover:text-[#f5f5f5]">
                              Simulate
                            </button>
                          </>
                        ) : candidate.status === "WAIT" ? (
                          <>
                            <button className="flex-1 rounded-lg border border-[#c9a227]/30 bg-[#c9a227]/10 py-2.5 text-sm font-medium text-[#c9a227]">
                              Watching...
                            </button>
                            <button className="rounded-lg border border-[#1f1f1f] px-4 py-2.5 text-sm font-medium text-[#737373] transition-colors hover:bg-[#1a1a1a] hover:text-[#f5f5f5]">
                              Simulate
                            </button>
                          </>
                        ) : (
                          <button className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] py-2.5 text-sm font-medium text-[#737373]">
                            Conditions Not Met
                          </button>
                        )}
                      </div>

                      {/* Receipt link */}
                      <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
                        <button className="text-[#c9a227] hover:underline">View receipt</button>
                        <button className="text-[#737373] hover:text-[#f5f5f5]">Reasoning</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Context Panel */}
            <div className="w-80 flex-shrink-0 overflow-y-auto bg-[#0c0c0c] p-4">
              <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Market Context</h2>
              
              {/* Greeting */}
              <div className="mb-4 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
                <p className="text-sm text-[#f5f5f5]">{mockRadarData.greeting}</p>
                <p className="mt-2 text-xs text-[#737373]">{mockRadarData.lastScan}</p>
              </div>

              {/* Regime */}
              <div className="mb-4 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Market Regime</p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  <span className="text-sm font-medium text-[#f5f5f5]">Risk-On</span>
                </div>
                <p className="mt-2 text-xs text-[#737373]">VIX at 14.2, trend bullish, momentum strong</p>
              </div>

              {/* Top Theme */}
              <div className="mb-4 rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Active Theme</p>
                <p className="text-sm font-medium text-[#f5f5f5]">{mockThemes[0]?.name}</p>
                <p className="mt-1 text-xs text-[#737373]">{mockThemes[0]?.brief}</p>
                <p className="mt-2 font-mono text-[10px] text-[#c9a227]">{mockThemes[0]?.tickers.join(" · ")}</p>
              </div>

              {/* Safety Status */}
              <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Safety Status</p>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-[#737373]">Daily drawdown</span>
                  <span className="font-mono text-[#f5f5f5]">{mockPortfolio.drawdownPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div 
                    className="h-full rounded-full bg-[#22c55e]" 
                    style={{ width: `${(mockPortfolio.drawdownPct / mockPortfolio.drawdownLimitPct) * 100}%` }} 
                  />
                </div>
                <p className="mt-3 text-xs text-[#737373]">
                  {mockPortfolio.tradesToday}/{mockPortfolio.tradesTodayMax} trades today
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <main className="mx-auto max-w-[420px] px-4 pb-24 pt-6">
          {activeTab === "radar" && <RadarScreen onNavigateToTrades={handleNavigateToTrades} />}
          {activeTab === "trades" && <TradesScreen aiCandidate={aiCandidate} />}
          {activeTab === "money" && <MoneyScreen />}
        </main>

        <div className="fixed bottom-16 left-0 right-0 flex justify-center gap-2 py-2">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#737373]/30 bg-[#1a1a1a] px-2 py-1">
              <span className="font-mono text-[10px] font-medium text-[#737373]">DEMO</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f59e0b]" />
            <span className="font-mono text-[10px] font-medium text-[#f59e0b]">PAPER</span>
          </div>
        </div>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* User Menu Overlay */}
      {showUserMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          <div className="fixed bottom-20 left-4 z-50 w-56 rounded-xl border border-[#1f1f1f] bg-[#141414] p-2 shadow-2xl lg:bottom-auto lg:left-auto lg:right-4 lg:top-16">
            <div className="border-b border-[#1f1f1f] px-3 py-2">
              <p className="text-[10px] text-[#737373]">Signed in as</p>
              <p className="truncate text-sm text-[#f5f5f5]">{user?.email}</p>
            </div>
            <div className="py-1">
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#737373] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]">
                <NavIcon group="account" />
                Settings
              </button>
              <button
                onClick={() => { signOut(); setShowUserMenu(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <TradeProvider>
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c]">
            <LoadingLogo />
          </div>
        }>
          <AppContent />
        </Suspense>
      </TradeProvider>
    </AuthProvider>
  )
}
