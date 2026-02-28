import { describe, expect, it } from "vitest";

import { TruthSerumAdapter } from "../../src/lib/adapters/truthserumAdapter";

describe("TruthSerumAdapter", () => {
  it("returns degraded when circuit is open", async () => {
    const adapter = new TruthSerumAdapter({
      baseUrl: "http://localhost:1",
      maxFailures: 1,
      circuitOpenMs: 60_000,
    });

    await adapter.score({
      symbol: "AAPL",
      asof_utc: new Date().toISOString(),
      spot: 180,
      dte: 7,
      strike: 180,
      option_type: "CALL",
      mid: 1.23,
    });

    const out = await adapter.score({
      symbol: "AAPL",
      asof_utc: new Date().toISOString(),
      spot: 180,
      dte: 7,
      strike: 180,
      option_type: "CALL",
      mid: 1.23,
    });

    expect(out.ok).toBe(false);
    expect(out.reasons).toContain("truthserum_circuit_open");
  });
});
