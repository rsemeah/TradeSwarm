// TradeSwarm Navigation Architecture
// 27 screens across 8 groups

export type NavTag = "BROKER" | "SWARM" | "TRUTHSERUM" | "CALIBRATION" | "OPS" | "ACCOUNT"

export interface NavScreen {
  id: string
  label: string
  tag: NavTag
  desc: string
  urgent?: boolean
  route: string
}

export interface NavGroup {
  id: string
  label: string
  icon: string
  badge?: string
  screens: NavScreen[]
}

export const TAG_COLORS: Record<NavTag, { bg: string; border: string; text: string }> = {
  BROKER: { bg: "#1a2535", border: "#2a3f5f", text: "#5b8fd4" },
  SWARM: { bg: "#1a2a1a", border: "#2a5f2a", text: "#5bd45b" },
  TRUTHSERUM: { bg: "#2a1a2a", border: "#5f2a5f", text: "#d45bd4" },
  CALIBRATION: { bg: "#2a2a1a", border: "#5f5f2a", text: "#d4d45b" },
  OPS: { bg: "#2a1a1a", border: "#5f2a2a", text: "#d45b5b" },
  ACCOUNT: { bg: "#1a2525", border: "#2a5050", text: "#5bd4d4" },
}

// Priority screens for MVP
export const PRIORITY_SCREENS = [
  "Dashboard",
  "Watchlists", 
  "Options Chain",
  "Trade Ticket",
  "Positions",
  "Orders",
  "Receipts Ledger",
  "Receipt Detail",
  "Replay Center",
  "Risk Governor"
]

export const NAV_PRIMARY: NavGroup[] = [
  {
    id: "home",
    label: "War Room",
    icon: "⬡",
    screens: [
      { id: "dashboard", label: "Dashboard", tag: "BROKER", desc: "Account snapshot, PnL, exposure, risk status, today's signals", route: "/war-room" },
      { id: "signals", label: "Signals Feed", tag: "SWARM", desc: "Chronological swarm output — candidates, scores, regimes, confidence bands", route: "/war-room/signals" },
      { id: "risk-governor", label: "Risk Governor", tag: "SWARM", urgent: true, desc: "Max drawdown brake, position caps, daily loss limits, capital gates", route: "/war-room/risk" },
    ]
  },
  {
    id: "market",
    label: "Markets",
    icon: "◈",
    screens: [
      { id: "watchlist", label: "Watchlists", tag: "BROKER", desc: "Multiple lists, tags, alerts, notes", route: "/markets/watchlists" },
      { id: "quotes", label: "Quotes & Ticker", tag: "BROKER", desc: "Price, IV, trend, news, earnings, options chain entry", route: "/markets/quotes" },
      { id: "charts", label: "Charts", tag: "BROKER", desc: "Price + indicators + signal markers, entry/exit annotations", route: "/markets/charts" },
      { id: "options-chain", label: "Options Chain", tag: "BROKER", desc: "Chain viewer with greeks, IV, OI, spread builder", route: "/markets/options" },
    ]
  },
  {
    id: "trade",
    label: "Trade",
    icon: "◎",
    screens: [
      { id: "ticket", label: "Trade Ticket", tag: "BROKER", desc: "Paper or live execution. Options legs, qty, limit/market, TIF", route: "/trade/ticket" },
      { id: "orders", label: "Orders", tag: "BROKER", desc: "Open, filled, canceled, rejected — full lifecycle", route: "/trade/orders" },
      { id: "positions", label: "Positions", tag: "BROKER", desc: "Live greeks, PnL, risk, exit controls", route: "/trade/positions" },
      { id: "activity", label: "Activity", tag: "BROKER", desc: "Fills, fees, transactions, audit trail", route: "/trade/activity" },
    ]
  },
  {
    id: "swarm",
    label: "Swarm",
    icon: "⬡",
    badge: "EDGE",
    screens: [
      { id: "consensus", label: "Consensus View", tag: "SWARM", desc: "Model votes, confidence, disagreement map, learn-why", route: "/swarm/consensus" },
      { id: "strategy-lib", label: "Strategy Library", tag: "SWARM", desc: "Bot catalog — strategies, edge thesis, risk profiles, constraints", route: "/swarm/strategies" },
      { id: "strategy-detail", label: "Strategy Detail", tag: "SWARM", desc: "Rules, entry/exit logic, example trades, known failure modes", route: "/swarm/strategy" },
      { id: "capital-policy", label: "Capital Policy", tag: "SWARM", desc: "Fractional Kelly, risk per trade, correlated exposure, tier multipliers", route: "/swarm/capital" },
    ]
  },
  {
    id: "truth",
    label: "Truth",
    icon: "▣",
    badge: "⬡",
    screens: [
      { id: "receipts", label: "Receipts Ledger", tag: "TRUTHSERUM", desc: "Every decision — hash, seed, schema version, engine version", route: "/truth/receipts" },
      { id: "receipt-detail", label: "Receipt Detail", tag: "TRUTHSERUM", desc: "Input snapshot, market hash, determinism hash, ignored volatiles", route: "/truth/receipt" },
      { id: "replay", label: "Replay Center", tag: "TRUTHSERUM", desc: "Select trade → replay → match / mismatch + classification", route: "/truth/replay" },
      { id: "convergence", label: "Convergence Dashboard", tag: "TRUTHSERUM", desc: "Match rate over time, mismatch causes, drift categories, top offenders", route: "/truth/convergence" },
    ]
  },
  {
    id: "outcomes",
    label: "Outcomes",
    icon: "◷",
    screens: [
      { id: "journal", label: "Trade Journal", tag: "CALIBRATION", desc: "Manual outcome logging — win/loss, realized PnL, notes", route: "/outcomes/journal" },
      { id: "performance", label: "Performance Analytics", tag: "CALIBRATION", desc: "PnL curves, win rate, expectancy, drawdown, confidence calibration", route: "/outcomes/performance" },
      { id: "experiments", label: "Experiments", tag: "CALIBRATION", desc: "A/B strategy runs, controlled config comparisons over time", route: "/outcomes/experiments" },
    ]
  },
]

export const NAV_SECONDARY: NavGroup[] = [
  {
    id: "ops",
    label: "Ops",
    icon: "◫",
    screens: [
      { id: "health", label: "System Health", tag: "OPS", desc: "API health, market data status, broker status, incident log", route: "/ops/health" },
      { id: "broker", label: "Broker Connections", tag: "OPS", desc: "Connect, scopes, permissions, last sync, OAuth management", route: "/ops/broker" },
      { id: "live-toggle", label: "Paper → Live Toggle", tag: "OPS", urgent: true, desc: "Explicit mode switch with confirmation gates and safeguards", route: "/ops/mode" },
      { id: "alerts", label: "Alerts Center", tag: "OPS", desc: "Price, signal, risk, execution, drift alerts", route: "/ops/alerts" },
    ]
  },
  {
    id: "account",
    label: "Account",
    icon: "◯",
    screens: [
      { id: "plan", label: "Plan & Billing", tag: "ACCOUNT", desc: "Pricing, limits, features, usage, invoices", route: "/account/billing" },
      { id: "security", label: "Security", tag: "ACCOUNT", desc: "MFA, sessions, devices, passkeys, API keys", route: "/account/security" },
      { id: "notifications", label: "Notifications", tag: "ACCOUNT", desc: "Email, push, SMS — per-type, quiet hours", route: "/account/notifications" },
      { id: "feedback", label: "Bug / Feedback", tag: "ACCOUNT", desc: "Attach receipt id + logs for useful bug reports", route: "/account/feedback" },
    ]
  },
]

export const ALL_NAV_GROUPS = [...NAV_PRIMARY, ...NAV_SECONDARY]

export function isPriorityScreen(label: string): boolean {
  return PRIORITY_SCREENS.includes(label)
}

export function getTotalScreens(): number {
  return ALL_NAV_GROUPS.reduce((sum, group) => sum + group.screens.length, 0)
}

export function getScreenByRoute(route: string): NavScreen | undefined {
  for (const group of ALL_NAV_GROUPS) {
    const screen = group.screens.find(s => s.route === route)
    if (screen) return screen
  }
  return undefined
}

export function getGroupByScreenId(screenId: string): NavGroup | undefined {
  return ALL_NAV_GROUPS.find(g => g.screens.some(s => s.id === screenId))
}
