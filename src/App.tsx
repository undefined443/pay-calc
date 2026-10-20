import { ChevronDown, Info } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CityContributions } from './CityContributions'
import { CITIES, calculateContributions, INITIAL_CITY_SETTINGS } from './cities'
import { BRACKETS, calculateBracketBreakdown, calculateTax, money } from './tax'
import './App.css'

const INITIAL = {
  salary: '43000',
  months: '16',
  annual: '688000',
  bonus: '86000',
  contributions: '78334.20',
  additionalOther: '0',
  other: '0',
}
const format = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const formatCompact = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const percentCompact = (value: number) => `${formatCompact(value * 100)}%`
const MAX_INPUT_AMOUNT = 1e10

function TaxRateProgress({
  label,
  bracketIndex,
  detail,
  detailPlacement = 'below',
}: {
  label: string
  bracketIndex: number
  detail: string
  detailPlacement?: 'above' | 'below'
}) {
  const currentBracket = bracketIndex >= 0 ? BRACKETS[bracketIndex] : null
  const detailLine = (
    <p className={`tax-rate-progress-detail${detailPlacement === 'above' ? ' is-above' : ''}`}>
      {detail}
    </p>
  )
  return (
    <div
      className="tax-rate-progress"
      role="img"
      aria-label={`${label}: ${currentBracket ? `第 ${bracketIndex + 1} 档，${percent(currentBracket.rate)}` : '未进入税率档'}；${detail}`}
    >
      {detailPlacement === 'above' && detailLine}
      <div className="tax-rate-progress-heading">
        <span>{label}</span>
        <strong>
          {currentBracket
            ? `第 ${bracketIndex + 1} 档 · ${percent(currentBracket.rate)}`
            : '未进入税率档'}
        </strong>
      </div>
      <div className="tax-rate-progress-track">
        {BRACKETS.map((bracket, index) => (
          <span
            className={[
              'tax-rate-progress-segment',
              index < bracketIndex ? 'is-passed' : '',
              index === bracketIndex ? 'is-current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={bracket.rate}
          />
        ))}
      </div>
      <div className="tax-rate-progress-labels" aria-hidden="true">
        {BRACKETS.map((bracket) => (
          <span key={bracket.rate}>{percentCompact(bracket.rate)}</span>
        ))}
      </div>
      {detailPlacement === 'below' && detailLine}
    </div>
  )
}

/** Render the salary calculator and its auditable annual tax breakdown. */
function App() {
  const [values, setValues] = useState(INITIAL)
  const [mode, setMode] = useState('monthly')
  const [separate, setSeparate] = useState(true)
  const [cityId, setCityId] = useState('shanghai')
  const [citySettings, setCitySettings] = useState(INITIAL_CITY_SETTINGS)
  const [rentMonths, setRentMonths] = useState('12')
  const city = CITIES.find((item) => item.id === cityId)
  const activeValues = Object.entries(values)
    .filter(
      ([key]) =>
        (key !== 'contributions' || !city) &&
        (key !== 'annual' || mode === 'annual') &&
        ((key !== 'salary' && key !== 'months') || mode === 'monthly'),
    )
    .map(([, value]) => value)
  const fields = [
    ...activeValues,
    ...(city ? [citySettings.wage || '0'] : []),
    ...(city ? Object.values(citySettings.baseOverrides) : []),
    ...(city ? Object.values(citySettings.rateOverrides) : []),
    rentMonths,
  ]
  const numbersValid = fields.every(
    (value) =>
      value.trim() !== '' &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= 1e10,
  )
  const gross = money(
    (mode === 'monthly' ? Number(values.salary) * Number(values.months) : Number(values.annual)) +
      Number(values.bonus),
  )
  const referenceWage = mode === 'monthly' ? Number(values.salary) : Number(values.annual) / 12
  const cityEstimate = city
    ? calculateContributions(
        city,
        Number(citySettings.wage || referenceWage),
        Number(citySettings.wage || referenceWage),
        citySettings,
      )
    : null
  const cityOverridesValid =
    !city ||
    !cityEstimate?.rows.some((row) => {
      const key = `${city.id}:${row.name}`
      const base = citySettings.baseOverrides[key]
      const rate = citySettings.rateOverrides[key]
      return (
        (base !== undefined && (Number(base) < row.baseMin || Number(base) > row.baseMax)) ||
        (rate !== undefined && (Number(rate) < row.rateMin || Number(rate) > row.rateMax))
      )
    })
  const input = {
    gross,
    bonus: Number(values.bonus),
    contributions: cityEstimate ? cityEstimate.annual : Number(values.contributions),
    additional: money(Number(values.additionalOther) + Number(rentMonths) * 1500),
    other: Number(values.other),
  }
  const error = !numbersValid
    ? '请完整填写非负数值，单项数值不超过 100 亿。'
    : !cityOverridesValid
      ? '缴费明细中的基数或比例超出可选范围。'
      : !Number.isInteger(Number(rentMonths)) || Number(rentMonths) > 12
        ? '住房租金扣除月数应为 0—12 的整数。'
        : mode === 'monthly' && Number(values.months) > 100
          ? '发薪月数不能超过 100。'
          : input.contributions > gross
            ? '个人五险一金不能超过年度总收入。'
            : ''
  const result = error ? null : calculateTax(input, separate)
  const alternative = error ? null : calculateTax(input, !separate)
  const bracketRows = result ? calculateBracketBreakdown(result.taxable) : []
  const currentBracketIndex =
    result && result.taxable > 0
      ? BRACKETS.findIndex((bracket) => result.taxable <= bracket.limit)
      : -1
  const bonusBracketIndex =
    input.bonus > 0 ? BRACKETS.findIndex((bracket) => input.bonus <= bracket.limit) : -1

  function field(key: keyof typeof INITIAL, label: string, hint?: string) {
    const minimum =
      key === 'annual'
        ? Math.max(0, Number(values.contributions) - Number(values.bonus))
        : key === 'salary'
          ? Math.max(0, Number(values.contributions) - Number(values.bonus)) /
            Math.max(1, Number(values.months))
          : key === 'months'
            ? Math.ceil(
                Math.max(0, Number(values.contributions) - Number(values.bonus)) /
                  Math.max(1, Number(values.salary)),
              )
            : 0
    const max =
      key === 'annual'
        ? MAX_INPUT_AMOUNT
        : key === 'salary'
          ? MAX_INPUT_AMOUNT / Math.max(1, Number(values.months))
          : key === 'months'
            ? 100
            : key === 'bonus' || key === 'contributions'
              ? gross
              : MAX_INPUT_AMOUNT
    return (
      <div className="field">
        <Label htmlFor={`field-${key}`}>{label}</Label>
        <div className="input-wrap">
          <Input
            id={`field-${key}`}
            type="number"
            min={minimum}
            max={max}
            step="any"
            className="pr-12"
            value={values[key]}
            onChange={(event) => {
              const value = event.target.value
              const number = Number(value)
              if (
                value === '' ||
                (Number.isFinite(number) &&
                  number >= minimum &&
                  number <= max &&
                  (key !== 'months' || Number.isInteger(number)))
              ) {
                setValues({ ...values, [key]: value })
              }
            }}
          />
          <span className="unit">{key === 'months' ? '个月' : '元'}</span>
        </div>
        {hint && <small>{hint}</small>}
      </div>
    )
  }

  return (
    <main>
      <header>
        <a className="brand" href="/">
          PayCalc<span>薪资计算器</span>
        </a>
        <Badge variant="secondary" className="badge">
          2026 年度 · 中国大陆居民个人
        </Badge>
      </header>
      <section className="intro">
        <p className="eyebrow">KNOW YOUR TAKE-HOME PAY</p>
        <h1>每一笔收入，都算明白。</h1>
        <p>从税前薪资到实际到手，展开你的年度收入与扣税明细。</p>
      </section>
      <div className="layout">
        <Card className="panel inputs">
          <h2>收入与扣除</h2>
          <Tabs value={mode} onValueChange={setMode} className="income-tabs">
            <TabsList className="income-tabs-list" aria-label="收入输入方式" data-mode={mode}>
              <TabsTrigger value="monthly">按月薪填写</TabsTrigger>
              <TabsTrigger value="annual">按年薪填写</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === 'monthly' ? (
            <div className="field-grid">
              {field('salary', '税前月薪')}
              {field('months', '全年发薪月数', '发薪月数不含年终奖。')}
            </div>
          ) : (
            field(
              'annual',
              '不含年终奖的税前年度收入',
              '填写全年工资、绩效和加班费等收入；年终奖在下方单独填写并计入总收入。',
            )
          )}
          {field(
            'bonus',
            '全年一次性奖金',
            '单独填写并计入税前年度总收入；仅符合政策条件的奖金可选择单独计税。',
          )}
          <div className="field">
            <fieldset className="bonus-options">
              <legend className="field-label">
                <span>年终奖计税方式</span>
                {result && alternative && (
                  <span className="bonus-comparison">
                    {Math.abs(result.totalTax - alternative.totalTax) < 0.005
                      ? '两种方式税额相同。'
                      : `${(result.totalTax < alternative.totalTax) === separate ? '单独计税' : '并入综合所得'}少缴 ¥ ${formatCompact(Math.abs(result.totalTax - alternative.totalTax))}。`}
                  </span>
                )}
              </legend>
              <label className="bonus-option" htmlFor="bonus-combined">
                <input
                  id="bonus-combined"
                  className="bonus-option-input"
                  type="radio"
                  name="bonus-tax-mode"
                  value="combined"
                  checked={!separate}
                  onChange={() => setSeparate(false)}
                />
                <span className="bonus-option-card">
                  <strong>并入综合所得</strong>
                  <small>与工资合并计税</small>
                  {result && alternative && (
                    <small className="bonus-option-tax">
                      全年个税 ¥ {formatCompact(separate ? alternative.totalTax : result.totalTax)}
                    </small>
                  )}
                </span>
              </label>
              <label className="bonus-option" htmlFor="bonus-separate">
                <input
                  id="bonus-separate"
                  className="bonus-option-input"
                  type="radio"
                  name="bonus-tax-mode"
                  value="separate"
                  checked={separate}
                  onChange={() => setSeparate(true)}
                />
                <span className="bonus-option-card">
                  <strong>单独计税</strong>
                  <small>按奖金税率表计算</small>
                  {result && alternative && (
                    <small className="bonus-option-tax">
                      全年个税 ¥ {formatCompact(separate ? result.totalTax : alternative.totalTax)}
                    </small>
                  )}
                </span>
              </label>
            </fieldset>
          </div>
          <div className="summary-card gross-line">
            <span>税前年度总收入</span>
            <strong>¥ {Number.isFinite(gross) ? format(gross) : '—'} / 年</strong>
          </div>
          <Separator className="section-separator" />
          <h3>五险一金个人缴费</h3>
          <CityContributions
            city={city}
            settings={citySettings}
            referenceWage={referenceWage}
            onSettingsChange={setCitySettings}
            onCityChange={(id) => {
              setCityId(id)
              setCitySettings({
                ...citySettings,
                fundRate: String(
                  Math.min(
                    Number(citySettings.fundRate),
                    CITIES.find((item) => item.id === id)?.fund.maxRate ?? 12,
                  ),
                ),
              })
            }}
          />
          {!city &&
            field(
              'contributions',
              '五险一金个人缴费',
              '填写全年实际缴纳且符合税前扣除标准的个人部分；不含单位部分。',
            )}
          <Separator className="section-separator" />
          <h3>税前扣除</h3>
          <div className="field">
            <div className="field-label-row">
              <Label htmlFor="rent-months">符合条件的住房租赁月数</Label>
              <span className="rent-help-wrap">
                <button
                  type="button"
                  className="rent-help-trigger"
                  aria-label="查看住房租金扣除条件"
                  aria-describedby="rent-conditions-tooltip"
                >
                  <Info aria-hidden="true" />
                </button>
                <span className="rent-tooltip" id="rent-conditions-tooltip" role="tooltip">
                  仅当本人及配偶在主要工作城市均无自有住房，且实际发生租金支出时可扣除。配偶在该城市有房视同本人有房。扣除由租赁合同承租人享受；夫妻主要工作城市相同的只能一方扣除，且同一年度不能同时扣住房贷款利息。
                </span>
              </span>
            </div>
            <div className="input-wrap">
              <Input
                id="rent-months"
                type="number"
                min="0"
                max="12"
                step="1"
                className="pr-12"
                value={rentMonths}
                onChange={(event) => {
                  const value = event.target.value
                  const number = Number(value)
                  if (value === '' || (Number.isInteger(number) && number >= 0 && number <= 12)) {
                    setRentMonths(value)
                  }
                }}
              />
              <span className="unit">个月</span>
            </div>
            <small>每个符合条件的月份按 ¥1,500 扣除。</small>
          </div>
          {field(
            'additionalOther',
            '其他专项附加扣除',
            '填写全年合规合计，例如子女教育、赡养老人等；不含住房租金。',
          )}
          {field(
            'other',
            '其他依法扣除',
            '只影响应纳税所得额，不作为工资代扣支出从到手收入再次扣减。',
          )}
          <p className="note">
            基本减除费用 60,000 元 / 年，已自动计入。社保、公积金因地区和年度而异，请使用实际金额。
          </p>
          <div className="summary-card deduction-total">
            <span>专项附加扣除合计</span>
            <strong>¥ {format(input.additional)} / 年</strong>
          </div>
        </Card>
        <div className="results" aria-live="polite">
          {error ? (
            <Alert variant="destructive" className="panel error">
              {error}
            </Alert>
          ) : (
            result &&
            alternative && (
              <>
                <Card className="hero-result">
                  <p>{city ? `${city.name} · 按当前缴费标准年化估算到手` : '税后年度到手所得'}</p>
                  <div className="net">
                    <span>¥</span>
                    {format(result.net)}
                  </div>
                  <div className="hero-metrics">
                    <div>
                      <span>月均到手</span>
                      <strong>¥ {format(result.monthly)}</strong>
                    </div>
                    <div>
                      <span>整体有效税率</span>
                      <strong>{percent(result.effective)}</strong>
                    </div>
                  </div>
                  <p className="hero-note">
                    {city && '社保、公积金采用当前单月标准 × 12，未按年中调整分段。'}
                    月均到手为年度到手 ÷ 12；实际月度到账会因奖金发放和累计预扣而不同。
                  </p>
                </Card>
                <Card className="panel">
                  <h2>收入去向</h2>
                  <div className="allocation" aria-hidden="true">
                    {gross > 0 && (
                      <>
                        <span style={{ flex: result.net, background: 'var(--green)' }} />
                        <span style={{ flex: input.contributions, background: '#b3c4ba' }} />
                        <span style={{ flex: result.totalTax, background: '#ddae73' }} />
                      </>
                    )}
                  </div>
                  <dl className="breakdown">
                    <div>
                      <dt>税前总收入</dt>
                      <dd>¥ {format(gross)}</dd>
                    </div>
                    <div>
                      <dt>五险一金个人部分</dt>
                      <dd>− ¥ {format(input.contributions)}</dd>
                    </div>
                    <div>
                      <dt>全年个人所得税</dt>
                      <dd>− ¥ {format(result.totalTax)}</dd>
                    </div>
                    <div className="total">
                      <dt>实际到手</dt>
                      <dd>¥ {format(result.net)}</dd>
                    </div>
                  </dl>
                </Card>
                <Card className="panel bracket-panel">
                  <Collapsible className="bracket-collapsible" defaultOpen>
                    <div className="bracket-heading">
                      <h2>阶梯税额明细</h2>
                      <CollapsibleTrigger className="bracket-toggle">
                        <span className="bracket-toggle-show">查看明细</span>
                        <span className="bracket-toggle-hide">收起</span>
                        <ChevronDown aria-hidden="true" />
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="bracket-content">
                      <div className="bracket-sections">
                        <section className="bracket-section bracket-income-section">
                          <div className="bracket-section-title">
                            <h3>综合所得</h3>
                            <p className="bracket-section-description">
                              按年度应纳税所得额确定适用税率档位。
                            </p>
                          </div>
                          <TaxRateProgress
                            label="适用税率"
                            bracketIndex={currentBracketIndex}
                            detail={`应纳税所得额 ¥ ${formatCompact(result.taxable)}`}
                          />
                          {bracketRows.length > 0 ? (
                            <div className="bracket-table">
                              <div className="bracket-row bracket-header">
                                <span>税率档</span>
                                <span>本档所得额</span>
                                <span>本档税额</span>
                              </div>
                              {bracketRows.map((row) => (
                                <div className="bracket-row" key={row.rate}>
                                  <span>
                                    <strong className="bracket-rate">
                                      {percentCompact(row.rate)}
                                    </strong>
                                    <small>
                                      {row.lower === 0
                                        ? `[0, ¥${formatCompact(row.upper)}]`
                                        : Number.isFinite(row.upper)
                                          ? `(¥${formatCompact(row.lower)}, ¥${formatCompact(row.upper)}]`
                                          : `(¥${formatCompact(row.lower)}, +∞)`}
                                    </small>
                                  </span>
                                  <span>¥ {formatCompact(row.income)}</span>
                                  <strong>¥ {formatCompact(row.tax)}</strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="bracket-empty">
                              应纳税所得额为 0，当前没有进入税率档位。
                            </p>
                          )}
                          <div className="bracket-section-total">
                            <span>综合所得税额</span>
                            <strong>¥ {formatCompact(result.regular.tax)}</strong>
                          </div>
                        </section>
                        {separate && (
                          <section className="bracket-section bracket-bonus-section">
                            <div className="bracket-section-title">
                              <h3>年终奖</h3>
                              <p className="bracket-section-description">
                                按奖金 ÷ 12 确定税率档位，再用该档税率计算整笔奖金。
                              </p>
                            </div>
                            {input.bonus > 0 ? (
                              <TaxRateProgress
                                label="适用税率"
                                bracketIndex={bonusBracketIndex}
                                detail={`奖金 ¥ ${formatCompact(input.bonus)} ÷ 12 = ¥ ${formatCompact(input.bonus / 12)} / 月`}
                                detailPlacement="above"
                              />
                            ) : (
                              <p className="bracket-empty">填写年终奖金额后显示对应税率档位。</p>
                            )}
                            <div className="bracket-bonus">
                              <div>
                                <strong>年终奖税额</strong>
                                <small>
                                  {formatCompact(input.bonus)} × {percentCompact(result.bonus.rate)}{' '}
                                  − ({formatCompact(BRACKETS[bonusBracketIndex]?.deduction ?? 0)} ÷
                                  12)
                                </small>
                              </div>
                              <strong className="bracket-bonus-amount">
                                ¥ {formatCompact(result.bonus.tax)}
                              </strong>
                            </div>
                          </section>
                        )}
                      </div>
                      <div className="bracket-total">
                        <span>全年个人所得税</span>
                        <strong className="bracket-total-amount">
                          ¥ {formatCompact(result.totalTax)}
                        </strong>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </>
            )
          )}
        </div>
      </div>
      <Card className="panel policy">
        <h2>规则与适用范围</h2>
        <p>
          本工具估算 2026
          年度居民个人全年工资薪金与一次性奖金税负，不计算逐月预扣、其他类型所得、税收减免或退补税。扣除不足时应纳税所得额按零计算；单独计税奖金不能抵用综合所得剩余扣除。公积金个人缴费已从现金到手中扣除，但仍属于个人公积金账户资产。
        </p>
        <p className="sources">
          政策来源：
          <a
            href="https://www.chinatax.gov.cn/n810219/n810744/n3752930/n3752974/c3970366/content.html"
            target="_blank"
            rel="noreferrer"
          >
            个人所得税法
          </a>
          <a
            href="https://tianjin.chinatax.gov.cn/11200000000/0300/030004/03000418/20230829143229845.shtml"
            target="_blank"
            rel="noreferrer"
          >
            2023 年第 30 号公告
          </a>{' '}
          · 奖金单独计税政策执行至 2027-12-31
        </p>
      </Card>
      <footer>PayCalc · 看清收入，也看懂税。</footer>
    </main>
  )
}

export default App
