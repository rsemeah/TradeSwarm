/**
 * IBroker — Shared Broker Interface
 * Capital War Room | Execution Division
 *
 * All broker adapters (Alpaca, Coinbase) must implement this interface.
 * Execution Division agents operate against IBroker only — never broker-specific APIs directly.
 */

export interface BrokerAccount {
  id: string
  cash: number
  portfolioValue: number
  buyingPower: number
  currency: string
  isPaper: boolean
}

export interface BrokerOrder {
  id: string
  ticker: string
  side: "buy" | "sell"
  quantity: number
  type: "market" | "limit" | "stop" | "stop_limit"
  status: "pending" | "filled" | "cancelled" | "rejected" | "partial"
  filledAt?: string      // ISO 8601
  filledPrice?: number
  submittedAt: string    // ISO 8601
  requestId?: string     // TruthCal™ linkage
}

export interface BrokerPosition {
  ticker: string
  quantity: number
  averageEntryPrice: number
  currentPrice: number
  unrealizedPL: number
  marketValue: number
}

export interface PlaceOrderParams {
  ticker: string
  side: "buy" | "sell"
  quantity: number
  type: "market" | "limit"
  limitPrice?: number
  requestId?: string     // Links order to TruthCal™ receipt
  timeInForce?: "day" | "gtc" | "ioc" | "fok"
}

export interface IBroker {
  /** Broker identifier */
  readonly brokerId: string

  /** Returns true if connection + credentials are healthy */
  isHealthy(): Promise<boolean>

  /** Get account summary */
  getAccount(): Promise<BrokerAccount>

  /** Place an order — returns immediately with submitted order */
  placeOrder(params: PlaceOrderParams): Promise<BrokerOrder>

  /** Cancel an open order by ID */
  cancelOrder(orderId: string): Promise<void>

  /** Cancel ALL open orders — used by kill switch (T29) */
  cancelAllOrders(): Promise<void>

  /** Get current open positions */
  getPositions(): Promise<BrokerPosition[]>

  /** Get order status by ID */
  getOrder(orderId: string): Promise<BrokerOrder>
}
