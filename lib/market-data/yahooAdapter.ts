export type YahooEndpoint = "query1" | "query2"

export interface AdapterDiagnostics {
  latencyMs: number
  cacheHit: boolean
  endpointUsed: YahooEndpoint | "cache" | null
  attempts: number
  degraded: boolean
}

export type YahooAdapterErrorReason =
  | "RATE_LIMITED"
  | "INVALID_SYMBOL"
  | "INVALID_EXPIRATION"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "NO_DATA"
  | "SCHEMA_ERROR"
  | "UPSTREAM_UNAVAILABLE"

export interface YahooAdapterError {
  reason: YahooAdapterErrorReason
  message: string
  retryable: boolean
  statusCode?: number
  endpoint?: YahooEndpoint
}

export interface AdapterSuccess<T> {
  ok: true
  data: T
  diagnostics: AdapterDiagnostics
}

export interface AdapterFailure {
  ok: false
  error: YahooAdapterError
  diagnostics: AdapterDiagnostics
}

export type AdapterResult<T> = AdapterSuccess<T> | AdapterFailure

export interface YahooQuote {
  symbol: string
  shortName?: string
  currency?: string
  regularMarketPrice: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketTime?: number
}

export interface YahooOptionContract {
  contractSymbol: string
  strike: number
  lastPrice: number
  bid: number
  ask: number
  volume: number
  openInterest: number
  impliedVolatility: number
  inTheMoney: boolean
  expiration: number
  lastTradeDate?: number
}

export interface YahooOptionChain {
  symbol: string
  expiration: number
  underlyingPrice?: number
  calls: YahooOptionContract[]
  puts: YahooOptionContract[]
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface AdapterConfig {
  requestTimeoutMs: number
  quoteTtlMs: number
  expirationsTtlMs: number
  optionChainTtlMs: number
  bucketCapacity: number
  refillPerSecond: number
}

const DEFAULT_CONFIG: AdapterConfig = {
  requestTimeoutMs: 6000,
  quoteTtlMs: 5_000,
  expirationsTtlMs: 5 * 60_000,
  optionChainTtlMs: 20_000,
  bucketCapacity: 8,
  refillPerSecond: 4,
}

class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  async take(count: number = 1): Promise<void> {
    while (true) {
      this.refill()
      if (this.tokens >= count) {
        this.tokens -= count
        return
      }

      const missing = count - this.tokens
      const waitMs = Math.max(25, (missing / this.refillPerSecond) * 1000)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }

  private refill(): void {
    const now = Date.now()
    if (now <= this.lastRefill) return

    const elapsedSeconds = (now - this.lastRefill) / 1000
    const refillAmount = elapsedSeconds * this.refillPerSecond
    this.tokens = Math.min(this.capacity, this.tokens + refillAmount)
    this.lastRefill = now
  }
}

class YahooMarketDataAdapter {
  private readonly endpoints: ReadonlyArray<{ id: YahooEndpoint; baseUrl: string }> = [
    { id: "query2", baseUrl: "https://query2.finance.yahoo.com" },
    { id: "query1", baseUrl: "https://query1.finance.yahoo.com" },
  ]

  private readonly config: AdapterConfig
  private readonly bucket: TokenBucket
  private readonly quoteCache = new Map<string, CacheEntry<YahooQuote>>()
  private readonly expirationsCache = new Map<string, CacheEntry<number[]>>()
  private readonly chainCache = new Map<string, CacheEntry<YahooOptionChain>>()

  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.bucket = new TokenBucket(this.config.bucketCapacity, this.config.refillPerSecond)
  }

  async getQuote(symbol: string): Promise<AdapterResult<YahooQuote>> {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized) {
      return this.fail("INVALID_SYMBOL", "Symbol is required.", false)
    }

    const cacheKey = normalized
    const cached = this.readCache(this.quoteCache, cacheKey)
    if (cached) {
      return this.success(cached, {
        latencyMs: 0,
        cacheHit: true,
        endpointUsed: "cache",
        attempts: 0,
        degraded: false,
      })
    }

    return this.fetchWithFallback<YahooQuote>({
      resourceName: "quote",
      requestPathFactory: () => `/v7/finance/quote?symbols=${encodeURIComponent(normalized)}`,
      parse: (payload) => {
        const quote = this.asRecord(this.readPath(payload, ["quoteResponse", "result", 0]))
        if (!quote || typeof quote.regularMarketPrice !== "number") {
          return { ok: false as const, reason: "NO_DATA" as const, message: `No quote data found for ${normalized}.` }
        }

        return {
          ok: true as const,
          value: {
            symbol: typeof quote.symbol === "string" ? quote.symbol : normalized,
            shortName: typeof quote.shortName === "string" ? quote.shortName : undefined,
            currency: typeof quote.currency === "string" ? quote.currency : undefined,
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: typeof quote.regularMarketChange === "number" ? quote.regularMarketChange : undefined,
            regularMarketChangePercent:
              typeof quote.regularMarketChangePercent === "number" ? quote.regularMarketChangePercent : undefined,
            regularMarketTime: typeof quote.regularMarketTime === "number" ? quote.regularMarketTime : undefined,
          },
        }
      },
      onSuccess: (value) => this.writeCache(this.quoteCache, cacheKey, value, this.config.quoteTtlMs),
    })
  }

  async getExpirations(symbol: string): Promise<AdapterResult<number[]>> {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized) {
      return this.fail("INVALID_SYMBOL", "Symbol is required.", false)
    }

    const cacheKey = normalized
    const cached = this.readCache(this.expirationsCache, cacheKey)
    if (cached) {
      return this.success(cached, {
        latencyMs: 0,
        cacheHit: true,
        endpointUsed: "cache",
        attempts: 0,
        degraded: false,
      })
    }

    return this.fetchWithFallback<number[]>({
      resourceName: "expirations",
      requestPathFactory: () => `/v7/finance/options/${encodeURIComponent(normalized)}`,
      parse: (payload) => {
        const expirationDates = this.readPath(payload, ["optionChain", "result", 0, "expirationDates"])
        if (!Array.isArray(expirationDates)) {
          return {
            ok: false as const,
            reason: "NO_DATA" as const,
            message: `No expiration dates found for ${normalized}.`,
          }
        }

        const values = expirationDates.filter((v: unknown): v is number => typeof v === "number")
        if (values.length === 0) {
          return {
            ok: false as const,
            reason: "NO_DATA" as const,
            message: `No expiration dates found for ${normalized}.`,
          }
        }

        return { ok: true as const, value: values }
      },
      onSuccess: (value) => this.writeCache(this.expirationsCache, cacheKey, value, this.config.expirationsTtlMs),
    })
  }

  async getOptionChain(symbol: string, expiration: number): Promise<AdapterResult<YahooOptionChain>> {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized) {
      return this.fail("INVALID_SYMBOL", "Symbol is required.", false)
    }
    if (!Number.isInteger(expiration) || expiration <= 0) {
      return this.fail("INVALID_EXPIRATION", "Expiration must be a unix timestamp in seconds.", false)
    }

    const cacheKey = `${normalized}:${expiration}`
    const cached = this.readCache(this.chainCache, cacheKey)
    if (cached) {
      return this.success(cached, {
        latencyMs: 0,
        cacheHit: true,
        endpointUsed: "cache",
        attempts: 0,
        degraded: false,
      })
    }

    return this.fetchWithFallback<YahooOptionChain>({
      resourceName: "optionChain",
      requestPathFactory: () =>
        `/v7/finance/options/${encodeURIComponent(normalized)}?date=${encodeURIComponent(String(expiration))}`,
      parse: (payload) => {
        const result = this.asRecord(this.readPath(payload, ["optionChain", "result", 0]))
        const optionsRoot = this.asRecord(result?.options)
        const options = Array.isArray(result?.options) ? this.asRecord(result.options[0]) : optionsRoot
        if (!result || !options) {
          return {
            ok: false as const,
            reason: "NO_DATA" as const,
            message: `No option chain found for ${normalized} @ ${expiration}.`,
          }
        }

        const calls = this.parseContracts(options.calls)
        const puts = this.parseContracts(options.puts)
        const quote = this.asRecord(result.quote)

        return {
          ok: true as const,
          value: {
            symbol: typeof quote?.symbol === "string" ? quote.symbol : normalized,
            expiration,
            underlyingPrice: typeof quote?.regularMarketPrice === "number" ? quote.regularMarketPrice : undefined,
            calls,
            puts,
          },
        }
      },
      onSuccess: (value) => this.writeCache(this.chainCache, cacheKey, value, this.config.optionChainTtlMs),
    })
  }

  private parseContracts(input: unknown): YahooOptionContract[] {
    if (!Array.isArray(input)) return []

    const contracts: YahooOptionContract[] = []

    for (const contract of input) {
      if (!contract || typeof contract !== "object") continue

      const record = contract as Record<string, unknown>
      if (typeof record.contractSymbol !== "string" || typeof record.strike !== "number") {
        continue
      }

      const parsed: YahooOptionContract = {
        contractSymbol: record.contractSymbol,
        strike: record.strike,
        lastPrice: typeof record.lastPrice === "number" ? record.lastPrice : 0,
        bid: typeof record.bid === "number" ? record.bid : 0,
        ask: typeof record.ask === "number" ? record.ask : 0,
        volume: typeof record.volume === "number" ? record.volume : 0,
        openInterest: typeof record.openInterest === "number" ? record.openInterest : 0,
        impliedVolatility: typeof record.impliedVolatility === "number" ? record.impliedVolatility : 0,
        inTheMoney: Boolean(record.inTheMoney),
        expiration: typeof record.expiration === "number" ? record.expiration : 0,
      }

      if (typeof record.lastTradeDate === "number") {
        parsed.lastTradeDate = record.lastTradeDate
      }

      contracts.push(parsed)
    }

    return contracts
  }


  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object") return null
    return value as Record<string, unknown>
  }

  private readPath(payload: unknown, path: Array<string | number>): unknown {
    let current: unknown = payload

    for (const key of path) {
      if (current === null || current === undefined) return undefined

      if (typeof key === "number") {
        if (!Array.isArray(current)) return undefined
        current = current[key]
        continue
      }

      if (typeof current !== "object") return undefined
      current = (current as Record<string, unknown>)[key]
    }

    return current
  }

  private async fetchWithFallback<T>(params: {
    resourceName: string
    requestPathFactory: () => string
    parse: (
      payload: unknown,
    ) => { ok: true; value: T } | { ok: false; reason: Extract<YahooAdapterErrorReason, "NO_DATA" | "SCHEMA_ERROR">; message: string }
    onSuccess: (value: T) => void
  }): Promise<AdapterResult<T>> {
    const startedAt = Date.now()
    const path = params.requestPathFactory()

    let attempts = 0
    let lastError: YahooAdapterError | null = null

    for (const endpoint of this.endpoints) {
      attempts += 1
      await this.bucket.take(1)

      const response = await this.fetchJson(`${endpoint.baseUrl}${path}`)
      if (!response.ok) {
        lastError = {
          ...response.error,
          endpoint: endpoint.id,
        }
        continue
      }

      const parsed = params.parse(response.data)
      if (!parsed.ok) {
        lastError = {
          reason: parsed.reason,
          message: parsed.message,
          retryable: false,
          endpoint: endpoint.id,
        }
        continue
      }

      params.onSuccess(parsed.value)
      return this.success(parsed.value, {
        latencyMs: Date.now() - startedAt,
        cacheHit: false,
        endpointUsed: endpoint.id,
        attempts,
        degraded: attempts > 1,
      })
    }

    return {
      ok: false,
      error:
        lastError ?? {
          reason: "UPSTREAM_UNAVAILABLE",
          message: `Failed to fetch ${params.resourceName} from all Yahoo endpoints.`,
          retryable: true,
        },
      diagnostics: {
        latencyMs: Date.now() - startedAt,
        cacheHit: false,
        endpointUsed: lastError?.endpoint ?? null,
        attempts,
        degraded: true,
      },
    }
  }

  private async fetchJson(url: string): Promise<{ ok: true; data: unknown } | { ok: false; error: YahooAdapterError }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        return {
          ok: false,
          error: {
            reason: response.status === 404 ? "INVALID_SYMBOL" : "HTTP_ERROR",
            message: `Yahoo API responded with status ${response.status}.`,
            retryable: response.status >= 500 || response.status === 429,
            statusCode: response.status,
          },
        }
      }

      const body = await response.json()
      return { ok: true, data: body }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error"
      const rateLimited = message.toLowerCase().includes("429")

      return {
        ok: false,
        error: {
          reason: rateLimited ? "RATE_LIMITED" : "NETWORK_ERROR",
          message,
          retryable: true,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private readCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
    const cached = store.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      store.delete(key)
      return null
    }

    return cached.value
  }

  private writeCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  private success<T>(data: T, diagnostics: AdapterDiagnostics): AdapterSuccess<T> {
    return {
      ok: true,
      data,
      diagnostics,
    }
  }

  private fail(reason: YahooAdapterErrorReason, message: string, retryable: boolean): AdapterFailure {
    return {
      ok: false,
      error: {
        reason,
        message,
        retryable,
      },
      diagnostics: {
        latencyMs: 0,
        cacheHit: false,
        endpointUsed: null,
        attempts: 0,
        degraded: true,
      },
    }
  }
}

export const yahooAdapter = new YahooMarketDataAdapter()

export {
  YahooMarketDataAdapter,
}
