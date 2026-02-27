"use client"

import { Header } from "./header"
import { CandidateCard } from "./candidate-card"
import { RegimePanel } from "./regime-panel"
import { PortfolioPanel } from "./portfolio-panel"
import { StatusBar } from "./status-bar"
import {
  mockCandidates,
  mockRegime,
  mockPortfolio,
  mockSystemStatus,
} from "@/lib/mock-data"

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <Header portfolio={mockPortfolio} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6">
        {/* Left Column - Trade Candidates (65%) */}
        <section className="flex flex-col gap-4 md:w-[65%]">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Live Candidates
            </h2>
            <span className="text-xs text-muted-foreground">
              Scanned {mockSystemStatus.lastScan}
            </span>
          </div>

          {/* Candidate Cards */}
          <div className="flex flex-col gap-4">
            {mockCandidates.map((candidate) => (
              <CandidateCard key={candidate.ticker} candidate={candidate} />
            ))}
          </div>
        </section>

        {/* Right Column - Regime + Portfolio (35%) */}
        <aside className="flex flex-col gap-4 md:w-[35%]">
          <RegimePanel regime={mockRegime} />
          <PortfolioPanel portfolio={mockPortfolio} />
        </aside>
      </main>

      {/* Status Bar */}
      <StatusBar status={mockSystemStatus} />
    </div>
  )
}
