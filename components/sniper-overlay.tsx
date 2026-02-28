"use client"

import { useState, useEffect } from "react"
import type { TradeCandidate } from "@/lib/types"

interface SniperOverlayProps {
  candidate: TradeCandidate
  onConfirm: () => void
  onCancel: () => void
  isSimulation?: boolean
}

export function SniperOverlay({ candidate, onConfirm, onCancel, isSimulation = false }: SniperOverlayProps) {
  const [countdown, setCountdown] = useState(3)
  const [locked, setLocked] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && !locked) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !locked) {
      setLocked(true)
    }
  }, [countdown, locked])

  // Hold-to-confirm progress
  useEffect(() => {
    if (isHolding && locked) {
      const interval = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            onConfirm()
            return 100
          }
          return prev + 5
        })
      }, 50)
      return () => clearInterval(interval)
    } else {
      setHoldProgress(0)
    }
  }, [isHolding, locked, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm" />

      {/* Crosshair Container */}
      <div className="relative z-50 flex h-[320px] w-[320px] items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-pulse" />
        
        {/* Middle Ring with rotation */}
        <div 
          className="absolute inset-4 rounded-full border border-accent/50"
          style={{ animation: "spin 8s linear infinite" }}
        />
        
        {/* Inner Ring */}
        <div className="absolute inset-8 rounded-full border border-accent/70" />
        
        {/* Crosshair Lines */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-accent to-transparent opacity-50" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
        
        {/* Corner Brackets */}
        <div className="absolute left-8 top-8 h-6 w-6 border-l-2 border-t-2 border-accent" />
        <div className="absolute right-8 top-8 h-6 w-6 border-r-2 border-t-2 border-accent" />
        <div className="absolute bottom-8 left-8 h-6 w-6 border-b-2 border-l-2 border-accent" />
        <div className="absolute bottom-8 right-8 h-6 w-6 border-b-2 border-r-2 border-accent" />
        
        {/* Center Content */}
        <div className="relative z-10 text-center">
          {/* Mode Badge */}
          <div className={`mx-auto mb-2 w-fit rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isSimulation ? "bg-warning/20 text-warning" : "bg-accent/20 text-accent"
          }`}>
            {isSimulation ? "SIMULATION" : "LIVE FIRE"}
          </div>
          
          {/* Ticker */}
          <div className="font-mono text-3xl font-bold text-foreground">{candidate.ticker}</div>
          
          {/* Amount */}
          <div className="mt-1 font-mono text-xl text-accent">${candidate.amountDollars}</div>
          
          {/* Status */}
          {!locked ? (
            <div className="mt-4">
              <div className="font-mono text-4xl font-bold text-warning">{countdown}</div>
              <div className="text-[10px] text-muted-foreground">TARGETING</div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-[11px] font-bold text-accent">LOCKED</div>
              <div className="text-[10px] text-muted-foreground">HOLD TO CONFIRM</div>
            </div>
          )}
        </div>
        
        {/* Hold Progress Ring */}
        {locked && holdProgress > 0 && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
              strokeDasharray={`${holdProgress * 2.89} 289`}
            />
          </svg>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-16 left-0 right-0 z-50 flex flex-col items-center gap-4 px-6">
        {/* Confirm Button */}
        <button
          onMouseDown={() => locked && setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onMouseLeave={() => setIsHolding(false)}
          onTouchStart={() => locked && setIsHolding(true)}
          onTouchEnd={() => setIsHolding(false)}
          disabled={!locked}
          className={`w-full max-w-xs rounded-lg py-4 text-sm font-bold uppercase tracking-wider transition-all ${
            locked
              ? isSimulation
                ? "bg-warning text-background"
                : "bg-accent text-background"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {!locked ? "Acquiring Target..." : holdProgress > 0 ? `${holdProgress}%` : "Hold to Confirm"}
        </button>
        
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      
      {/* Info Panel */}
      <div className="absolute left-4 top-4 z-50 space-y-1 text-[10px] font-mono text-muted-foreground">
        <div>STRATEGY: {candidate.strategy}</div>
        <div>TRUST: {candidate.trustScore}/100</div>
        <div>WIN%: {candidate.winLikelihoodPct}%</div>
      </div>
      
      {/* Timestamp */}
      <div className="absolute right-4 top-4 z-50 font-mono text-[10px] text-muted-foreground">
        {new Date().toLocaleTimeString("en-US", { hour12: false })} ET
      </div>
    </div>
  )
}
