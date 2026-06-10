/**
 * Alpaca Broker Adapter
 * Capital War Room | Execution Division (T20)
 *
 * Paper account: PA3WMCEDJJS — $100k paper balance
 * Toggle: ALPACA_PAPER=true (paper) | ALPACA_PAPER=false (LIVE — requires T26 go/no-go)
 *
 * SAFETY: ALPACA_PAPER must be "false" explicitly to go live.
 * Default is paper. Fail-safe: if env var is missing, stays on paper.
 *
 * Keys required in .env:
 *   ALPACA_API_KEY=...
 *   ALPACA_SECRET_KEY=...
 *   ALPACA_PAPER=true
 */

import type {
  IBroker,
  BrokerAccount,
  BrokerOrder,
  BrokerPosition,
  PlaceOrderParams,
} from "./types"

const PAPER_BASE_URL = "https://paper-api.alpaca.markets/v2"
const LIVE_BASE_URL = "https://api.alpaca.markets/v2"

function getBaseUrl(): string {
  return process.env.ALPACA_PAPER !== "false" ? PAPER_BASE_URL : LIVE_BASE_URL
}

function getHeaders(): Record<string, string> {
  const key = process.env.ALPACA_API_KEY
  const secret = process.env.ALPACA_SECRET_KEY
  if (!key || !secret) throw new Error("ALPACA_API_KEY and ALPACA_SECRET_KEY must be set in .env")
  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
    "Content-Type": "application/json",
  }
}

async function alpacaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, { ...options, headers: getHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Alpaca API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export class AlpacaBroker implements IBroker {
  readonly brokerId = "alpaca"

  async isHealthy(): Promise<boolean> {
    try {
      await alpacaFetch("/account")
      return true
    } catch {
      return false
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await alpacaFetch<{
      id: string
      cash: string
      portfolio_value: string
      buying_power: string
      currency: string
    }>("/account")

    return {
      id: data.id,
      cash: parseFloat(data.cash),
      portfolioValue: parseFloat(data.portfolio_value),
      buyingPower: parseFloat(data.buying_power),
      currency: data.currency,
      isPaper: process.env.ALPACA_PAPER !== "false",
    }
  }

  async placeOrder(params: PlaceOrderParams): Promise<BrokerOrder> {
    const body = {
      symbol: params.ticker,
      qty: params.quantity,
      side: params.side,
      type: params.type,
      time_in_force: params.timeInForce ?? "day",
      ...(params.limitPrice ? { limit_price: String(params.limitPrice) } : {}),
      ...(params.requestId ? { client_order_id: params.requestId } : {}),
    }

    const data = await alpacaFetch<{
      id: string
      symbol: string
      side: string
      qty: string
      order_type: string
      status: string
      submitted_at: string
      filled_at?: string
      filled_avg_price?: string
      client_order_id?: string
    }>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    })

    return {
      id: data.id,
      ticker: data.symbol,
      side: data.side as "buy" | "sell",
      quantity: parseFloat(data.qty),
      type: data.order_type as BrokerOrder["type"],
      status: data.status as BrokerOrder["status"],
      submittedAt: data.submitted_at,
      filledAt: data.filled_at,
      filledPrice: data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined,
      requestId: data.client_order_id,
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await alpacaFetch(`/orders/${orderId}`, { method: "DELETE" })
  }

  async cancelAllOrders(): Promise<void> {
    await alpacaFetch("/orders", { method: "DELETE" })
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await alpacaFetch<Array<{
      symbol: string
      qty: string
      avg_entry_price: string
      current_price: string
      unrealized_pl: string
      market_value: string
    }>>("/positions")

    return data.map(p => ({
      ticker: p.symbol,
      quantity: parseFloat(p.qty),
      averageEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPL: parseFloat(p.unrealized_pl),
      marketValue: parseFloat(p.market_value),
    }))
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const data = await alpacaFetch<{
      id: string
      symbol: string
      side: string
      qty: string
      order_type: string
      status: string
      submitted_at: string
      filled_at?: string
      filled_avg_price?: string
    }>(`/orders/${orderId}`)

    return {
      id: data.id,
      ticker: data.symbol,
      side: data.side as "buy" | "sell",
      quantity: parseFloat(data.qty),
      type: data.order_type as BrokerOrder["type"],
      status: data.status as BrokerOrder["status"],
      submittedAt: data.submitted_at,
      filledAt: data.filled_at,
      filledPrice: data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined,
    }
  }
}

export const alpacaBroker = new AlpacaBroker()
