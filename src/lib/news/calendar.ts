export interface CalendarEvent {
  type: 'FOMC' | 'CPI' | 'NFP'
  date: string
}

const CALENDAR: CalendarEvent[] = [
  { type: 'FOMC', date: '2026-03-18' },
  { type: 'CPI', date: '2026-03-12' },
  { type: 'NFP', date: '2026-03-06' },
]

const daysTo = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)

export function macroPenalty(): { fomc: boolean; cpi: boolean; nfp: boolean; penalty: number } {
  let penalty = 0
  const fomc = CALENDAR.some((e) => e.type === 'FOMC' && daysTo(e.date) <= 5 && daysTo(e.date) >= 0)
  const cpi = CALENDAR.some((e) => e.type === 'CPI' && daysTo(e.date) <= 3 && daysTo(e.date) >= 0)
  const nfp = CALENDAR.some((e) => e.type === 'NFP' && daysTo(e.date) <= 3 && daysTo(e.date) >= 0)

  if (fomc) penalty += 0.1
  if (cpi) penalty += 0.08
  if (nfp) penalty += 0.06

  return { fomc, cpi, nfp, penalty: Math.min(0.25, penalty) }
}
