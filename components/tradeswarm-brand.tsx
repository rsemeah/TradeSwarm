"use client"

/**
 * TradeSwarm brand mark and lockup components.
 *
 * Usage rules:
 *   - Mobile header / favicon / app icon  → <BrandMark />
 *   - Desktop nav sidebar header          → <BrandLockup />
 *   - Responsive (auto)                   → <Brand />  (mark on mobile, lockup on desktop)
 *   - Loading / splash                    → <BrandSplash />
 *
 * Colors are hardcoded to the canonical palette — do not override with className.
 * Forest green (#1B5E20 body, #1f9d73 candles) + champagne gold (#C5A028 stroke/wordmark).
 */

// ── Forest green + gold palette constants ──────────────────────────────────
const FOREST = "#1B5E20"
const GOLD = "#C5A028"
const CANDLE_UP = "#1f9d73"
const CANDLE_DOWN = "#8b0000"

// ── Mark SVG (wasp icon only) ──────────────────────────────────────────────

interface MarkProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 36, className = "" }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TradeSwarm mark"
      role="img"
    >
      {/* Body — diamond segments */}
      <path d="M32 8L26 16H38L32 8Z" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />
      <path d="M26 16L22 24H42L38 16H26Z" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />
      <path d="M22 24L20 32H44L42 24H22Z" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />
      <path d="M20 32L24 40H40L44 32H20Z" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />
      <path d="M24 40L28 48H36L40 40H24Z" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />

      {/* Arrow tail — upward momentum */}
      <path
        d="M32 48L32 58L28 54M32 58L36 54"
        stroke={GOLD}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left wing */}
      <path d="M22 20L4 16L8 24L22 28" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />

      {/* Right wing */}
      <path d="M42 20L60 16L56 24L42 28" fill={FOREST} stroke={GOLD} strokeWidth="1.5" />

      {/* Candlestick accents — left wing */}
      <rect x="8"  y="18" width="2" height="6" fill={CANDLE_UP} />
      <rect x="12" y="16" width="2" height="8" fill={CANDLE_DOWN} />
      <rect x="16" y="19" width="2" height="5" fill={CANDLE_UP} />

      {/* Candlestick accents — right wing */}
      <rect x="50" y="18" width="2" height="6" fill={CANDLE_UP} />
      <rect x="46" y="16" width="2" height="8" fill={CANDLE_DOWN} />
      <rect x="54" y="19" width="2" height="5" fill={CANDLE_UP} />
    </svg>
  )
}

// ── Wordmark SVG (text only) ───────────────────────────────────────────────

interface WordmarkProps {
  width?: number
  className?: string
}

export function BrandWordmark({ width = 140, className = "" }: WordmarkProps) {
  const height = width * 0.25
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TradeSwarm wordmark"
      role="img"
    >
      <text
        x="0"
        y="38"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="32"
        letterSpacing="0.05em"
      >
        <tspan fill={FOREST}>TRADE</tspan>
        <tspan fill={GOLD}>SWARM</tspan>
      </text>
    </svg>
  )
}

// ── Horizontal lockup (mark + wordmark) ───────────────────────────────────

interface LockupProps {
  markSize?: number
  wordmarkWidth?: number
  className?: string
}

export function BrandLockup({ markSize = 32, wordmarkWidth = 130, className = "" }: LockupProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="TradeSwarm">
      <BrandMark size={markSize} />
      <BrandWordmark width={wordmarkWidth} />
    </div>
  )
}

// ── Responsive brand (auto-switches at lg breakpoint) ─────────────────────
// Mark on mobile, lockup on desktop. Drop-in for any nav header.

export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      {/* Mobile: mark only */}
      <div className="lg:hidden">
        <BrandMark size={30} />
      </div>
      {/* Desktop: full lockup */}
      <div className="hidden lg:flex">
        <BrandLockup markSize={28} wordmarkWidth={120} />
      </div>
    </div>
  )
}

// ── Loading / splash ───────────────────────────────────────────────────────

export function BrandSplash() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="animate-pulse">
        <BrandMark size={64} />
      </div>
      <BrandWordmark width={160} />
    </div>
  )
}
