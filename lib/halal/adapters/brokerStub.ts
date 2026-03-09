// lib/halal/adapters/brokerStub.ts
// Simple stub adapter for external broker and data feeds.
// Marked STUBBED — replace with real implementations when available.

export async function getPaperPositions(_accountId?: string) {
  // Returns empty placeholder positions; TRUTH_STATUS is STUBBED upstream.
  return [] as Array<{ symbol: string; qty: number; market_value?: number }>;
}

export async function fetchDividendEvents(_ticker: string) {
  // No-op stub.
  return [] as Array<{ ex_date: string; pay_date?: string; dividend_per_share: number }>;
}

export default {
  getPaperPositions,
  fetchDividendEvents,
};
