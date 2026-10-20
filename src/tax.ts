/** Annual resident salary tax calculations, expressed in CNY. */
export const BRACKETS = [
  { limit: 36000, rate: 0.03, deduction: 0 },
  { limit: 144000, rate: 0.1, deduction: 2520 },
  { limit: 300000, rate: 0.2, deduction: 16920 },
  { limit: 420000, rate: 0.25, deduction: 31920 },
  { limit: 660000, rate: 0.3, deduction: 52920 },
  { limit: 960000, rate: 0.35, deduction: 85920 },
  { limit: Infinity, rate: 0.45, deduction: 181920 },
]

export interface TaxInput {
  gross: number
  bonus: number
  contributions: number
  additional: number
  other: number
}

/** Round monetary results to the nearest cent. */
export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Apply annual brackets, or their monthly conversion for a bonus. */
export function taxFor(amount: number, bonus = false) {
  // biome-ignore lint/style/noNonNullAssertion: The final bracket covers every finite nonnegative input.
  const bracket = BRACKETS.find((row) => amount <= row.limit)!
  const deduction = bonus ? bracket.deduction / 12 : bracket.deduction
  return {
    rate: bracket.rate,
    deduction,
    tax: money(Math.max(0, amount * bracket.rate - deduction)),
  }
}

/** Break annual taxable income into marginal tax brackets. */
export function calculateBracketBreakdown(amount: number) {
  let lower = 0
  const rows = BRACKETS.flatMap((bracket) => {
    const start = lower
    const upper = Math.min(amount, bracket.limit)
    const income = money(Math.max(0, upper - lower))
    lower = bracket.limit
    return income > 0
      ? [
          {
            lower: start,
            upper: bracket.limit,
            rate: bracket.rate,
            income,
            tax: money(income * bracket.rate),
          },
        ]
      : []
  })
  const lastRow = rows.at(-1)
  if (lastRow) {
    const rowTax = money(rows.reduce((total, row) => total + row.tax, 0))
    lastRow.tax = money(lastRow.tax + taxFor(amount).tax - rowTax)
  }
  return rows
}

/** Calculate either bonus treatment without changing the total gross income. */
export function calculateTax(input: TaxInput, separate: boolean) {
  const comprehensive = money(input.gross - (separate ? input.bonus : 0))
  const taxable = money(
    Math.max(0, comprehensive - 60000 - input.contributions - input.additional - input.other),
  )
  const regular = taxFor(taxable)
  // Use annual-equivalent thresholds, but deduct the monthly quick deduction once.
  const bonus = separate ? taxFor(input.bonus, true) : { rate: 0, deduction: 0, tax: 0 }
  const totalTax = money(regular.tax + bonus.tax)
  const net = money(input.gross - input.contributions - totalTax)
  return {
    comprehensive,
    taxable,
    regular,
    bonus,
    totalTax,
    net,
    monthly: money(net / 12),
    effective: input.gross === 0 ? 0 : totalTax / input.gross,
  }
}
