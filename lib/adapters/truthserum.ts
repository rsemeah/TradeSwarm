import { TruthSerumFeaturesV1 } from "@/lib/types/proof-bundle"

export interface TruthSerumRequest {
  requestId: string
  features: TruthSerumFeaturesV1
  market_time?: string
}

export interface TruthSerumResponse {
  p_win: number
  expected_log_return: number
  variance?: number
  confidence?: number
  model_versions?: Record<string, string>
  features_version: "features_v1"
  raw?: Record<string, unknown>
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`TruthSerum timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}

export async function scoreWithTruthSerum(
  body: TruthSerumRequest,
  opts?: { timeoutMs?: number }
): Promise<TruthSerumResponse> {
  const url = process.env.TRUTH_SERUM_URL
  if (!url) {
    throw new Error("TRUTH_SERUM_URL is not configured")
  }

  const timeoutMs = opts?.timeoutMs ?? Number(process.env.TRUTH_SERUM_TIMEOUT_MS ?? 500)
  const token = process.env.TRUTH_SERUM_TOKEN

  const res = await withTimeout(
    fetch(`${url.replace(/\/$/, "")}/v1/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }),
    timeoutMs
  )

  if (!res.ok) {
    throw new Error(`TruthSerum request failed: ${res.status}`)
  }

  const parsed = (await res.json()) as TruthSerumResponse
  if (parsed.features_version !== "features_v1") {
    throw new Error(`Unexpected features version: ${parsed.features_version}`)
  }

  return parsed
}
