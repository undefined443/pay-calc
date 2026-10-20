/** Verify branch-specific caps and employee-only contribution estimates. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CITIES, calculateContributions, INITIAL_CITY_SETTINGS } from '../src/cities.ts'
import { calculateTax } from '../src/tax.ts'

const city = (id) => CITIES.find((item) => item.id === id)
const estimate = (id, wage, settings = {}, fundWage = wage) =>
  calculateContributions(city(id), wage, fundWage, { ...INITIAL_CITY_SETTINGS, ...settings })

test('Beijing caps each branch, includes the fixed medical fee and rounds fund to yuan', () => {
  const result = estimate('beijing', 43000)
  assert.deepEqual(
    result.rows.map((row) => row.amount),
    [2907.84, 729.96, 181.74, 2544],
  )
  assert.equal(result.monthly, 6363.54)
  assert.equal(result.annual, 76362.48)
})
test('Shanghai supplements are optional and remain separate personal contributions', () => {
  const base = estimate('shanghai', 43000)
  assert.equal(base.rows[3].amount, 2641)
  const extra = estimate('shanghai', 43000, { supplement: '5' })
  assert.equal(extra.monthly - base.monthly, 1887)
  assert.equal(extra.rows.length, 5)
})
test('Shenzhen medical tier changes only the medical row', () => {
  const first = estimate('shenzhen', 43000)
  const second = estimate('shenzhen', 43000, { medicalTier: '2' })
  assert.equal(first.rows[1].base, 33633)
  assert.equal(first.rows[1].amount, 672.66)
  assert.equal(second.rows[1].amount, 168.17)
  for (const index of [0, 2, 3]) assert.deepEqual(first.rows[index], second.rows[index])
})
test('Shenzhen new employee floor is distinct from the existing employee floor', () => {
  assert.equal(estimate('shenzhen', 2000).rows[3].base, 2520)
  assert.equal(estimate('shenzhen', 2000, { newEmployee: true }).rows[3].base, 2700)
})
test('Guangzhou has independent pension, medical, unemployment and fund caps', () => {
  const result = estimate('guangzhou', 50000)
  assert.deepEqual(
    result.rows.map((row) => row.base),
    [27603, 31170, 42933, 41697],
  )
  assert.equal(result.rows[2].rate, 0.2)
})
test('Hangzhou uses the urban fund floor and a separate fund ceiling', () => {
  assert.deepEqual(
    estimate('hangzhou', 2000).rows.map((row) => row.base),
    [5122, 5122, 5122, 2660],
  )
  assert.equal(estimate('hangzhou', 50000).rows[3].base, 42151)
})
test('reported fund wages are independent of social insurance wages', () => {
  const result = estimate('beijing', 10000, {}, 20000)
  assert.equal(result.rows[0].base, 10000)
  assert.equal(result.rows[3].base, 20000)
  assert.equal(result.rows[3].amount, 1400)
})
test('switching cities affects annual tax and net income without changing gross income', () => {
  const input = { gross: 774000, bonus: 86000, additional: 18000, other: 0 }
  const results = CITIES.map((item) =>
    calculateTax({ ...input, contributions: estimate(item.id, 43000).annual }, true),
  )
  assert.ok(new Set(results.map((result) => result.net)).size > 1)
  for (const result of results) assert.ok(Number.isFinite(result.totalTax))
})
