export type BrokerOrderStatus = "intent" | "placed" | "filled" | "canceled" | "failed"

export interface OrderIntent {
  tradeId?: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  orderType: "market" | "limit"
  limitPrice?: number
  idempotencyKey: string
}

export interface BrokerOrderReceipt {
  brokerOrderId: string
  provider: string
  mode: "paper" | "live"
  status: BrokerOrderStatus
  filledQuantity: number
  averageFillPrice: number
  raw?: Record<string, unknown>
}

export interface PositionSnapshot {
  symbol: string
  quantity: number
  avgPrice: number
  marketValue: number
  asOf: string
}

export interface IBroker {
  placeOrder(intent: OrderIntent): Promise<BrokerOrderReceipt>
  cancelOrder(orderId: string): Promise<void>
  getPosition(symbol: string): Promise<PositionSnapshot>
  healthCheck(): Promise<{ ok: boolean; latency_ms: number }>
}
