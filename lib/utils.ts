import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getStatusColor(status: "GO" | "WAIT" | "NO"): string {
  switch (status) {
    case "GO":
      return "#00ff88"
    case "WAIT":
      return "#ffcc00"
    case "NO":
      return "#ff4444"
  }
}

export function getTrustScoreColor(score: number): string {
  if (score >= 60) return "#00ff88"
  if (score >= 40) return "#ffcc00"
  return "#ff4444"
}
