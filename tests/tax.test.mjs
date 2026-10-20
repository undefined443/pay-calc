/** Verify annual settlement examples and discontinuities in bonus tax. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BRACKETS, calculateBracketBreakdown, calculateTax, money, taxFor } from '../src/tax.ts'

const example = { gross: 774000, bonus: 86000, contributions: 78334.2, additional: 18000, other: 0 }

test('reproduces the Tax note with separately taxed bonus', () => {
  const result = calculateTax(example, true)
  assert.equal(result.taxable, 531665.8)
  assert.equal(result.regular.tax, 106579.74)
  assert.equal(result.bonus.tax, 8390)
  assert.equal(result.totalTax, 114969.74)
  assert.equal(result.net, 580696.06)
  assert.equal(result.monthly, 48391.34)
})
test('merging the bonus preserves gross income and avoids double taxation', () => {
  const result = calculateTax(example, false)
  assert.equal(result.comprehensive, example.gross)
  assert.equal(result.totalTax, 132379.74)
  assert.equal(result.bonus.tax, 0)
  assert.equal(result.net, 563286.06)
})

test('bracket breakdown reports marginal income and tax that sum to annual tax', () => {
  const rows = calculateBracketBreakdown(531665.8)
  assert.deepEqual(
    rows.map(({ rate, income, tax }) => ({ rate, income, tax })),
    [
      { rate: 0.03, income: 36000, tax: 1080 },
      { rate: 0.1, income: 108000, tax: 10800 },
      { rate: 0.2, income: 156000, tax: 31200 },
      { rate: 0.25, income: 120000, tax: 30000 },
      { rate: 0.3, income: 111665.8, tax: 33499.74 },
    ],
  )
  assert.equal(money(rows.reduce((total, row) => total + row.tax, 0)), taxFor(531665.8).tax)
  assert.deepEqual(calculateBracketBreakdown(0), [])
})
test('all annual brackets are continuous at their boundaries', () => {
  for (const row of BRACKETS.slice(0, -1)) {
    assert.equal(taxFor(row.limit).rate, row.rate)
    assert.ok(Math.abs(taxFor(row.limit + 0.01).tax - taxFor(row.limit).tax) <= 0.011)
  }
})
test('bonus thresholds retain the statutory tax cliff', () => {
  assert.equal(taxFor(36000, true).tax, 1080)
  assert.equal(taxFor(36000.01, true).tax, 3390)
  assert.equal(taxFor(144000, true).tax, 14190)
  assert.equal(taxFor(144000.01, true).tax, 27390)
})
test('unused deductions cannot offset a separately taxed bonus', () => {
  const result = calculateTax(
    { gross: 30000, bonus: 30000, contributions: 0, additional: 18000, other: 0 },
    true,
  )
  assert.equal(result.regular.tax, 0)
  assert.equal(result.bonus.tax, 900)
})
test('zero income and deductions exceeding income produce zero income tax', () => {
  const result = calculateTax(
    { gross: 0, bonus: 0, contributions: 0, additional: 18000, other: 0 },
    true,
  )
  assert.equal(result.totalTax, 0)
  assert.equal(result.effective, 0)
  assert.equal(result.net, 0)
})
