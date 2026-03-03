"use client"

/**
 * TradeSwarm dashboard shell — canonical outer layout.
 *
 * Desktop (lg+): sidebar nav + 3-pane workspace.
 *   Pane 1 (left)   — section selector + controls, width: 208px (fixed)
 *   Pane 2 (center) — primary feed explorer, flex: 1
 *   Pane 3 (right)  — context / summary blocks, width: 320px (fixed)
 *
 * Mobile (<lg): MobileHeader + tab content area + fixed TabBar.
 *   pb-24 clears the TabBar. Do not remove.
 *
 * Shell invariants (do not relax):
 *   - Desktop shell: hidden lg:flex  — never remove "hidden"
 *   - Mobile shell:  lg:hidden       — never remove "lg:hidden"
 *   - Paper mode badge: bottom-16   — safe zone above fixed TabBar (~64px)
 *
 * Integration: replace the outer div in app.tsx with <DashboardShell>, or
 * use it as the new root in app/page.tsx once ready to promote.
 */

import { type ReactNode } from "react"
import { DesktopNav, MobileHeader, type SectionId } from "./tradeswarm-nav"

// ── Desktop 3-pane layout ──────────────────────────────────────────────────

interface DesktopShellProps {
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
  leftPane: ReactNode
  centerPane: ReactNode
  rightPane?: ReactNode
  userEmail?: string | null
  dayPnl?: string
  onSignOut?: () => void
}

export function DesktopShell({
  activeSection,
  onSectionChange,
  leftPane,
  centerPane,
  rightPane,
  userEmail,
  dayPnl,
  onSignOut,
}: DesktopShellProps) {
  return (
    // DESKTOP SHELL — must stay hidden below lg.
    // Rendering both shells simultaneously pushes mobile content off-screen.
    <div className="hidden lg:flex h-screen overflow-hidden bg-background">
      {/* Sidebar nav */}
      <DesktopNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        userEmail={userEmail}
        dayPnl={dayPnl}
        onSignOut={onSignOut}
      />

      {/* Pane 2 — center feed */}
      <main className="flex-1 overflow-y-auto border-r border-border">
        <div className="h-full p-4">{centerPane}</div>
      </main>

      {/* Pane 3 — right context (optional) */}
      {rightPane && (
        <aside className="w-80 shrink-0 overflow-y-auto">
          <div className="p-4">{rightPane}</div>
        </aside>
      )}

      {/* Pane 1 (left controls) — rendered inside sidebar or separate */}
      {leftPane && (
        <div className="absolute hidden">{leftPane}</div>
      )}
    </div>
  )
}

// ── Mobile tab shell ───────────────────────────────────────────────────────

export type MobileTabId = "radar" | "trades" | "money"

interface MobileTab {
  id: MobileTabId
  label: string
  icon: string
}

const MOBILE_TABS: MobileTab[] = [
  { id: "radar",  label: "Radar",  icon: "◎" },
  { id: "trades", label: "Trades", icon: "≡" },
  { id: "money",  label: "Money",  icon: "◈" },
]

interface MobileShellProps {
  activeTab: MobileTabId
  onTabChange: (id: MobileTabId) => void
  children: ReactNode
  userEmail?: string | null
  dayPnl?: string
  isPaperMode?: boolean
}

export function MobileShell({
  activeTab,
  onTabChange,
  children,
  userEmail,
  dayPnl,
  isPaperMode = true,
}: MobileShellProps) {
  return (
    // MOBILE SHELL — must stay lg:hidden.
    // pb-24 (~96px) clears the fixed TabBar. Do not reduce.
    <div className="lg:hidden flex flex-col min-h-screen bg-background">
      <MobileHeader userEmail={userEmail} dayPnl={dayPnl} isPaperMode={isPaperMode} />

      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Paper mode badge — bottom-16 is safe zone above TabBar */}
      {isPaperMode && (
        <div className="fixed bottom-16 left-1/2 z-40 -translate-x-1/2 pointer-events-none">
          <span className="rounded-full border border-accent/40 bg-background/90 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent backdrop-blur-sm">
            Paper Mode
          </span>
        </div>
      )}

      {/* Fixed bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border bg-card"
        aria-label="Mobile navigation"
      >
        {MOBILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Combined responsive shell ──────────────────────────────────────────────
// Renders the correct shell based on viewport. Not needed if you use
// DesktopShell and MobileShell separately in your page component.

interface DashboardShellProps {
  // Desktop
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
  centerPane: ReactNode
  rightPane?: ReactNode
  leftPane?: ReactNode
  // Mobile
  activeTab: MobileTabId
  onTabChange: (id: MobileTabId) => void
  mobileContent: ReactNode
  // Shared
  userEmail?: string | null
  dayPnl?: string
  isPaperMode?: boolean
  onSignOut?: () => void
}

export function DashboardShell({
  activeSection,
  onSectionChange,
  centerPane,
  rightPane,
  leftPane,
  activeTab,
  onTabChange,
  mobileContent,
  userEmail,
  dayPnl,
  isPaperMode = true,
  onSignOut,
}: DashboardShellProps) {
  return (
    <>
      <DesktopShell
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        leftPane={leftPane ?? null}
        centerPane={centerPane}
        rightPane={rightPane}
        userEmail={userEmail}
        dayPnl={dayPnl}
        onSignOut={onSignOut}
      />
      <MobileShell
        activeTab={activeTab}
        onTabChange={onTabChange}
        userEmail={userEmail}
        dayPnl={dayPnl}
        isPaperMode={isPaperMode}
      >
        {mobileContent}
      </MobileShell>
    </>
  )
}
