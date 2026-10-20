/** Controls and evidence for city-specific employee contribution estimates. */
import { CITIES, type CityPolicy, type CitySettings, calculateContributions } from './cities'

const format = (amount: number) =>
  amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  city: CityPolicy | undefined
  settings: CitySettings
  referenceWage: number
  onCityChange: (id: string) => void
  onSettingsChange: (settings: CitySettings) => void
}

/** Keep automatic estimates explicit and preserve the separate manual contribution mode. */
export function CityContributions({
  city,
  settings,
  referenceWage,
  onCityChange,
  onSettingsChange,
}: Props) {
  const estimate = city
    ? calculateContributions(
        city,
        Number(settings.wage || referenceWage),
        Number(settings.fundWage || settings.wage || referenceWage),
        settings,
      )
    : null
  return (
    <section className="city-controls" aria-label="城市缴费设置">
      <label className="field">
        <span>缴费城市</span>
        <select value={city?.id ?? 'manual'} onChange={(event) => onCityChange(event.target.value)}>
          <option value="manual">手填实际年度缴费</option>
          {CITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <small>个税税率全国统一，城市影响五险一金。适用于普通企业在职职工。</small>
      </label>
      {city && estimate && (
        <>
          <p className="note city-scope">
            规则时点：2026-10-20。按当前单月标准 × 12 估算全年，未按年中调基分段，不代表 2026
            全年实际缴费。
          </p>
          <div className="field-grid">
            {(['wage', 'fundWage'] as const).map((key) => (
              <label className="field" key={key}>
                <span>{key === 'wage' ? '社保申报参考月工资' : '公积金参考月工资'}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={format(referenceWage)}
                  value={settings[key]}
                  onChange={(event) => onSettingsChange({ ...settings, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="field-hint">
            留空时：社保按月薪（年薪模式为扣除奖金后的收入 ÷
            12）估算，公积金跟随社保参考工资。实际应填单位申报的相应工资，可能包含上年奖金。
          </p>
          <div className="field-grid">
            <label className="field">
              <span>公积金个人比例</span>
              <select
                value={settings.fundRate}
                onChange={(event) =>
                  onSettingsChange({ ...settings, fundRate: event.target.value })
                }
              >
                {Array.from({ length: city.fund.maxRate - 4 }, (_, index) => index + 5).map(
                  (rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ),
                )}
              </select>
            </label>
            {city.id === 'shanghai' && (
              <label className="field">
                <span>补充公积金个人比例</span>
                <select
                  value={settings.supplement}
                  onChange={(event) =>
                    onSettingsChange({ ...settings, supplement: event.target.value })
                  }
                >
                  {[0, 1, 2, 3, 4, 5].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate === 0 ? '不缴纳' : `${rate}%`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {city.id === 'shenzhen' && (
            <>
              <label className="field">
                <span>深圳医保档次</span>
                <select
                  value={settings.medicalTier}
                  onChange={(event) =>
                    onSettingsChange({ ...settings, medicalTier: event.target.value })
                  }
                >
                  <option value="1">一档 · 个人 2%</option>
                  <option value="2">二档 · 个人 0.5%（按单位参保方案）</option>
                </select>
                <small>深户职工应选一档。</small>
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={settings.newEmployee}
                  onChange={(event) =>
                    onSettingsChange({ ...settings, newEmployee: event.target.checked })
                  }
                />
                2026 年 9 月起新参加工作或新调入（公积金下限 2,700 元）
              </label>
            </>
          )}
          <div className="city-total">
            <span>五险一金个人缴费估算</span>
            <strong>¥ {format(estimate.annual)} / 年</strong>
            <small>¥ {format(estimate.monthly)} / 月 · 已联动税后计算</small>
          </div>
          <details className="city-details">
            <summary>查看{city.name}缴费明细与依据</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>实际基数</th>
                    <th>个人比例</th>
                    <th>月缴费</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.rows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{format(row.base)}</td>
                      <td>
                        {row.rate}%{row.fixed > 0 ? ` + ${row.fixed} 元` : ''}
                      </td>
                      <td>{format(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="city-rules">
              {city.rules.map((rule) => (
                <div key={rule.name}>
                  <dt>
                    {rule.name}：{format(rule.min)}—{format(rule.max)} 元
                  </dt>
                  <dd>
                    {rule.period}
                    {rule.reference && <p className="reference-note">待复核：{rule.reference}</p>}
                  </dd>
                </div>
              ))}
              <div>
                <dt>
                  公积金：{format(city.fund.min)}—{format(city.fund.max)} 元
                </dt>
                <dd>
                  {city.fund.period}；个人比例 5%—{city.fund.maxRate}%
                </dd>
              </div>
            </dl>
            {city.notes.map((note) => (
              <p className="field-hint" key={note}>
                {note}
              </p>
            ))}
            <p className="field-hint">
              工伤、生育保险个人不缴费，不计入个人现金扣款。公积金按个人月缴费取整到元，社保按分取整；实际舍入以经办系统为准。
            </p>
            <ul className="city-sources">
              {city.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <p className="reference-note">
            {city.rules.some((rule) => rule.reference) || city.id === 'shenzhen'
              ? '含推算或待复核参数，详情见上方明细。精确核算请切回手填实际年度缴费。'
              : '按规则时点估算；精确核算请使用实际年度缴费。'}
          </p>
        </>
      )}
    </section>
  )
}
