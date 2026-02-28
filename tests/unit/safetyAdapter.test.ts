import { describe, expect, it } from "vitest";

import { DefaultSafetyPolicy, evaluateSafety } from "../../src/lib/adapters/safetyAdapter";

describe("SafetyAdapter", () => {
  it("blocks execute on low OI/volume", () => {
    const out = evaluateSafety(
      {
        symbol: "TSLA",
        asof_utc: new Date().toISOString(),
        spot: 200,
        dte: 3,
        strike: 210,
        option_type: "CALL",
        mid: 0.5,
        open_interest: 10,
        volume: 0,
        spread_pct: 0.2,
      },
      DefaultSafetyPolicy
    );

    expect(out.allow_execute).toBe(false);
    expect(out.reasons.length).toBeGreaterThan(0);
  });
});
