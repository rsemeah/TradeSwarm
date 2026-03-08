import type { BrokerOrderReceipt, IBroker, OrderIntent } from "@/lib/broker/IBroker"
import { PaperBroker } from "@/lib/broker/paperBroker"

export type BrokerProvider = "paper" | "schwab"

export class BrokerRouter {
  private readonly brokers: Record<BrokerProvider, IBroker>

  constructor(overrides?: Partial<Record<BrokerProvider, IBroker>>) {
    this.brokers = {
      paper: overrides?.paper ?? new PaperBroker(),
      schwab: overrides?.schwab ?? new PaperBroker(),
    }
  }

  async placeOrder(intent: OrderIntent, provider: BrokerProvider = "paper"): Promise<BrokerOrderReceipt> {
    return this.brokers[provider].placeOrder(intent)
  }

  async healthCheck(provider: BrokerProvider): Promise<{ ok: boolean; latency_ms: number }> {
    return this.brokers[provider].healthCheck()
  }
}
