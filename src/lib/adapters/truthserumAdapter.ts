import { z } from "zod";

export const FeaturesV1Schema = z.object({
  symbol: z.string().min(1),
  asof_utc: z.string().datetime(),

  spot: z.number().positive(),
  trend: z.enum(["UP", "DOWN", "SIDEWAYS"]).optional(),
  volatility_regime: z.enum(["LOW", "MED", "HIGH"]).optional(),

  dte: z.number().int().nonnegative(),
  strike: z.number().positive(),
  option_type: z.enum(["CALL", "PUT"]),
  mid: z.number().nonnegative(),
  bid: z.number().nonnegative().optional(),
  ask: z.number().nonnegative().optional(),
  spread_pct: z.number().nonnegative().optional(),

  volume: z.number().int().nonnegative().optional(),
  open_interest: z.number().int().nonnegative().optional(),

  iv: z.number().nonnegative().optional(),
  delta: z.number().optional(),
  gamma: z.number().optional(),
  theta: z.number().optional(),
  vega: z.number().optional(),

  earnings_within_days: z.number().int().nonnegative().optional(),
  news_risk: z.enum(["LOW", "MED", "HIGH"]).optional(),
});

export type FeaturesV1 = z.infer<typeof FeaturesV1Schema>;

export const TruthScoreSchema = z.object({
  ok: z.boolean(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  model: z
    .object({
      name: z.string(),
      version: z.string().optional(),
    })
    .optional(),
  determinism_hash: z.string().optional(),
});

export type TruthScore = z.infer<typeof TruthScoreSchema>;

type TruthSerumAdapterOptions = {
  baseUrl: string;
  timeoutMs?: number;
  circuitOpenMs?: number;
  maxFailures?: number;
};

type CircuitState = {
  failures: number;
  openUntil: number;
};

const DEFAULTS = {
  timeoutMs: 450,
  circuitOpenMs: 15_000,
  maxFailures: 3,
};

export class TruthSerumAdapter {
  private baseUrl: string;
  private timeoutMs: number;
  private circuitOpenMs: number;
  private maxFailures: number;
  private circuit: CircuitState = { failures: 0, openUntil: 0 };

  constructor(opts: TruthSerumAdapterOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;
    this.circuitOpenMs = opts.circuitOpenMs ?? DEFAULTS.circuitOpenMs;
    this.maxFailures = opts.maxFailures ?? DEFAULTS.maxFailures;
  }

  isCircuitOpen(now = Date.now()) {
    return now < this.circuit.openUntil;
  }

  private tripCircuit(now = Date.now()) {
    this.circuit.openUntil = now + this.circuitOpenMs;
  }

  private recordSuccess() {
    this.circuit.failures = 0;
    this.circuit.openUntil = 0;
  }

  private recordFailure() {
    this.circuit.failures += 1;
    if (this.circuit.failures >= this.maxFailures) {
      this.tripCircuit();
    }
  }

  async health(): Promise<{ ok: boolean; service?: unknown; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: "GET" });
      if (!res.ok) {
        return { ok: false, error: `health_http_${res.status}` };
      }
      const json = await res.json();
      return { ok: true, service: json };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "health_error",
      };
    }
  }

  async score(features: FeaturesV1): Promise<TruthScore> {
    const parsed = FeaturesV1Schema.safeParse(features);
    if (!parsed.success) {
      return {
        ok: false,
        score: 0,
        reasons: ["features_invalid"],
        warnings: parsed.error.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`),
      };
    }

    if (this.isCircuitOpen()) {
      return {
        ok: false,
        score: 0,
        reasons: ["truthserum_circuit_open"],
        warnings: ["degraded_truthserum_unavailable"],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features_v1: parsed.data }),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.recordFailure();
        return {
          ok: false,
          score: 0,
          reasons: [`truthserum_http_${res.status}`],
          warnings: ["degraded_truthserum_error"],
        };
      }

      const json = await res.json();
      const out = TruthScoreSchema.safeParse(json);
      if (!out.success) {
        this.recordFailure();
        return {
          ok: false,
          score: 0,
          reasons: ["truthserum_bad_shape"],
          warnings: out.error.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`),
        };
      }

      this.recordSuccess();
      return out.data;
    } catch (error) {
      this.recordFailure();
      const isAbort = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        score: 0,
        reasons: [isAbort ? "truthserum_timeout" : "truthserum_network_error"],
        warnings: ["degraded_truthserum_unavailable"],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
