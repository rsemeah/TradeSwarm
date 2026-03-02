"use client"

import Image from "next/image"

interface LogoProps {
  variant?: "full" | "icon" | "wordmark"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

// Brand colors from the logo
const BRAND = {
  green: "#1B5E20",
  gold: "#C5A028",
  accent: "#00ff88",
}

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

// Icon-only logo (wasp with candlesticks in wings)
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
      {/* Antennae */}
      <path
        d="M28 12L26 6M36 12L38 6"
        stroke={BRAND.gold}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Head */}
      <path
        d="M32 8L26 14H38L32 8Z"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Thorax */}
      <path
        d="M26 14L22 22H42L38 14H26Z"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Body segment 1 */}
      <path
        d="M22 22L20 30H44L42 22H22Z"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Body segment 2 */}
      <path
        d="M20 30L24 38H40L44 30H20Z"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Body segment 3 */}
      <path
        d="M24 38L28 46H36L40 38H24Z"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Arrow tail */}
      <path
        d="M32 46V56"
        stroke={BRAND.green}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M28 52L32 58L36 52"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left wing outer */}
      <path
        d="M22 18L6 12L4 22L22 28"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Left wing inner */}
      <path
        d="M22 22L10 18L8 26L22 30"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1"
        opacity="0.8"
      />
      {/* Right wing outer */}
      <path
        d="M42 18L58 12L60 22L42 28"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1.5"
      />
      {/* Right wing inner */}
      <path
        d="M42 22L54 18L56 26L42 30"
        fill={BRAND.green}
        stroke={BRAND.gold}
        strokeWidth="1"
        opacity="0.8"
      />
      {/* Candlestick accents - left wing */}
      <rect x="8" y="15" width="2" height="6" fill="#00ff88" rx="0.5" />
      <rect x="12" y="14" width="2" height="8" fill="#ff4444" rx="0.5" />
      <rect x="16" y="16" width="2" height="5" fill="#00ff88" rx="0.5" />
      {/* Candlestick accents - right wing */}
      <rect x="54" y="15" width="2" height="6" fill="#00ff88" rx="0.5" />
      <rect x="50" y="14" width="2" height="8" fill="#ff4444" rx="0.5" />
      <rect x="46" y="16" width="2" height="5" fill="#00ff88" rx="0.5" />
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
        <tspan fill={BRAND.gold}>TRADE</tspan>
        <tspan fill={BRAND.green}>SWARM</tspan>
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

// Image-based logo (uses the actual brand image)
export function LogoImage({ 
  size = "md", 
  className = "" 
}: { 
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string 
}) {
  const sizes = {
    xs: { width: 80, height: 45 },
    sm: { width: 120, height: 68 },
    md: { width: 160, height: 90 },
    lg: { width: 200, height: 113 },
    xl: { width: 280, height: 158 },
  }
  
  return (
    <Image
      src="/images/tradeswarm-logo.jpg"
      alt="TradeSwarm"
      width={sizes[size].width}
      height={sizes[size].height}
      className={`object-contain ${className}`}
      priority
    />
  )
}

// Header logo component - optimized for app header
export function HeaderLogo() {
  return (
    <div className="flex items-center gap-2">
      <LogoIcon size={28} />
      <span className="text-sm font-bold tracking-wide">
        <span style={{ color: BRAND.gold }}>TRADE</span>
        <span style={{ color: BRAND.green }}>SWARM</span>
      </span>
    </div>
  )
}

// Loading screen logo with pulse animation
export function LoadingLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="animate-pulse">
        <LogoIcon size={64} />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xl font-bold tracking-wide" style={{ color: BRAND.gold }}>TRADE</span>
        <span className="text-xl font-bold tracking-wide" style={{ color: BRAND.green }}>SWARM</span>
      </div>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  )
}

// Tab bar icon (small)
export function TabBarLogo() {
  return <LogoIcon size={24} />
}

// Splash screen logo (large, centered)
export function SplashLogo() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <LogoIcon size={96} />
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl font-bold tracking-wider" style={{ color: BRAND.gold }}>TRADE</span>
          <span className="text-3xl font-bold tracking-wider" style={{ color: BRAND.green }}>SWARM</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Regime-Aware AI Trading</p>
      </div>
    </div>
  )
}
