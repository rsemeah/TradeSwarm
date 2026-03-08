"use client"

/**
 * TradeSwarm navigation components.
 *
 * Desktop: vertical sidebar with section selector + user identity strip.
 * Mobile:  top header bar with brand mark, PnL, and user avatar.
 *
 * Consumed by tradeswarm-dashboard.tsx. Do not render independently —
 * the dashboard shell owns the responsive layout contract.
 *
 * Section IDs must match the TabId / section constants used in app.tsx.
 */

import { BrandMark, BrandLockup } from "./tradeswarm-brand"

// ── Types ──────────────────────────────────────────────────────────────────

export type SectionId =
  | "market-context"
  | "feed-explorer"
  | "symbol-explorer"
  | "news-narrative"
  | "receipts-audit"

export interface NavSection {
  id: SectionId
  label: string
  shortLabel: string
  icon: string
}

export const NAV_SECTIONS: NavSection[] = [
  { id: "market-context",  label: "Market Context",  shortLabel: "Context",  icon: "⬡" },
  { id: "feed-explorer",   label: "Feed Explorer",   shortLabel: "Feed",     icon: "≡" },
  { id: "symbol-explorer", label: "Symbol Explorer", shortLabel: "Symbols",  icon: "◎" },
  { id: "news-narrative",  label: "News / Narrative", shortLabel: "News",    icon: "◈" },
  { id: "receipts-audit",  label: "Receipts / Audit", shortLabel: "Audit",  icon: "⬕" },
]

// ── Desktop sidebar nav ────────────────────────────────────────────────────

interface DesktopNavProps {
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
  userEmail?: string | null
  dayPnl?: string
  onSignOut?: () => void
}

export function DesktopNav({
  activeSection,
  onSectionChange,
  userEmail,
  dayPnl,
  onSignOut,
}: DesktopNavProps) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? "U"

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand header */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <BrandLockup markSize={24} wordmarkWidth={106} />
      </div>

      {/* Section list */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Main sections">
        {NAV_SECTIONS.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-accent/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="font-mono text-base leading-none opacity-70">{section.icon}</span>
              {section.label}
            </button>
          )
        })}
      </nav>

      {/* User identity strip */}
      <div className="border-t border-border p-3">
        {dayPnl && (
          <p className="mb-2 font-mono text-xs text-primary">{dayPnl}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
              {initial}
            </div>
            <span className="truncate text-[11px] text-muted-foreground">{userEmail ?? "—"}</span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Out
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── Mobile top header ──────────────────────────────────────────────────────

interface MobileHeaderProps {
  userEmail?: string | null
  dayPnl?: string
  isPaperMode?: boolean
}

export function MobileHeader({ userEmail, dayPnl, isPaperMode = true }: MobileHeaderProps) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? "U"

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Brand mark */}
      <BrandMark size={28} />

      {/* Center — paper mode label */}
      {isPaperMode && (
        <span className="rounded border border-accent/40 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
          Paper
        </span>
      )}

      {/* Right — PnL + avatar */}
      <div className="flex items-center gap-3">
        {dayPnl && (
          <span className="font-mono text-xs font-medium text-primary">{dayPnl}</span>
        )}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
          {initial}
        </div>
      </div>
    </header>
  )
}
