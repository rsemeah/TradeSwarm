import macroCalendar from './macroCalendar.json'

interface MacroFlags {
  earnings_within_dte: boolean
  fomc_within_5d: boolean
  cpi_within_3d: boolean
  nfp_within_3d: boolean
}

function daysUntil(date: string): number {
  const target = new Date(date)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
}

export function getMacroFlags(earningsDate?: string, dte = 30): MacroFlags {
  const inWindow = (date: string, maxDays: number) => {
    const delta = daysUntil(date)
    return delta >= 0 && delta <= maxDays
  }

  return {
    earnings_within_dte: Boolean(earningsDate && inWindow(earningsDate, dte)),
    fomc_within_5d: (macroCalendar.fomc as string[]).some((d) => inWindow(d, 5)),
    cpi_within_3d: (macroCalendar.cpi as string[]).some((d) => inWindow(d, 3)),
    nfp_within_3d: (macroCalendar.nfp as string[]).some((d) => inWindow(d, 3)),
  }
}
