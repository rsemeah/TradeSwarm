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

type SectionId =
  | "market-context"
  | "feed-explorer"
  | "symbol-explorer"
  | "news-narrative"
  | "receipts-audit"
  | "my-money"
  | "settings"

type FeedViewMode = "card" | "table" | "context" | "timeline"

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("radar")
  const [aiCandidate, setAiCandidate] = useState<TradeCandidate | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>("feed-explorer")
  const [viewMode, setViewMode] = useState<FeedViewMode>("card")
  const [leftPaneWidth, setLeftPaneWidth] = useState(22)
  const [middlePaneWidth, setMiddlePaneWidth] = useState(44)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Demo mode: ?demo=1 shows mock data explicitly
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
    setActiveSection("feed-explorer")
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

  const rightPaneWidth = 100 - leftPaneWidth - middlePaneWidth

  return (
    <div className="min-h-screen bg-background">
      {/* DESKTOP SHELL — must stay hidden below lg. Rendering both shells simultaneously
           pushes mobile tab content off-screen and makes tabs appear non-functional.
           Rule: desktop shell = hidden lg:block | mobile shell = lg:hidden — never relax either. */}
      <main className="hidden lg:block min-h-screen p-4">
        {/* Top Navigation Bar */}
        <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card/70 px-4 py-3">
          <div className="flex items-center gap-4">
            <HeaderLogo />
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Practice Balance</p>
              <p className="font-mono text-lg font-bold text-foreground">{formatCurrency(mockPortfolio.balance)}</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="font-mono text-sm font-medium text-accent">+{formatCurrency(mockPortfolio.dayPnl)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isDemoMode && (
              <div className="flex items-center gap-2 rounded-md border border-muted-foreground/30 bg-muted px-3 py-1.5">
                <span className="font-mono text-xs font-medium text-muted-foreground">DEMO DATA</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
              <span className="font-mono text-xs font-medium text-warning">PAPER MODE</span>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden xl:inline">{user?.email?.split("@")[0] || "User"}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full z-[60] mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg pointer-events-auto">
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="truncate text-sm text-foreground">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setActiveSection("market-context"); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Dashboard
                  </button>
                  <button
                    onClick={() => { setActiveTab("money"); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    My Money
                  </button>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="grid min-h-[calc(100vh-5.5rem)] gap-3"
          style={{ gridTemplateColumns: `${leftPaneWidth}% ${middlePaneWidth}% ${rightPaneWidth}%` }}
        >
          <section className="rounded-lg border border-border bg-card p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top-level Sections</h2>
            <div className="space-y-2">
              {[
                ["feed-explorer", "Feed Explorer"],
                ["market-context", "Market Context"],
                ["symbol-explorer", "Symbol Explorer"],
                ["news-narrative", "News/Narrative"],
                ["receipts-audit", "Receipts/Audit"],
                ["my-money", "My Money"],
                ["settings", "Settings"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as SectionId)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeSection === id ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <label className="text-[11px] text-muted-foreground">Left pane width ({leftPaneWidth}%)</label>
              <input
                type="range"
                min={16}
                max={35}
                value={leftPaneWidth}
                onChange={(event) => setLeftPaneWidth(Number(event.target.value))}
                className="mt-2 w-full"
              />
              <label className="mt-3 block text-[11px] text-muted-foreground">Middle pane width ({middlePaneWidth}%)</label>
              <input
                type="range"
                min={30}
                max={60}
                value={middlePaneWidth}
                onChange={(event) => setMiddlePaneWidth(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold capitalize text-foreground">{activeSection.replace(/-/g, " ")}</h2>
              {!["my-money", "settings"].includes(activeSection) && (
                <div className="flex gap-1 rounded-md border border-border p-1">
                  {(["card", "table", "context", "timeline"] as FeedViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded px-2 py-1 text-xs capitalize ${
                        viewMode === mode ? "bg-accent/20 text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              {viewMode === "card" && (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <TradeCard key={candidate.ticker} candidate={candidate} />
                  ))}
                </div>
              )}

              {viewMode === "table" && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2">Ticker</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Trust</th>
                      <th className="py-2">Win %</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.ticker} className="border-b border-border/60">
                        <td className="py-2 font-mono text-foreground">{candidate.ticker}</td>
                        <td className="py-2">{candidate.status}</td>
                        <td className="py-2">{candidate.trustScore}</td>
                        <td className="py-2">{candidate.winLikelihoodPct ?? "—"}</td>
                        <td className="py-2">{candidate.amountDollars ? `$${candidate.amountDollars}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewMode === "context" && (
                <div className="space-y-3">
                  {mockThemes.map((theme) => (
                    <div key={theme.name} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{theme.heat}</p>
                      <h3 className="text-sm font-semibold text-foreground">{theme.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{theme.brief}</p>
                      <p className="mt-2 font-mono text-[11px] text-accent">{theme.tickers.join(" • ")}</p>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "timeline" && (
                <ol className="space-y-3 border-l border-border pl-4">
                  {candidates.map((candidate, index) => (
                    <li key={candidate.ticker} className="relative">
                      <span className="absolute -left-[1.15rem] top-1 h-2 w-2 rounded-full bg-accent" />
                      <p className="text-[11px] text-muted-foreground">T+{index * 7}m</p>
                      <p className="text-sm font-medium text-foreground">{candidate.ticker} moved to {candidate.status}</p>
                      <p className="text-xs text-muted-foreground">{candidate.bullets.why}</p>
                    </li>
                  ))}
                </ol>
              )}

              {/* My Money View */}
              {activeSection === "my-money" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Practice Balance</p>
                    <p className="font-mono text-3xl font-bold text-foreground">{formatCurrency(mockPortfolio.balance)}</p>
                    <p className="font-mono text-lg text-accent">+{formatCurrency(mockPortfolio.dayPnl)}</p>
                  </div>
                  
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Safety Status</h3>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-muted-foreground">Safety Buffer</span>
                      <span className="text-foreground">{mockPortfolio.drawdownPct}% used</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(mockPortfolio.drawdownPct / mockPortfolio.drawdownLimitPct) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{mockPortfolio.tradesToday} of {mockPortfolio.tradesTodayMax} trades today</p>
                  </div>
                  
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">This Week</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Trades</p>
                        <p className="font-mono text-lg font-bold text-foreground">{mockPortfolio.weekStats.trades}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="font-mono text-lg font-bold text-foreground">{mockPortfolio.weekStats.winRatePct}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Road to Real Money</h3>
                    <p className="mb-2 text-xs text-muted-foreground">{mockPortfolio.paperTradesCompleted} / {mockPortfolio.paperTradesRequired} practice trades</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(mockPortfolio.paperTradesCompleted / mockPortfolio.paperTradesRequired) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Settings View */}
              {activeSection === "settings" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Account</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Appearance</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Dark Mode</span>
                      <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${isDarkMode ? "bg-accent" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isDarkMode ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Safety Mode</h3>
                    <div className="space-y-2">
                      {["Training Wheels", "Normal", "Pro"].map((mode, i) => (
                        <label key={mode} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${i === 0 ? "border-accent bg-accent/10" : "border-border"}`}>
                          <input type="radio" name="safety" checked={i === 0} readOnly className="accent-accent" />
                          <span className={`text-sm ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{mode}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={signOut}
                    className="w-full rounded-lg border border-danger/30 bg-danger/10 py-3 text-sm font-medium text-danger hover:bg-danger/20"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market Context</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Greeting</p>
                <p className="text-sm text-foreground">{mockRadarData.greeting}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Feed Explorer</p>
                <p className="text-xs text-foreground">View mode: <span className="capitalize">{viewMode}</span></p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Symbol Explorer</p>
                <p className="font-mono text-sm text-foreground">{candidates[0]?.ticker ?? "--"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">News/Narrative</p>
                <p className="text-xs text-foreground">AI infra narrative remains dominant into next scan.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Receipts/Audit</p>
                <p className="text-xs text-foreground">Last scan: {mockRadarData.lastScan}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* MOBILE SHELL — must stay lg:hidden. pb-24 clears the fixed TabBar (~64px).
           Paper mode badge sits at bottom-16 (64px) in the safe zone above TabBar.
           Rule: only activeTab controls screen render — do not add extra conditional wrappers here. */}
      <div className="lg:hidden">
        <main className="mx-auto max-w-[420px] px-4 pb-24 pt-6">
          {activeTab === "radar" && <RadarScreen onNavigateToTrades={handleNavigateToTrades} />}
          {activeTab === "trades" && <TradesScreen aiCandidate={aiCandidate} />}
          {activeTab === "money" && <MoneyScreen />}
        </main>

        <div className="fixed bottom-16 left-0 right-0 flex justify-center gap-2 py-2">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted px-2 py-1">
              <span className="font-mono text-[10px] font-medium text-muted-foreground">DEMO</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
            <span className="font-mono text-[10px] font-medium text-warning">PAPER MODE</span>
          </div>
        </div>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <TradeProvider>
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <LoadingLogo />
          </div>
        }>
          <AppContent />
        </Suspense>
      </TradeProvider>
    </AuthProvider>
  )
}
