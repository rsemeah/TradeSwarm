"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { TabId, TradeCandidate } from "@/lib/types"
import { TabBar } from "@/components/tab-bar"
import { RadarScreen } from "@/components/screens/radar-screen"
import { TradesScreen } from "@/components/screens/trades-screen"
import { MoneyScreen } from "@/components/screens/money-screen"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { TradeProvider } from "@/lib/trade-context"
import { LoadingLogo } from "@/components/logo"
import { mockCandidates, mockRadarData, mockThemes } from "@/lib/mock-data"
import { TradeCard } from "@/components/trade-card"

type SectionId =
  | "market-context"
  | "feed-explorer"
  | "symbol-explorer"
  | "news-narrative"
  | "receipts-audit"

type FeedViewMode = "card" | "table" | "context" | "timeline"

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("radar")
  const [aiCandidate, setAiCandidate] = useState<TradeCandidate | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>("feed-explorer")
  const [viewMode, setViewMode] = useState<FeedViewMode>("card")
  const [leftPaneWidth, setLeftPaneWidth] = useState(22)
  const [middlePaneWidth, setMiddlePaneWidth] = useState(44)
  const { user, loading } = useAuth()
  const router = useRouter()

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
      <main className="hidden min-h-screen p-4 lg:block">
        <div className="mb-3 rounded-lg border border-border bg-card/70 px-4 py-3">
          <h1 className="text-sm font-semibold text-foreground">TradeSwarm Pro Workspace</h1>
          <p className="text-xs text-muted-foreground">Desktop-first multi-pane workspace with resizable panes and feed view modes.</p>
        </div>

        <div
          className="grid min-h-[calc(100vh-5.5rem)] gap-3"
          style={{ gridTemplateColumns: `${leftPaneWidth}% ${middlePaneWidth}% ${rightPaneWidth}%` }}
        >
          <section className="rounded-lg border border-border bg-card p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top-level Sections</h2>
            <div className="space-y-2">
              {[
                ["market-context", "Market Context"],
                ["feed-explorer", "Feed Explorer"],
                ["symbol-explorer", "Symbol Explorer"],
                ["news-narrative", "News/Narrative"],
                ["receipts-audit", "Receipts/Audit"],
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
              <h2 className="text-sm font-semibold text-foreground">{activeSection.replace("-", " ")}</h2>
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

      <div className="lg:hidden">
        <main className="mx-auto max-w-[420px] px-4 pb-24 pt-6">
          {activeTab === "radar" && <RadarScreen onNavigateToTrades={handleNavigateToTrades} />}
          {activeTab === "trades" && <TradesScreen aiCandidate={aiCandidate} />}
          {activeTab === "money" && <MoneyScreen />}
        </main>

        <div className="fixed bottom-16 left-0 right-0 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Practice mode — no real money</p>
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
        <AppContent />
      </TradeProvider>
    </AuthProvider>
  )
}
