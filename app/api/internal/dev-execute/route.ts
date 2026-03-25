import { runCanonicalTrade } from '@/lib/engine/runCanonicalTrade'
import { sha256Hex, seed32 } from '@/lib/utils/stableHash'
import { getReplay, setReplay } from '@/lib/replay/devReplayStore'
import { canonicalizeMarketSnapshot } from '@/lib/market/canonicalizeMarketSnapshot'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Forbidden - dev only' }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const replayParam = url.searchParams.get('replay')
    const rawKeyParam = url.searchParams.get('key')

    const body = await req.json()
    const ticker = String(body.ticker ?? body.symbol ?? '').toUpperCase()
    const strategy = body.strategy ?? body.theme ?? body.strategy
    const modeInput = String(body.mode ?? 'paper')
    const userId = String(body.userId ?? body.user_id ?? 'dev-user')
    const amount = Number(body.amount ?? 100)

    if (!ticker) {
      return Response.json({ error: 'ticker is required' }, { status: 400 })
    }

    // Map `paper` to execute for persistence tests
    const mode = modeInput === 'preview' ? 'preview' : modeInput === 'simulate' ? 'simulate' : 'execute'

    // Build a canonical input snapshot matching runCanonicalTrade's shape (no mode)
    const normalizedInputSnapshot = {
      ticker,
      requested_amount: amount,
      balance: Number(body.balance ?? 10000),
      safety_mode: String(body.safetyMode ?? 'training_wheels'),
      theme: strategy,
      user_context: body.marketContext ?? body.userContext ?? null,
    }

    const inputHash = sha256Hex(normalizedInputSnapshot)
    const engineVersion = process.env.ENGINE_VERSION ?? 'dev'
    const configHash = process.env.CONFIG_HASH ?? 'dev-config'

    const headerKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || rawKeyParam || 'dev-default'
    const rawKey = String(headerKey)
    const key = sha256Hex({ rawKey, inputHash, configHash, engineVersion }).slice(0, 24)

    // If replay requested and we have an entry, return the stored determinism info
    const wantReplay = replayParam === '1' || replayParam === 'true'
    if (wantReplay) {
      const entry = getReplay(key)
      if (entry) {
        // Ensure input/config/engine match
        if (entry.inputHash === inputHash && entry.configHash === configHash && entry.engineVersion === engineVersion) {
              const determinism_base = {
                  input_snapshot: normalizedInputSnapshot,
                  market_snapshot_hash: entry.marketSnapshotHash,
                  engine_version: entry.engineVersion,
                  config_hash: entry.configHash,
                  random_seed: entry.seed,
                }

                const determinism_hash = sha256Hex(determinism_base)

          return Response.json({
            success: true,
            mode: 'replay',
            key,
            determinism_hash,
            random_seed: entry.seed,
            market_snapshot_hash: entry.marketSnapshotHash,
            input_snapshot: normalizedInputSnapshot,
            market_snapshot: entry.marketSnapshot,
          })
        }

        return Response.json({ error: 'Replay key exists but input/config/engine mismatch' }, { status: 409 })
      }
    }

    // No replay hit - run the normal canonical flow and optionally record if replay requested
    const result = await runCanonicalTrade({
      mode,
      ticker,
      userId,
      amount,
      balance: Number(body.balance ?? 10000),
      safetyMode: String(body.safetyMode ?? 'training_wheels'),
      theme: strategy,
      userContext: body.marketContext ?? body.userContext ?? null,
    })

    const canonical = result.proofBundle

    // derive deterministic pieces for storage/return
    const det: any = canonical?.metadata?.determinism ?? {}
    const randomSeed = det.random_seed ?? det.monte_carlo_seed ?? null
    const marketSnapshotRaw = canonical?.market_snapshot ?? null
    const marketSnapshotCanon = canonicalizeMarketSnapshot(marketSnapshotRaw)
    const marketSnapshotHash = sha256Hex(marketSnapshotCanon)
    const determinism_hash = det.determinism_hash ?? sha256Hex({ input_snapshot: normalizedInputSnapshot, market_snapshot_hash: marketSnapshotHash, engine_version: det.engine_version ?? engineVersion, config_hash: det.config_hash ?? configHash, random_seed: randomSeed })

    if (wantReplay) {
      setReplay(key, {
        createdAtUtc: new Date().toISOString(),
        inputHash,
        configHash,
        engineVersion,
        seed: Number(randomSeed ?? seed32({ inputHash, configHash, engineVersion })),
        marketSnapshot: marketSnapshotCanon,
        marketSnapshotHash,
        determinismHash: determinism_hash,
      })
    }
    return Response.json({
      success: true,
      mode: wantReplay ? 'record' : 'normal',
      key,
      blocked: result.blocked,
      receiptId: result.receiptId,
      tradeId: result.tradeId,
      determinism_hash,
      random_seed: randomSeed,
      market_snapshot_hash: marketSnapshotHash,
      regime: canonical?.regime_snapshot ?? null,
      probability: canonical?.consensus_score ?? null,
      trust_score: canonical?.trust_score ?? null,
      kelly_fraction: canonical?.risk_snapshot?.kellyFraction ?? canonical?.risk_snapshot?.kelly_fraction ?? null,
      position_size: canonical?.risk_snapshot?.positionSizeRecommended ?? canonical?.risk_snapshot?.position_size_recommended ?? null,
      snapshot: marketSnapshotRaw ?? null,
      timestamp: canonical?.timestamp ?? null,
      raw: canonical,
    })
  } catch (error) {
    console.error('Dev execute error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
