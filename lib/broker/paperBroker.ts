import { createHash } from "node:crypto"
import type { BrokerOrderReceipt, IBroker, OrderIntent, PositionSnapshot } from "@/lib/broker/IBroker"

export class PaperBroker implements IBroker {
  async placeOrder(intent: OrderIntent): Promise<BrokerOrderReceipt> {
    const brokerOrderId = createHash("sha256")
      .update(JSON.stringify(intent))
      .digest("hex")
      .slice(0, 20)

    return {
      brokerOrderId,
      provider: "paper",
      mode: "paper",
      status: "filled",
      filledQuantity: intent.quantity,
      averageFillPrice: intent.limitPrice ?? 0,
      raw: { simulated: true },
    }
  }

  async cancelOrder(_orderId: string): Promise<void> {
    return
  }

  async getPosition(symbol: string): Promise<PositionSnapshot> {
    return {
      symbol,
      quantity: 0,
      avgPrice: 0,
      marketValue: 0,
      asOf: new Date().toISOString(),
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latency_ms: number }> {
    return { ok: true, latency_ms: 0 }
  }
}
