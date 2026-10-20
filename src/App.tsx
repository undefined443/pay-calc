import { useState } from 'react'
import { CityContributions } from './CityContributions'
import { CITIES, calculateContributions, INITIAL_CITY_SETTINGS } from './cities'
import { BRACKETS, calculateTax, money } from './tax'
import './App.css'

const INITIAL = {
  salary: '43000',
  months: '18',
  annual: '774000',
  bonus: '86000',
  contributions: '78334.20',
  additional: '18000',
  additionalOther: '0',
  other: '0',
}
const format = (value: number) =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const percent = (value: number) => `${(value * 100).toFixed(2)}%`

/** Render the salary calculator and its auditable annual tax breakdown. */
function App() {
  const [values, setValues] = useState(INITIAL)
  const [mode, setMode] = useState('monthly')
  const [separate, setSeparate] = useState(true)
  const [cityId, setCityId] = useState('manual')
  const [citySettings, setCitySettings] = useState(INITIAL_CITY_SETTINGS)
  const [rentEnabled, setRentEnabled] = useState(false)
  const [rentMonths, setRentMonths] = useState('12')
  const city = CITIES.find((item) => item.id === cityId)
  const activeValues = Object.entries(values)
    .filter(
      ([key]) =>
        (key !== 'contributions' || !city) &&
        (key !== 'additional' || !rentEnabled) &&
        (key !== 'additionalOther' || rentEnabled) &&
        (key !== 'annual' || mode === 'annual') &&
        ((key !== 'salary' && key !== 'months') || mode === 'monthly'),
    )
    .map(([, value]) => value)
  const fields = [
    ...activeValues,
    ...(city ? [citySettings.wage || '0', citySettings.fundWage || '0'] : []),
    ...(rentEnabled ? [rentMonths] : []),
  ]
  const numbersValid = fields.every(
    (value) =>
      value.trim() !== '' &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= 1e10,
  )
  const gross = money(
    mode === 'monthly' ? Number(values.salary) * Number(values.months) : Number(values.annual),
  )
  const referenceWage =
    mode === 'monthly' ? Number(values.salary) : Math.max(0, gross - Number(values.bonus)) / 12
  const cityEstimate = city
    ? calculateContributions(
        city,
        Number(citySettings.wage || referenceWage),
        Number(citySettings.fundWage || citySettings.wage || referenceWage),
        citySettings,
      )
    : null
  const input = {
    gross,
    bonus: Number(values.bonus),
    contributions: cityEstimate ? cityEstimate.annual : Number(values.contributions),
    additional: rentEnabled
      ? money(Number(values.additionalOther) + Number(rentMonths) * 1500)
      : Number(values.additional),
    other: Number(values.other),
  }
  const error = !numbersValid
    ? '请完整填写非负数值，单项数值不超过 100 亿。'
    : rentEnabled && (!Number.isInteger(Number(rentMonths)) || Number(rentMonths) > 12)
      ? '住房租金扣除月数应为 0—12 的整数。'
      : mode === 'monthly' && Number(values.months) > 100
        ? '发薪月数不能超过 100。'
        : input.bonus > gross
          ? '年终奖已包含在年度总收入中，不能大于总收入。'
          : input.contributions > gross
            ? '个人五险一金不能超过年度总收入。'
            : ''
  const result = error ? null : calculateTax(input, separate)
  const alternative = error ? null : calculateTax(input, !separate)

  function field(key: keyof typeof INITIAL, label: string, hint?: string) {
    return (
      <label className="field">
        <span>{label}</span>
        <div className="input-wrap">
          <input
            type="number"
            min="0"
            step="any"
            value={values[key]}
            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
          />
          <span>{key === 'months' ? '个月' : '元'}</span>
        </div>
        {hint && <small>{hint}</small>}
      </label>
    )
  }

  return (
    <main>
      <header>
        <a className="brand" href="/">
          PayCalc<span>薪资计算器</span>
        </a>
        <span className="badge">2026 年度 · 中国大陆居民个人</span>
      </header>
      <section className="intro">
        <p className="eyebrow">KNOW YOUR TAKE-HOME PAY</p>
        <h1>每一笔收入，都算明白。</h1>
        <p>从税前薪资到实际到手，展开你的年度收入与扣税明细。</p>
      </section>
      <div className="layout">
        <section className="panel inputs">
          <h2>收入与扣除</h2>
          <fieldset className="tabs" aria-label="收入输入方式">
            <button
              type="button"
              aria-pressed={mode === 'monthly'}
              onClick={() => setMode('monthly')}
            >
              按月薪填写
            </button>
            <button
              type="button"
              aria-pressed={mode === 'annual'}
              onClick={() => setMode('annual')}
            >
              按年薪填写
            </button>
          </fieldset>
          {mode === 'monthly' ? (
            <div className="field-grid">
              {field('salary', '税前月薪')}
              {field('months', '全年发薪月数', '包含绩效、加班费和年终奖折算月数')}
            </div>
          ) : (
            field('annual', '税前年度总收入', '包含全年工资、绩效、加班费与年终奖')
          )}
          <div className="gross-line">
            <span>税前年度总收入</span>
            <strong>{Number.isFinite(gross) ? format(gross) : '—'} 元</strong>
          </div>
          {field(
            'bonus',
            '其中：全年一次性奖金',
            '已包含在总收入中，不会重复加算；仅符合政策条件的奖金可单独计税。',
          )}
          <label className="field">
            <span>年终奖计税方式</span>
            <select
              value={separate ? 'separate' : 'combined'}
              onChange={(event) => setSeparate(event.target.value === 'separate')}
            >
              <option value="separate">单独计税</option>
              <option value="combined">并入综合所得</option>
            </select>
          </label>
          <hr />
          <h3>年度税前扣除</h3>
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
          {field(
            rentEnabled ? 'additionalOther' : 'additional',
            rentEnabled ? '其他专项附加扣除（不含住房租金）' : '专项附加扣除',
            rentEnabled
              ? '租金由下方单独计算，此处仅填子女教育、赡养老人等其他项目，避免重复扣除。'
              : '填写全年合规合计，例如住房租金、子女教育、赡养老人等。',
          )}
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={rentEnabled}
              onChange={(event) => {
                setRentEnabled(event.target.checked)
              }}
            />
            按住房租金 + 其他项目分项填写（保留原合计，切回时恢复）
          </label>
          {rentEnabled && (
            <label className="field">
              <span>住房租金扣除月数</span>
              <input
                type="number"
                min="0"
                max="12"
                step="1"
                value={rentMonths}
                onChange={(event) => setRentMonths(event.target.value)}
              />
              <small>
                五个城市均适用 1,500
                元/月；须满足主要工作城市无自有住房等条件，同一年度不能与配偶分别享受房贷利息和住房租金扣除。
              </small>
            </label>
          )}
          {rentEnabled && (
            <p className="note">
              住房租金 {format(Number(rentMonths) * 1500)} 元 + 其他{' '}
              {format(Number(values.additionalOther))} 元 = 专项附加扣除合计{' '}
              {format(input.additional)} 元。
            </p>
          )}
          {field(
            'other',
            '其他依法扣除',
            '只影响应纳税所得额，不作为工资代扣支出从到手收入再次扣减。',
          )}
          <p className="note">
            基本减除费用 60,000 元 / 年，已自动计入。社保、公积金因地区和年度而异，请使用实际金额。
          </p>
        </section>
        <div className="results" aria-live="polite">
          {error ? (
            <section className="panel error" role="alert">
              {error}
            </section>
          ) : (
            result &&
            alternative && (
              <>
                <section className="hero-result">
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
                    月均为年度到手 ÷ 12，实际各月工资受发放安排和累计预扣影响。
                  </p>
                </section>
                <section className="panel">
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
                </section>
                <section className="panel calculation">
                  <h2>计算过程</h2>
                  <h3>
                    <span className="step">01</span> 综合所得
                  </h3>
                  <p>
                    年度总收入{separate ? ' − 单独计税年终奖' : '（包含年终奖）'} ={' '}
                    <b>{format(result.comprehensive)} 元</b>
                  </p>
                  <p className="formula">
                    max(0, {format(result.comprehensive)} − 60,000.00 −{' '}
                    {format(input.contributions)} − {format(input.additional)} −{' '}
                    {format(input.other)}) = {format(result.taxable)}
                  </p>
                  <p>
                    适用税率 <b>{percent(result.regular.rate)}</b>，速算扣除数{' '}
                    {format(result.regular.deduction)} 元
                  </p>
                  <p className="formula">
                    {format(result.taxable)} × {percent(result.regular.rate)} −{' '}
                    {format(result.regular.deduction)} = <b>{format(result.regular.tax)} 元</b>
                  </p>
                  <h3>
                    <span className="step">02</span> 全年一次性奖金
                  </h3>
                  {separate ? (
                    <>
                      <p>
                        {format(input.bonus)} ÷ 12 = {format(input.bonus / 12)}{' '}
                        元，按月换算税率表确定档位。
                      </p>
                      <p className="formula">
                        {format(input.bonus)} × {percent(result.bonus.rate)} −{' '}
                        {format(result.bonus.deduction)} = <b>{format(result.bonus.tax)} 元</b>
                      </p>
                    </>
                  ) : (
                    <p>已并入综合所得，不再重复计算奖金税。</p>
                  )}
                  <h3>
                    <span className="step">03</span> 全年税额与有效税率
                  </h3>
                  <p className="formula">
                    {format(result.regular.tax)} + {format(result.bonus.tax)} ={' '}
                    {format(result.totalTax)} 元
                  </p>
                  <p>
                    {format(result.totalTax)} ÷ {format(gross)}
                    {gross === 0 ? '（收入为零时显示 0）' : ''} = <b>{percent(result.effective)}</b>
                  </p>
                </section>
                <section className="panel comparison">
                  <h2>换一种奖金计税方式</h2>
                  <p>
                    {separate ? '并入综合所得' : '单独计税'}时，全年个税为{' '}
                    <b>{format(alternative.totalTax)} 元</b>。
                  </p>
                  <p>
                    {Math.abs(result.totalTax - alternative.totalTax) < 0.005
                      ? '两种方式税额相同。'
                      : result.totalTax < alternative.totalTax
                        ? `当前方式少缴 ${format(alternative.totalTax - result.totalTax)} 元。`
                        : `切换后可少缴 ${format(result.totalTax - alternative.totalTax)} 元。`}
                  </p>
                  <button type="button" onClick={() => setSeparate(!separate)}>
                    切换为{separate ? '合并' : '单独'}计税
                  </button>
                </section>
              </>
            )
          )}
        </div>
      </div>
      <section className="panel policy">
        <h2>规则与适用范围</h2>
        <p>
          本工具估算 2026
          年度居民个人全年工资薪金与一次性奖金税负，不计算逐月预扣、其他类型所得、税收减免或退补税。扣除不足时应纳税所得额按零计算；单独计税奖金不能抵用综合所得剩余扣除。公积金个人缴费已从现金到手中扣除，但仍属于个人公积金账户资产。所有计算在本地浏览器完成。
        </p>
        <details>
          <summary>查看综合所得税率表</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>年度应纳税所得额上限</th>
                  <th>税率</th>
                  <th>速算扣除数</th>
                </tr>
              </thead>
              <tbody>
                {BRACKETS.map((row) => (
                  <tr key={row.limit}>
                    <td>{row.limit === Infinity ? '超过 960,000' : format(row.limit)}</td>
                    <td>{percent(row.rate)}</td>
                    <td>{format(row.deduction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            奖金单独计税：以上年度档位上限与速算扣除数分别除以
            12；奖金总额乘适用税率，再减一次速算扣除数。
          </p>
        </details>
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
      </section>
      <footer>PayCalc · 看清收入，也看懂税。</footer>
    </main>
  )
}

export default App
