import test from 'node:test'
import assert from 'node:assert/strict'
import { computeScore } from './score.ts'

test('computeScore applies V1 formula and clamps', () => {
  const result = computeScore({
    ror: 1,
    pop: 1,
    ivVsRv: 1,
    liquidity: 1,
    eventPenalty: 0.5,
    regimeBonus: 0.3,
  })

  assert.ok(Math.abs(result.raw - 0.95) < 1e-9)
  assert.equal(result.eventPenalty, 0.25)
  assert.equal(result.regimeBonus, 0.1)
  assert.ok(Math.abs(result.total - 0.8) < 1e-9)
  assert.equal(result.display, 80)
})
