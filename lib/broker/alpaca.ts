/**
 * lib/broker/alpaca.ts
 * Alpaca Markets order submission — paper and live.
 *
 * ALPACA_PAPER=true → paper-api.alpaca.markets (default, enforced until T33 gate)
 * ALPACA_PAPER=false → api.alpaca.markets (requires T33 approval by Ro)
 *
 * Auth: APCA-API-KEY-ID + APCA-API-SECRET-KEY headers.
 * Note: TradeSwarm currently uses options spread strategies.
 *       Equity market orders are supported here.
 *       Options legs require `legs` array — extend submitOptionsSpread() when ready.
 */

const ALPACA_PAPER_BASE = "https://paper-api.alpaca.markets"
const ALPACA_LIVE_BASE = "https://api.alpaca.markets"

function getBase(): string {
  const isPaper = process.env.ALPACA_PAPER !== "false"
  return isPaper ? ALPACA_PAPER_BASE : ALPACA_LIVE_BASE
}

function getHeaders(): HeadersInit {
  const key = process.env.ALPACA_API_KEY
  const secret = process.env.ALPACA_SECRET_KEY

  if (!key || key === "FILL_IN" || !secret || secret === "FILL_IN") {
    throw new Error("ALPACA_API_KEY or ALPACA_SECRET_KEY not configured")
  }

  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
    "Content-Type": "application/json",
  }
}

export interface AlpacaOrderResult {
  orderId: string
  clientOrderId: string
  status: string
  symbol: string
  side: "buy" | "sell"
  qty: number
  type: string
  filledAt: string | null
  filledQty: number | null
  filledAvgPrice: number | null
  isPaper: boolean
  raw: unknown
}

export interface AlpacaOrderError {
  ok: false
  error: string
  status: number
  body: string
}

export type AlpacaResult = ({ ok: true } & AlpacaOrderResult) | AlpacaOrderError

/**
 * Submit a market order for a single equity symbol.
 * Use notional for dollar-based sizing (fractional shares).
 */
export async function submitMarketOrder(params: {
  symbol: string
  side: "buy" | "sell"
  qty?: number
  notional?: number // dollar amount — preferred for TradeSwarm position sizing
  clientOrderId: string
}): Promise<AlpacaResult> {
  const base = getBase()
  const isPaper = process.env.ALPACA_PAPER !== "false"

  let headers: HeadersInit
  try {
    headers = getHeaders()
  } catch (err) {
    return { ok: false, error: String(err), status: 0, body: "" }
  }

  const body: Record<string, unknown> = {
    symbol: params.symbol,
    side: params.side,
    type: "market",
    time_in_force: "day",
    client_order_id: params.clientOrderId,
  }

  if (params.notional !== undefined) {
    body.notional = params.notional.toFixed(2)
  } else if (params.qty !== undefined) {
    body.qty = String(params.qty)
  } else {
    return { ok: false, error: "Must provide qty or notional", status: 0, body: "" }
  }

  try {
    const res = await fetch(`${base}/v2/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const text = await res.text()

    if (!res.ok) {
      return {
        ok: false,
        error: `Alpaca rejected order`,
        status: res.status,
        body: text,
      }
    }

    const data = JSON.parse(text)

    return {
      ok: true,
      orderId: data.id,
      clientOrderId: data.client_order_id,
      status: data.status,
      symbol: data.symbol,
      side: data.side,
      qty: Number(data.qty ?? 0),
      type: data.type,
      filledAt: data.filled_at ?? null,
      filledQty: data.filled_qty ? Number(data.filled_qty) : null,
      filledAvgPrice: data.filled_avg_price ? Number(data.filled_avg_price) : null,
      isPaper,
      raw: data,
    }
  } catch (err) {
    return {
      ok: false,
      error: `Alpaca fetch failed: ${String(err)}`,
      status: 0,
      body: "",
    }
  }
}

/**
 * Get order status by Alpaca order ID.
 */
export async function getOrder(
  orderId: string
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const base = getBase()
  let headers: HeadersInit
  try {
    headers = getHeaders()
  } catch (err) {
    return { ok: false, data: null, error: String(err) }
  }
  try {
    const res = await fetch(`${base}/v2/orders/${orderId}`, { headers })
    const data = await res.json()
    return { ok: res.ok, data, error: res.ok ? undefined : String(data) }
  } catch (err) {
    return { ok: false, data: null, error: String(err) }
  }
}

/**
 * Verify paper account is live — call this during startup/health check.
 */
export async function getAccount(): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const base = getBase()
  let headers: HeadersInit
  try {
    headers = getHeaders()
  } catch (err) {
    return { ok: false, data: null, error: String(err) }
  }
  try {
    const res = await fetch(`${base}/v2/account`, { headers })
    const data = await res.json()
    return { ok: res.ok, data, error: res.ok ? undefined : String(data) }
  } catch (err) {
    return { ok: false, data: null, error: String(err) }
  }
}

/**
 * STUB — options spread support.
 * Alpaca options use /v2/orders with order_class="mleg" + legs:[].
 * Wire this when the T33 paper run transitions to actual spread execution.
 */
export async function submitOptionsSpread(_params: {
  legs: Array<{ symbol: string; side: "buy" | "sell"; qty: number; ratio_qty?: number }>
  clientOrderId: string
  type: "market" | "limit"
  limitPrice?: number
}): Promise<AlpacaResult> {
  return {
    ok: false,
    error:
      "Options spread not yet implemented. Wire order_class=mleg when ready for T33 options paper run.",
    status: 0,
    body: "",
  }
}
