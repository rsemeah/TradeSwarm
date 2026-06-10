/**
 * Coinbase Advanced Trade Broker Adapter
 * Capital War Room | Execution Division (T21)
 *
 * Keys required in .env:
 *   COINBASE_API_KEY=...         (CDP API key name)
 *   COINBASE_API_SECRET=...      (CDP private key — PEM format)
 *
 * Note: Coinbase Advanced Trade uses JWT auth (CDP keys), not basic API keys.
 * T12 verification required before this adapter is used in production.
 */

import type {
  IBroker,
  BrokerAccount,
  BrokerOrder,
  BrokerPosition,
  PlaceOrderParams,
} from "./types"

const COINBASE_BASE_URL = "https://api.coinbase.com/api/v3/brokerage"

/**
 * Coinbase Advanced Trade uses CDP JWT authentication.
 * For now this adapter uses API key header auth (legacy).
 * Update to JWT when CDP credentials are confirmed (T12).
 */
function getHeaders(): Record<string, string> {
  const key = process.env.COINBASE_API_KEY
  const secret = process.env.COINBASE_API_SECRET
  if (!key || !secret) {
    throw new Error("COINBASE_API_KEY and COINBASE_API_SECRET must be set in .env")
  }
  return {
    "CB-ACCESS-KEY": key,
    "CB-ACCESS-SIGN": secret, // TODO: replace with proper JWT signing (T12)
    "Content-Type": "application/json",
  }
}

async function coinbaseFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${COINBASE_BASE_URL}${path}`
  const res = await fetch(url, { ...options, headers: getHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Coinbase API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export class CoinbaseBroker implements IBroker {
  readonly brokerId = "coinbase"

  async isHealthy(): Promise<boolean> {
    try {
      await coinbaseFetch("/accounts")
      return true
    } catch {
      return false
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    // Coinbase returns multiple accounts (one per currency)
    // We return the USD account summary
    const data = await coinbaseFetch<{
      accounts: Array<{
        uuid: string
        currency: string
        available_balance: { value: string; currency: string }
        hold: { value: string; currency: string }
      }>
    }>("/accounts")

    const usd = data.accounts.find(a => a.currency === "USD") ?? data.accounts[0]

    return {
      id: usd?.uuid ?? "unknown",
      cash: parseFloat(usd?.available_balance?.value ?? "0"),
      portfolioValue: parseFloat(usd?.available_balance?.value ?? "0"),
      buyingPower: parseFloat(usd?.available_balance?.value ?? "0"),
      currency: "USD",
      isPaper: false, // Coinbase Advanced Trade has no paper mode
    }
  }

  async placeOrder(params: PlaceOrderParams): Promise<BrokerOrder> {
    // Coinbase uses product_id format: BTC-USD, ETH-USD
    const productId = params.ticker.includes("-") ? params.ticker : `${params.ticker}-USD`

    const body = {
      client_order_id: params.requestId ?? crypto.randomUUID(),
      product_id: productId,
      side: params.side.toUpperCase(),
      order_configuration:
        params.type === "market"
          ? { market_market_ioc: { base_size: String(params.quantity) } }
          : {
              limit_limit_gtc: {
                base_size: String(params.quantity),
                limit_price: String(params.limitPrice),
              },
            },
    }

    const data = await coinbaseFetch<{
      success: boolean
      order_id: string
      success_response?: {
        order_id: string
        product_id: string
        side: string
        client_order_id: string
      }
      error_response?: { error: string; message: string }
    }>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (!data.success) {
      throw new Error(`Coinbase order failed: ${data.error_response?.message ?? "unknown error"}`)
    }

    const orderId = data.success_response?.order_id ?? data.order_id

    return {
      id: orderId,
      ticker: productId,
      side: params.side,
      quantity: params.quantity,
      type: params.type,
      status: "pending",
      submittedAt: new Date().toISOString(),
      requestId: params.requestId,
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await coinbaseFetch("/orders/batch_cancel", {
      method: "POST",
      body: JSON.stringify({ order_ids: [orderId] }),
    })
  }

  async cancelAllOrders(): Promise<void> {
    // Fetch open orders then cancel all
    const data = await coinbaseFetch<{
      orders: Array<{ order_id: string }>
    }>("/orders/historical/batch?order_status=OPEN")

    const orderIds = data.orders.map(o => o.order_id)
    if (orderIds.length === 0) return

    await coinbaseFetch("/orders/batch_cancel", {
      method: "POST",
      body: JSON.stringify({ order_ids: orderIds }),
    })
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await coinbaseFetch<{
      accounts: Array<{
        currency: string
        available_balance: { value: string }
        hold: { value: string }
      }>
    }>("/accounts")

    return data.accounts
      .filter(a => a.currency !== "USD" && parseFloat(a.available_balance.value) > 0)
      .map(a => ({
        ticker: `${a.currency}-USD`,
        quantity: parseFloat(a.available_balance.value),
        averageEntryPrice: 0, // Not available from accounts endpoint
        currentPrice: 0,      // Requires separate quote fetch
        unrealizedPL: 0,
        marketValue: 0,
      }))
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const data = await coinbaseFetch<{
      order: {
        order_id: string
        product_id: string
        side: string
        filled_size: string
        order_type: string
        status: string
        created_time: string
        completion_percentage: string
        average_filled_price: string
      }
    }>(`/orders/historical/${orderId}`)

    const o = data.order
    return {
      id: o.order_id,
      ticker: o.product_id,
      side: o.side.toLowerCase() as "buy" | "sell",
      quantity: parseFloat(o.filled_size),
      type: o.order_type.toLowerCase() as BrokerOrder["type"],
      status: o.status.toLowerCase() as BrokerOrder["status"],
      submittedAt: o.created_time,
      filledPrice: parseFloat(o.average_filled_price) || undefined,
    }
  }
}

export const coinbaseBroker = new CoinbaseBroker()
