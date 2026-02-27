import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score: number): string {
  if (score > 0.6) return "#00ff88"
  if (score >= 0.4) return "#ffcc00"
  return "#ff4444"
}

export function getDrawdownColor(current: number, max: number): string {
  const percentage = (current / max) * 100
  if (percentage < 53) return "#00ff88" // < 8% of 15%
  if (percentage < 80) return "#ffcc00" // 8-12% of 15%
  return "#ff4444"
}
