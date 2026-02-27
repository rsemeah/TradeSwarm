"use client"

import { getScoreColor } from "@/lib/utils"

interface GrowthScoreGaugeProps {
  score: number
  size?: number
}

export function GrowthScoreGauge({ score, size = 88 }: GrowthScoreGaugeProps) {
  const color = getScoreColor(score)
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score * circumference
  const offset = circumference - progress

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-label={`Growth Score: ${score.toFixed(2)}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono text-lg font-bold"
            style={{ color }}
          >
            {score.toFixed(2)}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">Growth Score</span>
    </div>
  )
}
