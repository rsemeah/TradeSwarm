"use client"

interface LogoProps {
  variant?: "full" | "icon" | "wordmark"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

// SVG-based logo components for crisp rendering at all sizes
export function Logo({ variant = "full", size = "md", className = "" }: LogoProps) {
  const sizes = {
    xs: { icon: 20, full: 80, wordmark: 60 },
    sm: { icon: 28, full: 120, wordmark: 90 },
    md: { icon: 36, full: 160, wordmark: 120 },
    lg: { icon: 48, full: 200, wordmark: 150 },
    xl: { icon: 64, full: 280, wordmark: 200 },
  }

  const width = sizes[size][variant === "icon" ? "icon" : variant === "wordmark" ? "wordmark" : "full"]

  if (variant === "icon") {
    return <LogoIcon size={width} className={className} />
  }

  if (variant === "wordmark") {
    return <LogoWordmark width={width} className={className} />
  }

  return <LogoFull width={width} className={className} />
}

// Icon-only logo (bee symbol)
function LogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bee body */}
      <path
        d="M32 8L26 16H38L32 8Z"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      {/* Head */}
      <path
        d="M26 16L22 24H42L38 16H26Z"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      {/* Body segments */}
      <path
        d="M22 24L20 32H44L42 24H22Z"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      <path
        d="M20 32L24 40H40L44 32H20Z"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      <path
        d="M24 40L28 48H36L40 40H24Z"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      {/* Arrow tail */}
      <path
        d="M32 48L32 58L28 54M32 58L36 54"
        stroke="#C5A028"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left wing */}
      <path
        d="M22 20L4 16L8 24L22 28"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      {/* Right wing */}
      <path
        d="M42 20L60 16L56 24L42 28"
        fill="#1B5E20"
        stroke="#C5A028"
        strokeWidth="1.5"
      />
      {/* Candlestick accents on wings */}
      <rect x="8" y="18" width="2" height="6" fill="#00ff88" />
      <rect x="12" y="16" width="2" height="8" fill="#ff4444" />
      <rect x="16" y="19" width="2" height="5" fill="#00ff88" />
      <rect x="50" y="18" width="2" height="6" fill="#00ff88" />
      <rect x="46" y="16" width="2" height="8" fill="#ff4444" />
      <rect x="54" y="19" width="2" height="5" fill="#00ff88" />
    </svg>
  )
}

// Wordmark only
function LogoWordmark({ width = 120, className = "" }: { width?: number; className?: string }) {
  const height = width * 0.25
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="38"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="32"
        letterSpacing="0.05em"
      >
        <tspan fill="#1B5E20">TRADE</tspan>
        <tspan fill="#C5A028">SWARM</tspan>
      </text>
    </svg>
  )
}

// Full logo with icon + wordmark
function LogoFull({ width = 160, className = "" }: { width?: number; className?: string }) {
  const height = width * 0.35
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ width }}>
      <LogoIcon size={height * 0.9} />
      <LogoWordmark width={width * 0.65} />
    </div>
  )
}

// Header logo component - optimized for app header
export function HeaderLogo() {
  return (
    <div className="flex items-center gap-2">
      <LogoIcon size={28} />
      <span className="text-sm font-bold tracking-wide">
        <span className="text-[#1B5E20]">TRADE</span>
        <span className="text-[#C5A028]">SWARM</span>
      </span>
    </div>
  )
}

// Loading screen logo
export function LoadingLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="animate-pulse">
        <LogoIcon size={64} />
      </div>
      <LogoWordmark width={140} />
    </div>
  )
}

// Tab bar icon (small)
export function TabBarLogo() {
  return <LogoIcon size={24} />
}
